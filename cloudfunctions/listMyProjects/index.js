const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const ALL_PROJECT_ROLES = ['admin', 'boss_qi', 'boss_hu', 'sales', 'designer']
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'

function tenantWhere(tenantId, extra = {}) {
  const effectiveTenantId = tenantId || DEFAULT_TENANT_ID
  return Object.assign({}, extra, {
    tenantId: effectiveTenantId === DEFAULT_TENANT_ID
      ? _.in([effectiveTenantId, '', null])
      : effectiveTenantId
  })
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

exports.main = async () => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    const tenantId = user.tenantId || DEFAULT_TENANT_ID

    let projects = []
    if (ALL_PROJECT_ROLES.indexOf(user.role) !== -1) {
      const res = await db.collection('projects').where(tenantWhere(tenantId)).orderBy('updatedAt', 'desc').limit(100).get()
      projects = res.data
    } else if (user.role === 'owner') {
      const res = await db.collection('projects')
        .where(tenantWhere(tenantId, { ownerOpenid: openid }))
        .orderBy('updatedAt', 'desc')
        .limit(100)
        .get()
      projects = res.data
    } else {
      const members = await db.collection('project_members')
        .where(tenantWhere(tenantId, { userOpenid: openid }))
        .limit(100)
        .get()
      const ids = Array.from(new Set(members.data.map((item) => item.projectId).filter(Boolean)))
      if (ids.length) {
        const res = await db.collection('projects')
          .where(tenantWhere(tenantId, { _id: _.in(ids) }))
          .orderBy('updatedAt', 'desc')
          .limit(100)
          .get()
        projects = res.data
      }
    }

    return { items: projects }
  } catch (error) {
    return {
      error: {
        message: error.message || '获取工地列表失败'
      }
    }
  }
}
