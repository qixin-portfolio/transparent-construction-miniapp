const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'

function tenantMatches(resourceTenantId, tenantId) {
  return resourceTenantId ? resourceTenantId === tenantId : tenantId === DEFAULT_TENANT_ID
}

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  const user = res.data[0] || null
  if (user && !user.tenantId) {
    user.tenantId = DEFAULT_TENANT_ID
    user.tenantName = DEFAULT_TENANT_NAME
  }
  return { openid: OPENID, user }
}

async function listAllWhere(collectionName, where) {
  const items = []
  const batchSize = 100
  let offset = 0
  while (true) {
    const res = await db.collection(collectionName).where(where).skip(offset).limit(batchSize).get()
    const batch = res.data || []
    items.push(...batch)
    if (batch.length < batchSize) break
    offset += batch.length
  }
  return items
}

async function removeWhere(collectionName, where) {
  const res = await db.collection(collectionName).where(where).remove()
  return res.stats && typeof res.stats.removed === 'number' ? res.stats.removed : 0
}

async function listPhotosByStageLogIds(logIds, tenantId) {
  const photos = []
  const tenantValue = tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId
  for (let i = 0; i < logIds.length; i += 20) {
    const chunk = logIds.slice(i, i + 20)
    photos.push(...await listAllWhere('photos', { stageLogId: _.in(chunk), tenantId: tenantValue }))
  }
  return photos
}

async function removePhotosByStageLogIds(logIds, tenantId) {
  let removed = 0
  const tenantValue = tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId
  for (let i = 0; i < logIds.length; i += 20) {
    const chunk = logIds.slice(i, i + 20)
    removed += await removeWhere('photos', { stageLogId: _.in(chunk), tenantId: tenantValue })
  }
  return removed
}

async function deleteFiles(fileIDs) {
  const uniqueIDs = Array.from(new Set((fileIDs || []).filter(Boolean)))
  if (!uniqueIDs.length) return { deleted: 0, cleanupErrors: [] }

  let deleted = 0
  const cleanupErrors = []
  for (let i = 0; i < uniqueIDs.length; i += 50) {
    const chunk = uniqueIDs.slice(i, i + 50)
    try {
      const res = await cloud.deleteFile({ fileList: chunk })
      deleted += (res.fileList || []).filter((item) => item.status === 0).length
      ;(res.fileList || []).filter((item) => item.status !== 0).forEach((item) => {
        cleanupErrors.push({ fileID: item.fileID || '', status: item.status, errMsg: item.errMsg || '' })
      })
    } catch (error) {
      cleanupErrors.push({ fileID: chunk[0] || '', count: chunk.length, errMsg: error.message || '云文件删除失败' })
    }
  }
  return { deleted, cleanupErrors }
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    if (user.role !== 'admin') {
      throw new Error('仅管理员可删除工地资料')
    }

    const projectId = String(event.projectId || event.id || '').trim()
    if (!projectId) throw new Error('缺少工地 ID')

    const projectRes = await db.collection('projects').doc(projectId).get()
    if (!projectRes.data) throw new Error('工地不存在')
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    if (!tenantMatches(projectRes.data.tenantId, tenantId)) {
      throw new Error('无权删除该工地')
    }

    const tenantValue = tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId
    const baseWhere = { projectId, tenantId: tenantValue }
    const [logs, projectPhotos, drawings] = await Promise.all([
      listAllWhere('stage_logs', baseWhere),
      listAllWhere('photos', baseWhere),
      listAllWhere('design_drawings', baseWhere)
    ])
    const logIds = logs.map((log) => log._id).filter(Boolean)
    const photosByLogs = await listPhotosByStageLogIds(logIds, tenantId)
    const photoMap = {}
    projectPhotos.concat(photosByLogs).forEach((photo) => {
      const key = photo._id || photo.fileID || photo.fileId || photo.cloudFileId
      if (key) photoMap[key] = photo
    })
    const photos = Object.keys(photoMap).map((key) => photoMap[key])

    const fileIDs = []
    logs.forEach((log) => {
      ;(log.photoFileIDs || []).forEach((fileID) => fileIDs.push(fileID))
      ;(log.photos || []).forEach((fileID) => fileIDs.push(fileID))
    })
    photos.forEach((photo) => {
      fileIDs.push(photo.fileID || photo.fileId || photo.cloudFileId)
    })
    drawings.forEach((drawing) => {
      fileIDs.push(drawing.fileID)
    })

    const fileCleanup = await deleteFiles(fileIDs)
    const cleanupErrors = fileCleanup.cleanupErrors
    if (cleanupErrors.length) {
      const cleanupError = new Error('部分云文件删除失败，工地资料未删除，请重试')
      cleanupError.cleanupErrors = cleanupErrors
      throw cleanupError
    }

    const removed = {
      cloudFiles: fileCleanup.deleted,
      photos: await removeWhere('photos', baseWhere) + await removePhotosByStageLogIds(logIds, tenantId),
      logs: await removeWhere('stage_logs', baseWhere),
      drawings: await removeWhere('design_drawings', baseWhere),
      members: await removeWhere('project_members', baseWhere),
      bindCodes: await removeWhere('owner_bind_codes', baseWhere),
      workerBindCodes: await removeWhere('worker_project_bind_codes', baseWhere)
    }

    await db.collection('projects').doc(projectId).remove()

    return {
      success: true,
      id: projectId,
      removed,
      cleanupErrors,
      deletedByOpenid: openid
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '删除工地失败',
        cleanupErrors: error.cleanupErrors || []
      }
    }
  }
}
