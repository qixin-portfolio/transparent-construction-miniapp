const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'
const COMPLETED_STATUS = ['已完工', '完工', '已竣工', '竣工验收']

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

function isCompleted(project) {
  const status = project.status || ''
  return COMPLETED_STATUS.indexOf(status) !== -1 || Number(project.progress || 0) >= 100
}

async function listOwnerProjects(openid, tenantId) {
  const tenantQuery = _.in([tenantId, '', null])
  const arrayRes = await db.collection('projects')
    .where({ ownerOpenids: openid, tenantId: tenantQuery })
    .orderBy('updatedAt', 'desc')
    .limit(50)
    .get()
  const legacyRes = await db.collection('projects')
    .where({ ownerOpenid: openid, tenantId: tenantQuery })
    .orderBy('updatedAt', 'desc')
    .limit(50)
    .get()

  const map = {}
  ;(arrayRes.data || []).concat(legacyRes.data || []).forEach((item) => {
    if (item && item._id) map[item._id] = item
  })
  return Object.keys(map).map((id) => map[id])
}

async function findHistoricalCustomer(openid, user, tenantId) {
  const tenantQuery = _.in([tenantId, '', null])
  const byOpenid = await db.collection('customers')
    .where({ ownerOpenid: openid, tenantId: tenantQuery })
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get()
  if (byOpenid.data.length) return byOpenid.data[0]

  const phone = String((user && user.phone) || '').trim()
  if (!phone) return null
  const byPhone = await db.collection('customers')
    .where({ phone, tenantId: tenantQuery })
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get()
  return byPhone.data[0] || null
}

exports.main = async () => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    const tenantId = user.tenantId || DEFAULT_TENANT_ID

    const projects = await listOwnerProjects(openid, tenantId)
    const activeProjects = projects.filter((item) => !isCompleted(item))
    const completedProjects = projects.filter(isCompleted)
    const historicalCustomer = projects.length ? null : await findHistoricalCustomer(openid, user, tenantId)

    let ownerIdentity = 'unbound_owner'
    if (activeProjects.length) ownerIdentity = 'active_owner'
    else if (completedProjects.length) ownerIdentity = 'completed_owner'
    else if (historicalCustomer) ownerIdentity = 'historical_lead'

    return {
      ownerIdentity,
      activeProject: activeProjects[0] || null,
      completedProject: completedProjects[0] || null,
      activeProjects,
      completedProjects,
      historicalCustomer
    }
  } catch (error) {
    return { error: { message: error.message || '获取业主入口失败' } }
  }
}
