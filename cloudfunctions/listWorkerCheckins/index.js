const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
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

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    if (['worker', 'project_manager'].indexOf(user.role) === -1) throw new Error('仅工长或项目经理可以查看自己的打卡记录')

    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const projectId = String(event.projectId || '').trim()
    const where = tenantWhere(tenantId, {
      type: 'worker_checkin',
      userOpenid: openid
    })
    if (projectId) where.projectId = projectId

    const res = await db.collection('activity_logs')
      .where(where)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()

    return { items: res.data || [] }
  } catch (error) {
    return {
      error: {
        message: error.message || '获取打卡记录失败'
      }
    }
  }
}
