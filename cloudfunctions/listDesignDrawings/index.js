const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const ALL_PROJECT_ROLES = ['admin', 'boss_qi', 'boss_hu', 'sales', 'designer']
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

async function canAccessProject(openid, user, project) {
  if (!user || !project) return false
  const tenantId = user.tenantId || DEFAULT_TENANT_ID
  if (project.tenantId && project.tenantId !== tenantId) return false
  if (ALL_PROJECT_ROLES.indexOf(user.role) !== -1) return true
  const ownerOpenids = Array.isArray(project.ownerOpenids) ? project.ownerOpenids : []
  if (user.role === 'owner' && (project.ownerOpenid === openid || ownerOpenids.indexOf(openid) !== -1)) return true
  if (['designer', 'worker', 'project_manager'].indexOf(user.role) !== -1) {
    const member = await db.collection('project_members')
      .where({ projectId: project._id, userOpenid: openid })
      .limit(1)
      .get()
    return member.data.length > 0
  }
  return false
}

async function getTempUrlMap(fileIDs) {
  const uniqueIDs = Array.from(new Set(fileIDs.filter(Boolean)))
  if (!uniqueIDs.length) return {}
  try {
    const res = await cloud.getTempFileURL({ fileList: uniqueIDs })
    return (res.fileList || []).reduce((map, item) => {
      if (item.fileID) map[item.fileID] = item.tempFileURL || item.fileID
      return map
    }, {})
  } catch (e) {
    return {}
  }
}

exports.main = async (event) => {
  try {
    const projectId = String(event.projectId || '').trim()
    if (!projectId) throw new Error('缺少工地 ID')

    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    const tenantId = user.tenantId || DEFAULT_TENANT_ID

    const projectRes = await db.collection('projects').doc(projectId).get()
    const project = projectRes.data
    const allowed = await canAccessProject(openid, user, project)
    if (!allowed) throw new Error('当前账号无权查看该工地图纸')

    // 业主只能看效果图且 ownerVisible=true
    let query = db.collection('design_drawings').where({ projectId, tenantId: _.in([tenantId, '', null]) })
    if (user.role === 'owner') {
      query = db.collection('design_drawings').where({
        projectId,
        tenantId: _.in([tenantId, '', null]),
        type: 'render',
        ownerVisible: true
      })
    }

    const res = await query.orderBy('createdAt', 'desc').limit(100).get()
    const drawings = res.data

    // 获取临时链接
    const fileIDs = drawings.map((d) => d.fileID).filter(Boolean)
    const urlMap = await getTempUrlMap(fileIDs)

    const result = drawings.map((d) => {
      const readBy = d.readBy || []
      const myRead = readBy.find((r) => r.openid === openid)
      return Object.assign({}, d, {
        tempFileURL: urlMap[d.fileID] || '',
        readByMe: !!myRead
      })
    })

    return { drawings: result }
  } catch (error) {
    return { error: { message: error.message || '获取图纸列表失败' } }
  }
}
