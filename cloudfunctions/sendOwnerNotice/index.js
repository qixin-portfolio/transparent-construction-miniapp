const cloud = require('wx-server-sdk')
const { createSendOwnerNoticeService } = require('./noticeService')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  return { openid: OPENID, user: res.data[0] || null }
}

exports.main = createSendOwnerNoticeService({ cloud, db, getCurrentUser })
