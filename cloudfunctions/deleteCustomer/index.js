const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  return { openid: OPENID, user: res.data[0] || null }
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

    const now = db.serverDate()
    await db.collection('customers').doc(customerId).update({
      data: {
        deleted: true,
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
