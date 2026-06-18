const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  return { openid: OPENID, user: res.data[0] || null }
}

async function getTempUrlMap(fileIDs) {
  const uniqueIDs = Array.from(new Set(fileIDs.filter(Boolean)))
  if (!uniqueIDs.length) return {}

  try {
    const res = await cloud.getTempFileURL({ fileList: uniqueIDs })
    return (res.fileList || []).reduce((map, item) => {
      if (item.fileID) {
        map[item.fileID] = item.tempFileURL || item.fileID
      }
      return map
    }, {})
  } catch (error) {
    return uniqueIDs.reduce((map, fileID) => {
      map[fileID] = fileID
      return map
    }, {})
  }
}

exports.main = async () => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')

    const projectRes = await db.collection('projects')
      .where({ ownerOpenid: openid })
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get()

    if (!projectRes.data.length) {
      return { project: null, logs: [] }
    }

    const project = projectRes.data[0]
    const logsRes = await db.collection('stage_logs')
      .where({
        projectId: project._id,
        reviewStatus: 'approved',
        ownerVisible: true
      })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    const logs = logsRes.data
    const logIds = logs.map((item) => item._id)
    let photoRecords = []
    if (logIds.length) {
      const photosRes = await db.collection('photos')
        .where({
          stageLogId: _.in(logIds),
          ownerVisible: true
        })
        .limit(100)
        .get()
      photoRecords = photosRes.data
    }

    const fileIDs = []
    logs.forEach((log) => {
      ;(log.photoFileIDs || []).forEach((fileID) => fileIDs.push(fileID))
      ;(log.photos || []).forEach((fileID) => fileIDs.push(fileID))
    })
    photoRecords.forEach((photo) => {
      fileIDs.push(photo.fileID || photo.fileId || photo.cloudFileId)
    })

    const tempUrlMap = await getTempUrlMap(fileIDs)
    const photosByLog = photoRecords.reduce((map, photo) => {
      const fileID = photo.fileID || photo.fileId || photo.cloudFileId
      if (!map[photo.stageLogId]) map[photo.stageLogId] = []
      map[photo.stageLogId].push(tempUrlMap[fileID] || fileID)
      return map
    }, {})

    const visibleLogs = logs.map((log) => {
      const inlinePhotos = (log.photoFileIDs || log.photos || [])
        .filter(Boolean)
        .map((fileID) => tempUrlMap[fileID] || fileID)
      const recordPhotos = photosByLog[log._id] || []
      return Object.assign({}, log, {
        photos: recordPhotos.length ? recordPhotos : inlinePhotos
      })
    })

    return {
      project,
      logs: visibleLogs
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '获取业主工地失败'
      }
    }
  }
}
