const { call } = require('../../../services/cloud')

function requestId() {
  return `spv2-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

function pathWithLocalExtension(cloudPath, filePath) {
  const match = String(filePath || '').match(/\.(jpe?g|png|webp)$/i)
  const extension = match ? match[1].toLowerCase().replace('jpeg', 'jpg') : 'jpg'
  return String(cloudPath || '').replace(/\.jpg$/, `.${extension}`)
}

function adaptSession(session = {}) {
  const intent = session.styleIntent || {}
  return Object.assign({}, session, {
    id: session._id || session.id,
    sourceImage: session.sourceImageUrl || session.sourceImage || '',
    referenceImage: session.referenceImageUrl || session.referenceImage || '',
    previewImage: session.resultImageUrl || session.previewImage || '',
    customerName: session.customerName || '当前客户',
    styleIntent: Object.assign({
      styleName: '风格意向生成中', keywords: [], colorPalette: [], materials: [],
      atmosphere: '', preservationNotes: '以现场复核为准。', designBoundary: '仅用于前期风格沟通。'
    }, intent, {
      colorPaletteText: (intent.palette || intent.colorPalette || []).join(' · '),
      materialsText: (intent.materials || []).join(' · '),
      keywords: intent.palette || intent.keywords || [],
      atmosphere: intent.summary || intent.atmosphere || '',
      preservationNotes: '原照片的空间结构与机位为唯一依据。',
      designBoundary: 'AI 风格预览仅用于前期沟通，不作为施工图、报价或最终设计依据。'
    })
  })
}

async function checkAccess() {
  return call('stylePreviewApi', { action: 'checkAccess' })
}

async function listCustomers() {
  const result = await call('stylePreviewApi', { action: 'listCustomers' })
  return result.items || []
}

async function createPreview(values) {
  const session = await call('stylePreviewApi', { action: 'createSession', customerId: values.customerId, clientRequestId: requestId() })
  const uploads = [
    { kind: 'source', filePath: values.sourceImage, cloudPath: pathWithLocalExtension(session.upload.source, values.sourceImage) },
    { kind: 'reference', filePath: values.referenceImage, cloudPath: pathWithLocalExtension(session.upload.reference, values.referenceImage) }
  ]
  for (const upload of uploads) {
    const stored = await wx.cloud.uploadFile({ cloudPath: upload.cloudPath, filePath: upload.filePath })
    await call('stylePreviewApi', { action: 'attachUploadedImages', sessionId: session.sessionId, kind: upload.kind, fileId: stored.fileID })
  }
  return call('stylePreviewApi', { action: 'createTask', sessionId: session.sessionId, roomType: values.roomType, userNote: values.note })
}

async function getTask(taskId) {
  return (await call('stylePreviewApi', { action: 'getTask', taskId })).task
}

async function getSession(sessionId) {
  return adaptSession((await call('stylePreviewApi', { action: 'getSession', sessionId })).session)
}

async function listSessions(customerId) {
  const result = await call('stylePreviewApi', { action: 'listSessions', customerId })
  return (result.items || []).map(adaptSession)
}

async function saveFeedback(sessionId, note) {
  return call('stylePreviewApi', { action: 'submitFeedback', sessionId, note })
}

async function retry(sessionId) {
  return call('stylePreviewApi', { action: 'retryFailedTask', sessionId })
}

module.exports = { checkAccess, listCustomers, createPreview, getTask, getSession, listSessions, saveFeedback, retry, adaptSession }
