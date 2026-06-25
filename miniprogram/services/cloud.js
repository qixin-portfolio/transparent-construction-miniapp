const { DEMO_MODE } = require('../utils/demo')

function call(name, data = {}) {
  return wx.cloud.callFunction({
    name,
    data
  }).then((res) => {
    const result = res.result || {}
    if (result.error) {
      throw new Error(result.error.message || result.error)
    }
    return result
  })
}

function safePathText(text) {
  return String(text || 'unknown')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '-')
    .slice(0, 40)
}

function uploadImage(filePath, projectId, stageCode) {
  if (!projectId) {
    return Promise.reject(new Error('缺少工地 ID，不能上传照片'))
  }

  const suffix = filePath.match(/\.[a-zA-Z0-9]+$/)
  const ext = suffix ? suffix[0] : '.jpg'
  const cloudPath = [
    'stage-photos',
    safePathText(projectId),
    safePathText(stageCode),
    `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`
  ].join('/')

  return wx.cloud.uploadFile({
    cloudPath,
    filePath
  }).then((res) => res.fileID)
}

function showError(title, error) {
  if (error && error.silent) return
  const message = error && error.message ? error.message : String(error || '请稍后再试')
  wx.showToast({
    title: title || message,
    icon: 'none',
    duration: 2400
  })
}

module.exports = {
  DEMO_MODE,
  call,
  uploadImage,
  showError
}
