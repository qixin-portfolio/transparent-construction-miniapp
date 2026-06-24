const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const CUSTOMER_ROLES = ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales']
const ALL_CUSTOMER_ROLES = ['admin', 'boss_qi', 'boss_hu']
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

exports.main = async () => {
  try {
    const { openid, user } = await getCurrentUser()
    assertRole(user, CUSTOMER_ROLES)
    const tenantId = user.tenantId || DEFAULT_TENANT_ID

    let query = db.collection('customers').where({
      deleted: _.neq(true),
      tenantId: _.in([tenantId, '', null])
    })
    if (ALL_CUSTOMER_ROLES.indexOf(user.role) === -1) {
      query = db.collection('customers').where({
        deleted: _.neq(true),
        tenantId: _.in([tenantId, '', null]),
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
