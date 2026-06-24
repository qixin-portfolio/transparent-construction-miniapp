const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const MANAGE_ROLES = ['admin', 'boss_qi', 'boss_hu']
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
    const { user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    if (MANAGE_ROLES.indexOf(user.role) === -1) {
      throw new Error('仅管理员可查看邀请码')
    }
    const tenantId = user.tenantId || DEFAULT_TENANT_ID

    const status = String(event.status || '').trim() // active/used/expired/空=全部
    const role = String(event.role || '').trim()

    const where = { tenantId: _.in([tenantId, '', null]) }
    if (status) where.status = status
    if (role) where.role = role

    const res = await db.collection('staff_invite_codes')
      .where(where)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()

    // 补充过期状态（数据库里可能还是 active 但已超时）
    const now = Date.now()
    const items = res.data.map((item) => {
      let realStatus = item.status
      if (item.status === 'active' && item.expiresAt <= now) {
        realStatus = 'expired'
      }
      return Object.assign({}, item, { status: realStatus })
    })

    return { items }
  } catch (error) {
    return {
      error: {
        message: error.message || '获取邀请码列表失败'
      }
    }
  }
}
