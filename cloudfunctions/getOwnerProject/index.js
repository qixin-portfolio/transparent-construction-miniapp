const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'

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

async function findOwnerProject(openid, user, tenantId, projectId) {
  if (projectId) {
    const detailRes = await db.collection('projects').doc(projectId).get()
    const project = detailRes.data || null
    if (!project) throw new Error('工地不存在')
    if (project.tenantId && project.tenantId !== tenantId) throw new Error('当前账号无权查看该工地')
    const ownerOpenids = Array.isArray(project.ownerOpenids) ? project.ownerOpenids : []
    const ownerUserIds = Array.isArray(project.ownerUserIds) ? project.ownerUserIds : []
    const userId = (user && user._id) || ''
    if (
      project.ownerOpenid !== openid &&
      ownerOpenids.indexOf(openid) === -1 &&
      project.ownerUserId !== userId &&
      ownerUserIds.indexOf(userId) === -1
    ) {
      throw new Error('当前账号无权查看该工地')
    }
    return project
  }

  const projectRes = await db.collection('projects')
    .where({ ownerOpenids: openid, tenantId: _.in([tenantId, '', null]) })
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get()

  // 兼容旧数据：ownerOpenid 单值字段
  if (!projectRes.data.length) {
    const legacyRes = await db.collection('projects')
      .where({ ownerOpenid: openid, tenantId: _.in([tenantId, '', null]) })
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get()
    return legacyRes.data[0] || null
  }

  return projectRes.data[0] || null
}

exports.main = async (event = {}) => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const projectId = String(event.projectId || '').trim()

    const project = await findOwnerProject(openid, user, tenantId, projectId)
    if (!project) {
      return { project: null, logs: [] }
    }
    const logsRes = await db.collection('stage_logs')
      .where({
        projectId: project._id,
        tenantId: _.in([tenantId, '', null]),
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
          tenantId: _.in([tenantId, '', null]),
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
