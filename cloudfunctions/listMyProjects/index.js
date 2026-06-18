const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const ALL_PROJECT_ROLES = ['admin', 'boss_qi', 'boss_hu']

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  return { openid: OPENID, user: res.data[0] || null }
}

exports.main = async () => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')

    let projects = []
    if (ALL_PROJECT_ROLES.indexOf(user.role) !== -1) {
      const res = await db.collection('projects').orderBy('updatedAt', 'desc').limit(100).get()
      projects = res.data
    } else if (user.role === 'owner') {
      const res = await db.collection('projects')
        .where({ ownerOpenid: openid })
        .orderBy('updatedAt', 'desc')
        .limit(100)
        .get()
      projects = res.data
    } else {
      const members = await db.collection('project_members')
        .where({ userOpenid: openid })
        .limit(100)
        .get()
      const ids = members.data.map((item) => item.projectId).filter(Boolean)
      if (ids.length) {
        const res = await db.collection('projects')
          .where({ _id: _.in(ids) })
          .orderBy('updatedAt', 'desc')
          .limit(100)
          .get()
        projects = res.data
      }
    }

    return { items: projects }
  } catch (error) {
    return {
      error: {
        message: error.message || '获取工地列表失败'
      }
    }
  }
}
