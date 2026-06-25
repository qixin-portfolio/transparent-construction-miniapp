const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'

exports.main = async () => {
  try {
    const { OPENID } = cloud.getWXContext()
    const users = db.collection('users')
    const existing = await users.where({ openid: OPENID }).limit(1).get()

    if (existing.data.length) {
      const user = existing.data[0]
      if (user.status !== 'active') {
        throw new Error('账号已停用，请联系管理员')
      }
      if (!user.tenantId) {
        const now = db.serverDate()
        await users.doc(user._id).update({
          data: {
            tenantId: DEFAULT_TENANT_ID,
            tenantName: DEFAULT_TENANT_NAME,
            updatedAt: now
          }
        })
        user.tenantId = DEFAULT_TENANT_ID
        user.tenantName = DEFAULT_TENANT_NAME
      }
      return { user }
    }

    const userCount = await users.count()
    const isFirstUser = userCount.total === 0
    const now = db.serverDate()
    const user = {
      openid: OPENID,
      name: isFirstUser ? '初始管理员' : '',
      phone: '',
      role: isFirstUser ? 'admin' : 'owner',
      tenantId: DEFAULT_TENANT_ID,
      tenantName: DEFAULT_TENANT_NAME,
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
