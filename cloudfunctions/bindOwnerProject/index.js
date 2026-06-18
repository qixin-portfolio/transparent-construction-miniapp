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
    const code = String(event.code || '').replace(/\s/g, '').trim()
    if (!/^\d{6}$/.test(code)) throw new Error('请输入 6 位绑定码')

    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')

    const codeRes = await db.collection('owner_bind_codes')
      .where({ code, status: 'active' })
      .limit(1)
      .get()
    const bindCode = codeRes.data[0]
    if (!bindCode) throw new Error('绑定码无效或已使用')

    if (bindCode.expiresAt <= Date.now()) {
      await db.collection('owner_bind_codes').doc(bindCode._id).update({
        data: {
          status: 'expired',
          updatedAt: db.serverDate()
        }
      })
      throw new Error('绑定码已过期，请联系晟景装饰重新获取')
    }

    const projectRes = await db.collection('projects').doc(bindCode.projectId).get()
    const project = projectRes.data
    if (!project) throw new Error('绑定的工地不存在')

    if (project.ownerOpenid && project.ownerOpenid !== openid) {
      throw new Error('该工地已绑定其他业主，请联系晟景装饰')
    }

    const now = db.serverDate()
    await db.collection('projects').doc(project._id).update({
      data: {
        ownerOpenid: openid,
        ownerUserId: user._id || '',
        ownerName: user.name || '',
        updatedAt: now
      }
    })

    await db.collection('owner_bind_codes').doc(bindCode._id).update({
      data: {
        status: 'used',
        usedByOpenid: openid,
        usedAt: now,
        updatedAt: now
      }
    })

    return {
      project: Object.assign({}, project, {
        ownerOpenid: openid,
        ownerUserId: user._id || '',
        ownerName: user.name || ''
      })
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '绑定工地失败'
      }
    }
  }
}
