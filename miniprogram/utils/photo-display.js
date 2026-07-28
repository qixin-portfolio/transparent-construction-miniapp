function toPhotoUrl(photo) {
  if (typeof photo === 'string') return photo.trim()
  if (!photo || typeof photo !== 'object') return ''
  const candidates = [photo.url, photo.tempFileURL, photo.fileID, photo.fileId, photo.cloudFileId]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
  return candidates.find(isDisplayableUrl) || candidates[0] || ''
}

function isDisplayableUrl(url) {
  return !!url && !url.startsWith('cloud://')
}

function getPhotoDisplayUrls(item = {}) {
  const preferredSources = [
    item.photoUrls,
    item.photoTempUrls,
    item.photos
  ]
  const urls = []
  preferredSources.forEach((source) => {
    if (!Array.isArray(source)) return
    source.forEach((photo) => {
      const url = toPhotoUrl(photo)
      if (isDisplayableUrl(url) && urls.indexOf(url) === -1) urls.push(url)
    })
  })
  if (urls.length) return urls

  const fallbackSources = [item.photos, item.photoFileIDs]
  fallbackSources.forEach((source) => {
    if (!Array.isArray(source)) return
    source.forEach((photo) => {
      const url = toPhotoUrl(photo)
      if (url && urls.indexOf(url) === -1) urls.push(url)
    })
  })
  return urls
}

module.exports = {
  getPhotoDisplayUrls,
  toPhotoUrl
}
