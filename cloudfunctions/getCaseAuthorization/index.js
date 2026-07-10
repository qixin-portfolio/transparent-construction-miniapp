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

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const projectId = String(event.projectId || '').trim()
    if (!projectId) throw new Error('缺少工地 ID')
    const res = await db.collection('case_authorizations')
      .where({ tenantId: tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId, projectId, ownerOpenid: openid })
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get()
    return { authorization: res.data[0] || null }
  } catch (error) {
    return { error: { message: error.message || '获取案例授权失败' } }
  }
}
