const crypto = require('crypto')
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV })
const TEST_ENV_ID = 'shengjing-style-test-d3ac90f38b1'
const DEFAULT_INTENT = {
  styleName: '温润自然现代',
  palette: ['暖白', '浅橡木', '低饱和灰绿'],
  materials: ['暖白墙面', '浅木纹柜体', '哑光金属点缀'],
  furnitureDirection: ['低矮轻量家具', '留出主要动线'],
  lightingDirection: ['保留原始采光方向', '暖白分层照明'],
  summary: '以参考图的温润自然感为方向，优先保留原空间的开口、墙体关系和拍摄视角，仅用于前期风格沟通。'
}

function enabled() {
  return process.env.STYLE_PREVIEW_TEST_ENV === TEST_ENV_ID && process.env.STYLE_PREVIEW_FEATURE_ENABLED === 'true'
}

function safeFailure(error) {
  const message = String(error && error.message || '')
  if (/timeout/i.test(message)) return { code: 'PROVIDER_TIMEOUT', message: '图片生成超时，请稍后重试' }
  if (/storage|upload/i.test(message)) return { code: 'RESULT_STORAGE_FAILED', message: '结果图片保存失败，请稍后重试' }
  return { code: 'GENERATION_FAILED', message: '生成失败，请修改图片后重试' }
}

async function claimQueuedTask() {
  const queued = await db.collection('style_preview_tasks').where({ status: 'queued' }).orderBy('createdAt', 'asc').limit(1).get()
  const candidate = queued.data[0]
  if (!candidate) return null
  let claimed = null
  await db.runTransaction(async (transaction) => {
    const current = await transaction.collection('style_preview_tasks').doc(candidate._id).get()
    if (!current.data || current.data.status !== 'queued') return
    const now = db.serverDate()
    await transaction.collection('style_preview_tasks').doc(candidate._id).update({ data: { status: 'analyzing', workerClaimId: crypto.randomUUID(), startedAt: now, updatedAt: now } })
    claimed = Object.assign({}, current.data, { status: 'analyzing' })
  })
  return claimed
}

async function mockProvider(session) {
  const source = await cloud.downloadFile({ fileID: session.sourceImageFileId })
  if (!source.fileContent || !source.fileContent.length) throw new Error('storage source missing')
  return { provider: 'mock', providerTaskId: `mock-${Date.now()}`, styleIntent: DEFAULT_INTENT, resultBuffer: source.fileContent, extension: 'jpg' }
}

async function generatePreview(session) {
  const provider = process.env.STYLE_PREVIEW_PROVIDER || 'mock'
  if (provider !== 'mock' || process.env.STYLE_PREVIEW_REAL_AI_ENABLED !== 'true') return mockProvider(session)
  // A real adapter is intentionally gated until a provider and its test credentials are approved.
  return mockProvider(session)
}

async function processOne() {
  const task = await claimQueuedTask()
  if (!task) return { processed: false }
  try {
    const session = (await db.collection('style_preview_sessions').doc(task.sessionId).get()).data
    if (!session || session.tenantId !== task.tenantId || !session.sourceImageFileId || !session.referenceImageFileId) throw new Error('invalid task session')
    await db.collection('style_preview_tasks').doc(task._id).update({ data: { status: 'generating', updatedAt: db.serverDate() } })
    const generated = await generatePreview(session)
    const cloudPath = `style-preview/${task.tenantId}/${task.customerId}/${session._id}/result/${task._id}.${generated.extension}`
    const uploaded = await cloud.uploadFile({ cloudPath, fileContent: generated.resultBuffer })
    const now = db.serverDate()
    await db.collection('style_preview_tasks').doc(task._id).update({ data: { status: 'succeeded', provider: generated.provider, providerTaskId: generated.providerTaskId, resultImageFileId: uploaded.fileID, finishedAt: now, updatedAt: now } })
    const completedSession = Object.assign({}, session, {
      status: 'succeeded', latestTaskId: task._id, styleIntent: generated.styleIntent,
      resultImageFileId: uploaded.fileID, updatedAt: db.serverDate()
    })
    delete completedSession._id
    await db.collection('style_preview_sessions').doc(task.sessionId).set({ data: completedSession })
    return { processed: true, taskId: task._id, status: 'succeeded' }
  } catch (error) {
    const safe = safeFailure(error)
    await db.collection('style_preview_tasks').doc(task._id).update({ data: { status: 'failed', safeErrorCode: safe.code, safeErrorMessage: safe.message, finishedAt: db.serverDate(), updatedAt: db.serverDate() } })
    await db.collection('style_preview_sessions').doc(task.sessionId).update({ data: { status: 'failed', updatedAt: db.serverDate() } })
    return { processed: true, taskId: task._id, status: 'failed', code: safe.code }
  }
}

exports.main = async () => {
  const context = cloud.getWXContext()
  if (!enabled() || context.OPENID) return { processed: false, disabled: true }
  return processOne()
}
