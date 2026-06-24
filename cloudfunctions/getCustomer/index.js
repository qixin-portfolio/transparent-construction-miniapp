const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const CUSTOMER_ROLES = ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales']
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

function assertRole(user, roles) {
  if (!user || roles.indexOf(user.role) === -1) {
    throw new Error('当前账号没有查看客户库的权限')
  }
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    assertRole(user, CUSTOMER_ROLES)

    const customerId = String(event.customerId || event.id || '').trim()
    if (!customerId) throw new Error('缺少客户 ID')

    const res = await db.collection('customers').doc(customerId).get()
    const customer = res.data
    if (!customer || customer.deleted === true) {
      throw new Error('客户不存在或已删除')
    }
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    if (customer.tenantId && customer.tenantId !== tenantId) {
      throw new Error('无权查看该客户')
    }

    // 非管理员只能看自己创建的客户
    const ALL_CUSTOMER_ROLES = ['admin', 'boss_qi', 'boss_hu']
    if (ALL_CUSTOMER_ROLES.indexOf(user.role) === -1 && customer.ownerOpenid !== openid) {
      throw new Error('无权查看该客户')
    }

    return { customer }
  } catch (error) {
    return {
      error: {
        message: error.message || '获取客户详情失败'
      }
    }
  }
}
