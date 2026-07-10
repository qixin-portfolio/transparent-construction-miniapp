const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const REVIEW_ROLES = ['admin', 'boss_qi', 'boss_hu']
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
  return user
}

function assertReviewRole(user) {
  if (!user || REVIEW_ROLES.indexOf(user.role) === -1) {
    throw new Error('当前账号没有审核日报的权限')
  }
}

async function buildTempUrlMap(fileIDs = []) {
  const uniqueFileIDs = Array.from(new Set(fileIDs.filter(Boolean)))
  if (!uniqueFileIDs.length) return {}

  try {
    const res = await cloud.getTempFileURL({ fileList: uniqueFileIDs })
    return (res.fileList || []).reduce((map, item) => {
      if (item.fileID && item.tempFileURL) {
        map[item.fileID] = item.tempFileURL
      }
      return map
    }, {})
  } catch (err) {
    console.warn('[listPendingStageLogs] getTempFileURL failed:', err && err.message)
    return {}
  }
}

exports.main = async () => {
  try {
    const user = await getCurrentUser()
    assertReviewRole(user)
    const tenantId = user.tenantId || DEFAULT_TENANT_ID

    const res = await db.collection('stage_logs')
      .where({ reviewStatus: 'pending', tenantId: tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId })
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()

    const items = res.data
    const projectIds = Array.from(new Set(items.map((item) => item.projectId).filter(Boolean)))
    let projectMap = {}
    if (projectIds.length) {
      const projects = await db.collection('projects').where({ _id: _.in(projectIds), tenantId }).limit(100).get()
      projectMap = projects.data.reduce((map, item) => {
        map[item._id] = item
        return map
      }, {})
    }

    // Collect all photo fileIDs and convert to temp URLs
    const allFileIDs = []
    items.forEach((log) => {
      const ids = Array.isArray(log.photoFileIDs) ? log.photoFileIDs.filter(Boolean) : []
      ids.forEach((id) => allFileIDs.push(id))
    })
    const tempUrlMap = await buildTempUrlMap(allFileIDs)

    return {
      items: items.map((log) => {
        const photoFileIDs = Array.isArray(log.photoFileIDs) ? log.photoFileIDs.filter(Boolean) : []
        const photoUrls = photoFileIDs.map((fileID) => tempUrlMap[fileID]).filter(Boolean)
        const photos = photoFileIDs.map((fileID) => {
          const tempFileURL = tempUrlMap[fileID]
          return {
            fileID,
            url: tempFileURL || fileID,
            tempFileURL: tempFileURL || ''
          }
        })

        return Object.assign({}, log, {
          projectName: log.projectName || (projectMap[log.projectId] && projectMap[log.projectId].name) || '未命名工地',
          // Keep original field
          photoFileIDs,
          // Add temp URL fields for display
          photoUrls,
          photoTempUrls: photoUrls,
          photos
        })
      })
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '获取待审核日报失败'
      }
    }
  }
}
