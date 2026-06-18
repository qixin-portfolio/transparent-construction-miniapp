const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const CUSTOMER_ROLES = ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales']
const ALL_CUSTOMER_ROLES = ['admin', 'boss_qi', 'boss_hu']

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

exports.main = async () => {
  try {
    const { openid, user } = await getCurrentUser()
    assertRole(user, CUSTOMER_ROLES)

    let query = db.collection('customers').where({ deleted: _.neq(true) })
    if (ALL_CUSTOMER_ROLES.indexOf(user.role) === -1) {
      query = db.collection('customers').where({
        deleted: _.neq(true),
        ownerOpenid: openid
      })
    }

    const res = await query.orderBy('updatedAt', 'desc').limit(100).get()
    return { items: res.data }
  } catch (error) {
    return {
      error: {
        message: error.message || '获取客户列表失败'
      }
    }
  }
}
