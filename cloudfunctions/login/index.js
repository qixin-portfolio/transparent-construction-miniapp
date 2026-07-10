const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'
const LEGACY_ROLES = ['admin', 'boss_qi', 'boss_hu', 'worker', 'designer', 'sales', 'project_manager']

function withDefaultTenant(user) {
  if (!user || user.tenantId) return user
  return Object.assign({}, user, {
    tenantId: DEFAULT_TENANT_ID,
    tenantName: DEFAULT_TENANT_NAME
  })
}

exports.main = async (event = {}) => {
  try {
    const { OPENID } = cloud.getWXContext()
    const users = db.collection('users')
    const existing = await users.where({ openid: OPENID }).limit(1).get()
    const allowGuestFlow = !!event.allowGuestFlow

    if (existing.data.length) {
      const user = existing.data[0]
      if (user.status !== 'active') {
        throw new Error('账号已停用，请联系管理员')
      }

      if (user.tenantId) {
        return { user }
      }

      if (LEGACY_ROLES.indexOf(user.role) !== -1) {
        return { user: withDefaultTenant(user) }
      }

      if (allowGuestFlow) {
        return { user: Object.assign({}, user, { role: user.role || 'owner' }) }
      }

      return {
        needRegister: true,
        redirectUrl: '/pages/register/register'
      }
    }

    if (!allowGuestFlow) {
      return {
        needRegister: true,
        redirectUrl: '/pages/register/register'
      }
    }

    const now = db.serverDate()
    const user = {
      openid: OPENID,
      name: '',
      phone: '',
      role: 'owner',
      status: 'active',
      createdAt: now,
      updatedAt: now
    }
    const addRes = await users.add({ data: user })

    return {
      user: Object.assign({ _id: addRes._id }, user)
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '登录失败'
      }
    }
  }
}
