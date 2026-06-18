const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const CUSTOMER_ROLES = ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales']

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  return { openid: OPENID, user: res.data[0] || null }
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
