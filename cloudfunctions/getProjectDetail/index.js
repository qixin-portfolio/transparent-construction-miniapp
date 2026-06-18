const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const ALL_PROJECT_ROLES = ['admin', 'boss_qi', 'boss_hu', 'sales', 'designer', 'worker']
const MANAGER_ROLES = ['admin', 'boss_qi', 'boss_hu']

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  return { openid: OPENID, user: res.data[0] || null }
}

async function canAccessProject(openid, user, project) {
  if (!user || !project) return false
  if (ALL_PROJECT_ROLES.indexOf(user.role) !== -1) return true
  if (user.role === 'owner' && project.ownerOpenid === openid) return true

  const member = await db.collection('project_members')
    .where({ projectId: project._id, userOpenid: openid })
    .limit(1)
    .get()
  return member.data.length > 0
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

function collectLogFileIDs(logs) {
  return logs.reduce((fileIDs, log) => {
    ;(log.photoFileIDs || []).forEach((fileID) => fileIDs.push(fileID))
    ;(log.photos || []).forEach((fileID) => fileIDs.push(fileID))
    return fileIDs
  }, [])
}

async function getPhotoRecords(logs, user) {
  const logIds = logs.map((item) => item._id).filter(Boolean)
  if (!logIds.length) return []

  let query = db.collection('photos').where({ stageLogId: _.in(logIds) })
  if (user.role === 'owner') {
    query = db.collection('photos').where({
      stageLogId: _.in(logIds),
      ownerVisible: true
    })
  }

  const res = await query.limit(200).get()
  return res.data || []
}

function attachPhotos(logs, photoRecords, tempUrlMap) {
  const photosByLog = photoRecords.reduce((map, photo) => {
    const fileID = photo.fileID || photo.fileId || photo.cloudFileId
    if (!fileID) return map
    if (!map[photo.stageLogId]) map[photo.stageLogId] = []
    map[photo.stageLogId].push(tempUrlMap[fileID] || fileID)
    return map
  }, {})

  return logs.map((log) => {
    const inlinePhotos = (log.photoFileIDs || log.photos || [])
      .filter(Boolean)
      .map((fileID) => tempUrlMap[fileID] || fileID)
    const recordPhotos = photosByLog[log._id] || []
    return Object.assign({}, log, {
      photos: recordPhotos.length ? recordPhotos : inlinePhotos
    })
  })
}

exports.main = async (event) => {
  try {
    const projectId = String(event.projectId || '').trim()
    if (!projectId) throw new Error('缺少工地 ID')

    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')

    const projectRes = await db.collection('projects').doc(projectId).get()
    const project = projectRes.data
    const allowed = await canAccessProject(openid, user, project)
    if (!allowed) throw new Error('当前账号无权查看该工地')

    const isManager = MANAGER_ROLES.indexOf(user.role) !== -1
    let logQuery = db.collection('stage_logs').where({ projectId })
    if (user.role === 'owner') {
      logQuery = db.collection('stage_logs').where({
        projectId,
        ownerVisible: true,
        reviewStatus: 'approved'
      })
    }

    const logsRes = await logQuery.orderBy('createdAt', 'desc').limit(50).get()
    const logs = logsRes.data || []
    const canIncludePhotos = isManager || user.role === 'owner'
    const photoRecords = canIncludePhotos ? await getPhotoRecords(logs, user) : []
    const fileIDs = canIncludePhotos ? collectLogFileIDs(logs) : []
    photoRecords.forEach((photo) => {
      fileIDs.push(photo.fileID || photo.fileId || photo.cloudFileId)
    })
    const tempUrlMap = await getTempUrlMap(fileIDs)
    const visibleLogs = canIncludePhotos
      ? attachPhotos(logs, photoRecords, tempUrlMap)
      : logs.map((log) => Object.assign({}, log, { photos: [] }))

    return {
      project,
      logs: visibleLogs
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '获取工地详情失败'
      }
    }
  }
}
