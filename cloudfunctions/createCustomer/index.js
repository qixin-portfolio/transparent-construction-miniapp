const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const CUSTOMER_ROLES = ['admin', 'boss_qi', 'boss_hu', 'designer']

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  return { openid: OPENID, user: res.data[0] || null }
}

function assertRole(user, roles) {
  if (!user || roles.indexOf(user.role) === -1) {
    throw new Error('当前账号没有操作客户库的权限')
  }
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    assertRole(user, CUSTOMER_ROLES)

    const name = String(event.name || '').trim()
    const phone = String(event.phone || '').trim()
    if (!name) throw new Error('客户姓名不能为空')
    if (phone && !/^1\d{10}$/.test(phone)) throw new Error('手机号格式不正确')

    if (phone) {
      const duplicated = await db.collection('customers')
        .where({ phone, deleted: _.neq(true) })
        .limit(1)
        .get()
      if (duplicated.data.length) {
        throw new Error('该手机号已存在客户记录')
      }
    }

    const now = db.serverDate()
    const data = {
      name,
      phone,
      source: String(event.source || '').trim(),
      address: String(event.address || '').trim(),
      need: String(event.need || '').trim(),
      stage: String(event.stage || '咨询').trim(),
      dealStatus: String(event.dealStatus || '未成交').trim(),
      ownerOpenid: openid,
      createdByOpenid: openid,
      updatedByOpenid: openid,
      deleted: false,
      createdAt: now,
      updatedAt: now
    }

    const res = await db.collection('customers').add({ data })
    return { id: res._id }
  } catch (error) {
    return {
      error: {
        message: error.message || '新增客户失败'
      }
    }
  }
}
