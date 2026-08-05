const crypto = require('crypto')
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV })
const _ = db.command
const INTERNAL_ROLES = ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales']
const ALL_CUSTOMER_ROLES = ['admin', 'boss_qi', 'boss_hu']
const ACTIVE_TASK_STATES = ['queued', 'analyzing', 'generating']
const TASK_STATES = ACTIVE_TASK_STATES.concat(['succeeded', 'failed', 'cancelled'])
const TEST_ENV_ID = 'shengjing-style-test-d3ac90f38b1'
const PROMPT_VERSION = 'style-preview-v1-structure-first'
const MAX_IMAGE_BYTES = 10 * 1024 * 1024

const SAFE_MESSAGES = {
  FEATURE_DISABLED: '该功能暂未开放',
  CUSTOMER_NOT_FOUND: '客户不存在或已失效',
  CUSTOMER_ACCESS_DENIED: '当前账号无权使用该客户',
  INVALID_IMAGE: '图片文件无效',
  IMAGE_TOO_LARGE: '单张图片不能超过 10MB',
  UNSUPPORTED_IMAGE_TYPE: '仅支持 JPEG、PNG 或 WebP 图片',
  TASK_ALREADY_RUNNING: '当前预览仍在处理中',
  DAILY_LIMIT_REACHED: '今日生成次数已达测试环境上限',
  TASK_NOT_FOUND: '生成任务不存在',
  FEEDBACK_SAVE_FAILED: '反馈保存失败，请稍后重试',
  GENERATION_FAILED: '生成失败，请修改图片后重试'
}

function failure(code, message) {
  const error = new Error(message || SAFE_MESSAGES[code] || '操作失败，请稍后再试')
  error.code = code
  return error
}

function safeError(error) {
  const code = error && error.code && SAFE_MESSAGES[error.code] ? error.code : 'GENERATION_FAILED'
  return { error: { code, message: SAFE_MESSAGES[code] } }
}

function enabled() {
  return process.env.STYLE_PREVIEW_TEST_ENV === TEST_ENV_ID &&
    process.env.STYLE_PREVIEW_FEATURE_ENABLED === 'true'
}

function isAllCustomerRole(role) {
  return ALL_CUSTOMER_ROLES.indexOf(String(role || '')) !== -1
}

function customerOwnedBy(actor, customer) {
  if (customer.ownerUserId) return customer.ownerUserId === actor.user._id
  return customer.ownerOpenid === actor.openid
}

async function getActor() {
  const { OPENID } = cloud.getWXContext()
  const result = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  const user = result.data[0]
  if (!user || INTERNAL_ROLES.indexOf(user.role) === -1) throw failure('FEATURE_DISABLED')
  const tenantId = user.tenantId || 'tenant_shengjing_default'
  return { openid: OPENID, user, tenantId, createdBy: user._id || OPENID }
}

async function assertAccess() {
  if (!enabled()) throw failure('FEATURE_DISABLED')
  return getActor()
}

async function assertCustomer(actor, customerId) {
  const id = String(customerId || '').trim()
  if (!id) throw failure('CUSTOMER_NOT_FOUND')
  let customer
  try {
    const result = await db.collection('customers').doc(id).get()
    customer = result.data
  } catch (_) {
    throw failure('CUSTOMER_NOT_FOUND')
  }
  if (!customer || customer.deleted === true) {
    throw failure('CUSTOMER_NOT_FOUND')
  }
  if (customer.tenantId && customer.tenantId !== actor.tenantId) throw failure('CUSTOMER_ACCESS_DENIED')
  if (!isAllCustomerRole(actor.user.role) && !customerOwnedBy(actor, customer)) {
    throw failure('CUSTOMER_ACCESS_DENIED')
  }
  return customer
}

async function assertSession(actor, sessionId) {
  const id = String(sessionId || '').trim()
  let session
  try {
    session = (await db.collection('style_preview_sessions').doc(id).get()).data
  } catch (_) {
    throw failure('TASK_NOT_FOUND')
  }
  if (!session || session.tenantId !== actor.tenantId) throw failure('TASK_NOT_FOUND')
  if (!isAllCustomerRole(actor.user.role) && session.createdBy !== actor.createdBy) throw failure('TASK_NOT_FOUND')
  await assertCustomer(actor, session.customerId)
  return session
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function imageInfo(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw failure('INVALID_IMAGE')
  if (buffer.length > MAX_IMAGE_BYTES) throw failure('IMAGE_TOO_LARGE')
  if (buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
    return { mimeType: 'image/png', width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { mimeType: 'image/webp', width: 0, height: 0 }
  }
  if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', width: 0, height: 0 }
  }
  throw failure('UNSUPPORTED_IMAGE_TYPE')
}

function extension(mimeType) {
  return mimeType === 'image/png' ? 'png' : (mimeType === 'image/webp' ? 'webp' : 'jpg')
}

function storagePath(tenantId, customerId, sessionId, kind, mimeType) {
  return `style-preview/${tenantId}/${customerId}/${sessionId}/${kind}/original.${extension(mimeType || 'image/jpeg')}`
}

async function attachImage(actor, event) {
  const session = await assertSession(actor, event.sessionId)
  const kind = event.kind === 'reference' ? 'reference' : (event.kind === 'source' ? 'source' : '')
  const fileId = String(event.fileId || '').trim()
  if (!kind || !fileId || fileId.indexOf('cloud://') !== 0) throw failure('INVALID_IMAGE')
  const downloaded = await cloud.downloadFile({ fileID: fileId })
  const info = imageInfo(downloaded.fileContent)
  const meta = Object.assign(info, { size: downloaded.fileContent.length, sha256: sha256(downloaded.fileContent) })
  const patch = kind === 'source'
    ? { sourceImageFileId: fileId, sourceImageMeta: meta, updatedAt: db.serverDate() }
    : { referenceImageFileId: fileId, referenceImageMeta: meta, updatedAt: db.serverDate() }
  await db.collection('style_preview_sessions').doc(session._id).update({ data: patch })
  return { sessionId: session._id, kind, meta, expectedCloudPath: storagePath(actor.tenantId, session.customerId, session._id, kind, info.mimeType) }
}

function normalizedNote(note) {
  return String(note || '').replace(/\s+/g, ' ').trim().slice(0, 240)
}

function buildKey(actor, session, roomType, note) {
  return sha256(JSON.stringify([
    actor.tenantId, session.customerId, session.sourceImageMeta.sha256,
    session.referenceImageMeta.sha256, roomType, normalizedNote(note), PROMPT_VERSION
  ]))
}

async function createTask(actor, event, retry) {
  const session = await assertSession(actor, event.sessionId)
  if (!session.sourceImageFileId || !session.referenceImageFileId || !session.sourceImageMeta || !session.referenceImageMeta) {
    throw failure('INVALID_IMAGE')
  }
  const roomType = String(event.roomType || session.roomType || '').trim().slice(0, 30)
  if (!roomType) throw failure('GENERATION_FAILED')
  const userNote = normalizedNote(event.userNote === undefined ? session.userNote : event.userNote)
  const baseKey = buildKey(actor, session, roomType, userNote)
  const known = await db.collection('style_preview_tasks').where({ tenantId: actor.tenantId, idempotencyKey: baseKey }).orderBy('createdAt', 'desc').limit(1).get()
  const existing = known.data[0]
  if (existing && ACTIVE_TASK_STATES.indexOf(existing.status) !== -1) return { sessionId: session._id, taskId: existing._id, status: existing.status, reused: true }
  if (existing && existing.status === 'succeeded') return { sessionId: session._id, taskId: existing._id, status: existing.status, reused: true, cached: true }
  if (existing && !retry) throw failure('GENERATION_FAILED')
  const attempts = await db.collection('style_preview_tasks').where({ tenantId: actor.tenantId, sessionId: session._id }).count()
  const latest = await db.collection('style_preview_tasks').where({ tenantId: actor.tenantId, sessionId: session._id }).orderBy('createdAt', 'desc').limit(1).get()
  const latestTask = latest.data[0]
  if (latestTask && ACTIVE_TASK_STATES.indexOf(latestTask.status) !== -1) return { sessionId: session._id, taskId: latestTask._id, status: latestTask.status, reused: true }
  if (latestTask && latestTask.status === 'succeeded') return { sessionId: session._id, taskId: latestTask._id, status: latestTask.status, reused: true, cached: true }
  if (attempts.total >= 3) throw failure('GENERATION_FAILED')
  const key = existing && retry ? `${baseKey}:retry:${attempts.total + 1}` : baseKey
  const dailyLimit = Number(process.env.STYLE_PREVIEW_USER_DAILY_LIMIT || 5)
  const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
  const today = await db.collection('style_preview_tasks').where({ tenantId: actor.tenantId, createdBy: actor.createdBy, createdAt: _.gte(dayStart) }).count()
  if (today.total >= dailyLimit) throw failure('DAILY_LIMIT_REACHED')
  const tenantDailyLimit = Number(process.env.STYLE_PREVIEW_TENANT_DAILY_LIMIT || 20)
  const tenantToday = await db.collection('style_preview_tasks').where({ tenantId: actor.tenantId, createdAt: _.gte(dayStart) }).count()
  if (tenantToday.total >= tenantDailyLimit) throw failure('DAILY_LIMIT_REACHED')
  const now = db.serverDate()
  const task = {
    tenantId: actor.tenantId, sessionId: session._id, customerId: session.customerId, createdBy: actor.createdBy,
    status: 'queued', attemptNo: attempts.total + 1, idempotencyKey: key, provider: process.env.STYLE_PREVIEW_PROVIDER || 'mock',
    providerTaskId: '', promptVersion: PROMPT_VERSION, inputSummary: { roomType, userNote }, resultImageFileId: '',
    safeErrorCode: '', safeErrorMessage: '', queuedAt: now, startedAt: null, finishedAt: null, createdAt: now, updatedAt: now
  }
  let result
  try {
    result = await db.collection('style_preview_tasks').add({ data: task })
  } catch (error) {
    const duplicate = await db.collection('style_preview_tasks').where({ tenantId: actor.tenantId, idempotencyKey: key }).limit(1).get()
    if (duplicate.data[0]) return { sessionId: session._id, taskId: duplicate.data[0]._id, status: duplicate.data[0].status, reused: true }
    throw error
  }
  await db.collection('style_preview_sessions').doc(session._id).update({ data: { roomType, userNote, status: 'queued', latestTaskId: result._id, updatedAt: now } })
  return { sessionId: session._id, taskId: result._id, status: 'queued' }
}

async function taskView(actor, taskId) {
  const task = (await db.collection('style_preview_tasks').doc(String(taskId || '')).get()).data
  if (!task || task.tenantId !== actor.tenantId || (!isAllCustomerRole(actor.user.role) && task.createdBy !== actor.createdBy)) throw failure('TASK_NOT_FOUND')
  return { task: { _id: task._id, sessionId: task.sessionId, status: task.status, attemptNo: task.attemptNo, safeErrorCode: task.safeErrorCode, safeErrorMessage: task.safeErrorMessage, createdAt: task.createdAt, finishedAt: task.finishedAt } }
}

async function sessionView(actor, sessionId) {
  const session = await assertSession(actor, sessionId)
  const fileList = [session.sourceImageFileId, session.referenceImageFileId, session.resultImageFileId].filter(Boolean)
  const urls = fileList.length ? await cloud.getTempFileURL({ fileList }) : { fileList: [] }
  const map = {}; (urls.fileList || []).forEach((item) => { map[item.fileID] = item.tempFileURL || '' })
  return { session: Object.assign({}, session, { sourceImageUrl: map[session.sourceImageFileId] || '', referenceImageUrl: map[session.referenceImageFileId] || '', resultImageUrl: map[session.resultImageFileId] || '' }) }
}

exports.main = async (event = {}) => {
  try {
    const action = String(event.action || '')
    const actor = await assertAccess()
    if (action === 'checkAccess') return { allowed: true, role: actor.user.role }
    if (action === 'listCustomers') {
      const query = { tenantId: _.in([actor.tenantId, '', null]), deleted: _.neq(true) }
      if (!isAllCustomerRole(actor.user.role)) {
        query.ownerOpenid = actor.openid
      }
      const result = await db.collection('customers').where(query).orderBy('updatedAt', 'desc').limit(100).get()
      let customers = result.data
      if (!isAllCustomerRole(actor.user.role)) {
        const userOwned = await db.collection('customers').where({ tenantId: _.in([actor.tenantId, '', null]), deleted: _.neq(true), ownerUserId: actor.user._id }).limit(100).get()
        const known = new Set(customers.map((item) => item._id))
        customers = customers.concat(userOwned.data.filter((item) => !known.has(item._id)))
      }
      return { items: customers.map((item) => ({ _id: item._id, name: item.name || '未命名客户', address: item.address || '' })) }
    }
    if (action === 'createSession') {
      const customer = await assertCustomer(actor, event.customerId)
      const requestId = String(event.clientRequestId || '').trim().slice(0, 80)
      if (requestId) {
        const existing = await db.collection('style_preview_sessions').where({ tenantId: actor.tenantId, createdBy: actor.createdBy, clientRequestId: requestId }).limit(1).get()
        if (existing.data[0]) return { sessionId: existing.data[0]._id, upload: existing.data[0].upload }
      }
      const sessionId = crypto.randomUUID()
      const now = db.serverDate()
      const upload = { source: storagePath(actor.tenantId, customer._id, sessionId, 'source', 'image/jpeg'), reference: storagePath(actor.tenantId, customer._id, sessionId, 'reference', 'image/jpeg') }
      const data = { tenantId: actor.tenantId, customerId: customer._id, createdBy: actor.createdBy, createdByOpenid: actor.openid, roomType: '', userNote: '', sourceImageFileId: '', referenceImageFileId: '', status: 'draft', latestTaskId: '', styleIntent: null, resultImageFileId: '', feedback: null, upload, clientRequestId: requestId, createdAt: now, updatedAt: now }
      await db.collection('style_preview_sessions').doc(sessionId).set({ data })
      return { sessionId, upload }
    }
    if (action === 'attachUploadedImages') return attachImage(actor, event)
    if (action === 'createTask') return createTask(actor, event, false)
    if (action === 'retryFailedTask') return createTask(actor, event, true)
    if (action === 'getTask') return taskView(actor, event.taskId)
    if (action === 'getSession') return sessionView(actor, event.sessionId)
    if (action === 'listSessions') {
      const query = { tenantId: actor.tenantId }
      if (event.customerId) { await assertCustomer(actor, event.customerId); query.customerId = String(event.customerId) }
      if (!isAllCustomerRole(actor.user.role)) query.createdBy = actor.createdBy
      const result = await db.collection('style_preview_sessions').where(query).orderBy('createdAt', 'desc').limit(100).get()
      return { items: result.data.map((item) => ({ _id: item._id, customerId: item.customerId, roomType: item.roomType, status: item.status, latestTaskId: item.latestTaskId, styleIntent: item.styleIntent, createdAt: item.createdAt, resultImageFileId: item.resultImageFileId })) }
    }
    if (action === 'submitFeedback') {
      const session = await assertSession(actor, event.sessionId)
      const feedback = { rating: Math.max(1, Math.min(5, Number(event.rating || 0))) || null, reason: normalizedNote(event.reason), note: normalizedNote(event.note), createdAt: new Date() }
      try {
        const feedbackSession = Object.assign({}, session, { feedback, updatedAt: db.serverDate() })
        delete feedbackSession._id
        await db.collection('style_preview_sessions').doc(session._id).set({ data: feedbackSession })
      } catch (_) {
        throw failure('FEEDBACK_SAVE_FAILED')
      }
      return { sessionId: session._id, feedback }
    }
    throw failure('GENERATION_FAILED')
  } catch (error) {
    return safeError(error)
  }
}
