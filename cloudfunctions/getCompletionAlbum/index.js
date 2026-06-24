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

async function assertOwnerProject(openid, tenantId, projectId) {
  if (!projectId) throw new Error('缺少工地 ID')
  const res = await db.collection('projects').doc(projectId).get()
  const project = res.data || null
  if (!project) throw new Error('工地不存在')
  if (project.tenantId && project.tenantId !== tenantId) throw new Error('当前账号无权查看该纪念册')
  const ownerOpenids = Array.isArray(project.ownerOpenids) ? project.ownerOpenids : []
  if (project.ownerOpenid !== openid && ownerOpenids.indexOf(openid) === -1) {
    throw new Error('当前账号无权查看该纪念册')
  }
  return project
}

async function getTempUrlMap(fileIDs) {
  const unique = Array.from(new Set(fileIDs.filter(Boolean)))
  if (!unique.length) return {}
  try {
    const res = await cloud.getTempFileURL({ fileList: unique })
    return (res.fileList || []).reduce((map, item) => {
      map[item.fileID] = item.tempFileURL || item.fileID
      return map
    }, {})
  } catch (error) {
    return unique.reduce((map, fileID) => {
      map[fileID] = fileID
      return map
    }, {})
  }
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const projectId = String(event.projectId || '').trim()
    const project = await assertOwnerProject(openid, tenantId, projectId)
    const baseWhere = { tenantId: _.in([tenantId, '', null]), projectId }
    const authWhere = { tenantId: _.in([tenantId, '', null]), projectId, ownerOpenid: openid }
    const archiveRes = await db.collection('owner_archives').where(baseWhere).orderBy('updatedAt', 'desc').limit(20).get()
    const authRes = await db.collection('case_authorizations').where(authWhere).orderBy('updatedAt', 'desc').limit(1).get()
    const ownerId = user._id || ''
    const archive = (archiveRes.data || []).find((item) => {
      if (!item.ownerOpenid && !item.ownerId) return true
      return item.ownerOpenid === openid || item.ownerId === ownerId
    }) || null
    const authorization = authRes.data[0] || null
    if (!archive) return { project, album: null, authorization }

    const fileIDs = []
    if (archive.coverFileID) fileIDs.push(archive.coverFileID)
    ;(archive.milestones || []).forEach((item) => {
      ;(item.photoFileIDs || []).forEach((fileID) => fileIDs.push(fileID))
    })
    const tempUrlMap = await getTempUrlMap(fileIDs)
    const album = {
      title: archive.albumTitle || `${project.name || '我的家'}完工纪念册`,
      summary: archive.summary || '',
      coverUrl: tempUrlMap[archive.coverFileID] || archive.coverUrl || '',
      style: archive.houseInfo && archive.houseInfo.style ? archive.houseInfo.style : '',
      area: archive.houseInfo && archive.houseInfo.area ? archive.houseInfo.area : '',
      completedAt: archive.completedAt || project.completedAt || project.updatedAt,
      milestones: (archive.milestones || []).map((item) => Object.assign({}, item, {
        photos: (item.photoFileIDs || []).map((fileID) => tempUrlMap[fileID] || fileID)
      }))
    }
    return { project, album, authorization }
  } catch (error) {
    return { error: { message: error.message || '获取完工纪念册失败' } }
  }
}
