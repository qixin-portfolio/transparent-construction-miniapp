const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  return { openid: OPENID, user: res.data[0] || null }
}

async function safeRemoveWhere(collectionName, where) {
  try {
    const res = await db.collection(collectionName).where(where).remove()
    return res.stats && typeof res.stats.removed === 'number' ? res.stats.removed : 0
  } catch (error) {
    return 0
  }
}

async function safeDeleteFiles(fileIDs) {
  const uniqueIDs = Array.from(new Set((fileIDs || []).filter(Boolean)))
  if (!uniqueIDs.length) return 0

  let deleted = 0
  for (let i = 0; i < uniqueIDs.length; i += 50) {
    const chunk = uniqueIDs.slice(i, i + 50)
    try {
      const res = await cloud.deleteFile({ fileList: chunk })
      deleted += (res.fileList || []).filter((item) => item.status === 0).length
    } catch (error) {
      // 云存储删除失败不阻断数据库清理，避免测试数据卡住删不掉。
    }
  }
  return deleted
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

    const logsRes = await db.collection('stage_logs').where({ projectId }).limit(100).get()
    const logs = logsRes.data || []
    const logIds = logs.map((item) => item._id).filter(Boolean)

    const photosRes = await db.collection('photos').where({ projectId }).limit(300).get()
    const photos = photosRes.data || []

    const drawingsRes = await db.collection('design_drawings').where({ projectId }).limit(200).get()
    const drawings = drawingsRes.data || []

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

    const removed = {
      cloudFiles: await safeDeleteFiles(fileIDs),
      photos: await safeRemoveWhere('photos', { projectId }),
      logs: await safeRemoveWhere('stage_logs', { projectId }),
      drawings: await safeRemoveWhere('design_drawings', { projectId }),
      members: await safeRemoveWhere('project_members', { projectId }),
      bindCodes: await safeRemoveWhere('owner_bind_codes', { projectId })
    }

    if (logIds.length) {
      removed.photosByLogs = await safeRemoveWhere('photos', { stageLogId: _.in(logIds) })
    }

    await db.collection('projects').doc(projectId).remove()

    return {
      success: true,
      id: projectId,
      removed,
      deletedByOpenid: openid
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '删除工地失败'
      }
    }
  }
}
