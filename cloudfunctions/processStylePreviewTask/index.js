const crypto = require('crypto')
const cloud = require('wx-server-sdk')
const { ProviderError, createSeedream5Provider } = require('./providers/seedream5-provider')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV })
const TEST_ENV_ID = 'shengjing-style-test-d3ac90f38b1'
const DEFAULT_INTENT = {
  styleName: '温润自然现代',
  palette: ['暖白', '浅橡木', '低饱和灰绿'],
  materials: ['暖白墙面', '浅木纹柜体', '哑光金属点缀'],
  furnitureDirection: ['低矮轻量家具', '留出主要动线'],
  lightingDirection: ['保留原始采光方向', '暖白分层照明'],
  summary: '以参考图的温润自然感为方向，优先保留原空间的开口、墙体关系和拍摄视角，仅用于前期风格沟通。',
  styleIntentSource: 'existing_rule_based'
}

function enabled() {
  return process.env.STYLE_PREVIEW_TEST_ENV === TEST_ENV_ID && process.env.STYLE_PREVIEW_FEATURE_ENABLED === 'true'
}

function safeFailure(error) {
  if (error && error.code) {
    const messages = {
      PROVIDER_AUTH_FAILED: '图片生成服务鉴权失败，请联系管理员检查测试配置',
      PROVIDER_MODEL_UNAVAILABLE: '图片生成模型当前不可用，请联系管理员检查测试配置',
      PROVIDER_INVALID_REQUEST: '图片生成请求无效，请修改图片后重试',
      PROVIDER_INPUT_FETCH_FAILED: '图片输入读取失败，请修改图片后重试',
      PROVIDER_REJECTED: '图片生成未通过内容安全校验，请更换测试图片后重试',
      PROVIDER_RATE_LIMITED: '图片生成服务繁忙，请稍后手动重试',
      PROVIDER_UNAVAILABLE: '图片生成服务暂不可用，请稍后手动重试',
      PROVIDER_TIMEOUT: '图片生成超时，请稍后手动重试',
      PROVIDER_RESULT_UNKNOWN: '生成结果状态未知，请勿立即重试并联系管理员核查',
      PROVIDER_EMPTY_RESULT: '图片生成未返回结果，请稍后手动重试',
      PROVIDER_INVALID_RESULT: '图片生成结果无效，请稍后手动重试',
      RESULT_DOWNLOAD_FAILED: '生成结果下载失败，请稍后手动重试',
      RESULT_STORAGE_FAILED: '结果图片保存失败，请稍后手动重试'
    }
    if (messages[error.code]) return { code: error.code, message: messages[error.code] }
  }
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
  return {
    provider: 'mock', modelId: null, providerRequestId: null,
    outputImageBuffer: source.fileContent, outputMimeType: session.sourceImageMeta && session.sourceImageMeta.mimeType || 'image/jpeg',
    outputWidth: null, outputHeight: null,
    usage: { generatedImages: null, outputTokens: null, totalTokens: null }, durationMs: null,
    extension: 'jpg', styleIntent: DEFAULT_INTENT
  }
}

async function generatePreview(session, task) {
  const provider = process.env.STYLE_PREVIEW_PROVIDER || 'mock'
  if (provider === 'mock') return mockProvider(session)
  if (provider !== 'seedream5') throw new ProviderError('PROVIDER_MODEL_UNAVAILABLE')
  if (process.env.STYLE_PREVIEW_REAL_AI_ENABLED !== 'true') throw new ProviderError('PROVIDER_MODEL_UNAVAILABLE')
  const providerAdapter = createSeedream5Provider({ cloud })
  return providerAdapter.generatePreview({
    sourceImageFileId: session.sourceImageFileId,
    referenceImageFileId: session.referenceImageFileId,
    sourceImageMeta: session.sourceImageMeta,
    referenceImageMeta: session.referenceImageMeta,
    roomType: session.roomType,
    userNote: session.userNote,
    styleIntent: session.styleIntent,
    taskId: task._id,
    sessionId: session._id,
    tenantId: task.tenantId,
    customerId: task.customerId,
    onLifecycle: async (state) => db.collection('style_preview_tasks').doc(task._id).update({ data: { providerLifecycle: state, updatedAt: db.serverDate() } })
  })
}

async function processOne() {
  const task = await claimQueuedTask()
  if (!task) return { processed: false }
  try {
    const session = (await db.collection('style_preview_sessions').doc(task.sessionId).get()).data
    if (!session || session._id !== task.sessionId || session.tenantId !== task.tenantId || session.customerId !== task.customerId || !session.sourceImageFileId || !session.referenceImageFileId) throw new Error('invalid task session')
    await db.collection('style_preview_tasks').doc(task._id).update({ data: { status: 'generating', updatedAt: db.serverDate() } })
    const generated = await generatePreview(session, task)
    const cloudPath = `style-preview/${task.tenantId}/${task.customerId}/${session._id}/result/${task._id}.${generated.extension}`
    const uploaded = await cloud.uploadFile({ cloudPath, fileContent: generated.outputImageBuffer })
    const now = db.serverDate()
    await db.collection('style_preview_tasks').doc(task._id).update({ data: {
      status: 'succeeded', provider: generated.provider, providerModelId: generated.modelId,
      providerTaskId: generated.providerRequestId, providerRequestId: generated.providerRequestId,
      providerUsage: generated.usage, providerDurationMs: generated.durationMs,
      outputMimeType: generated.outputMimeType, outputWidth: generated.outputWidth, outputHeight: generated.outputHeight,
      resultImageFileId: uploaded.fileID, finishedAt: now, updatedAt: now
    } })
    const completedSession = Object.assign({}, session, {
      status: 'succeeded', latestTaskId: task._id, styleIntent: generated.styleIntent || DEFAULT_INTENT,
      styleIntentSource: (generated.styleIntent || DEFAULT_INTENT).styleIntentSource || 'existing_rule_based',
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
