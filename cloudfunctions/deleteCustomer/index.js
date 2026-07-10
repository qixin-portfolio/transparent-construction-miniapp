const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'

function tenantMatches(resourceTenantId, tenantId) {
  return resourceTenantId ? resourceTenantId === tenantId : tenantId === DEFAULT_TENANT_ID
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
    if (user.role !== 'admin') {
      throw new Error('仅管理员可删除客户资料')
    }

    const customerId = String(event.customerId || event.id || '').trim()
    if (!customerId) throw new Error('缺少客户 ID')

    const customerRes = await db.collection('customers').doc(customerId).get()
    if (!customerRes.data) throw new Error('客户不存在')
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    if (!tenantMatches(customerRes.data.tenantId, tenantId)) {
      throw new Error('无权删除该客户')
    }

    const now = db.serverDate()
    await db.collection('customers').doc(customerId).update({
      data: {
        deleted: true,
        tenantId,
        deletedAt: now,
        deletedByOpenid: openid,
        updatedAt: now,
        updatedByOpenid: openid
      }
    })

    return { success: true, id: customerId }
  } catch (error) {
    return {
      error: {
        message: error.message || '删除客户失败'
      }
    }
  }
}
