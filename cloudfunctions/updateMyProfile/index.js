const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

function cleanText(value, maxLength) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function cleanFileID(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (text.indexOf('cloud://') !== 0) return ''
  return text.slice(0, 300)
}

exports.main = async (event) => {
  try {
    const { OPENID } = cloud.getWXContext()
    const users = db.collection('users')
    const res = await users.where({ openid: OPENID, status: 'active' }).limit(1).get()
    const user = res.data[0]

    if (!user) throw new Error('请先登录')

    const nickName = cleanText(event.nickName, 30)
    const avatarFileID = cleanFileID(event.avatarFileID)
    if (!nickName && !avatarFileID) {
      throw new Error('请先填写微信昵称或选择头像')
    }

    const data = {
      updatedAt: db.serverDate()
    }

    if (nickName) {
      data.nickName = nickName
      data.name = nickName
    }
    if (avatarFileID) {
      data.avatarFileID = avatarFileID
      data.avatarUpdatedAt = db.serverDate()
    }

    await users.doc(user._id).update({ data })
    const latest = await users.doc(user._id).get()

    return {
      user: latest.data
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '保存微信资料失败'
      }
    }
  }
}
