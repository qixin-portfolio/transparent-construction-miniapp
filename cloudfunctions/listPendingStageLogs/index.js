const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const REVIEW_ROLES = ['admin', 'boss_qi', 'boss_hu']

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  return res.data[0] || null
}

function assertReviewRole(user) {
  if (!user || REVIEW_ROLES.indexOf(user.role) === -1) {
    throw new Error('当前账号没有审核日报的权限')
  }
}

exports.main = async () => {
  try {
    const user = await getCurrentUser()
    assertReviewRole(user)

    const res = await db.collection('stage_logs')
      .where({ reviewStatus: 'pending' })
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get()

    const items = res.data
    const projectIds = Array.from(new Set(items.map((item) => item.projectId).filter(Boolean)))
    let projectMap = {}
    if (projectIds.length) {
      const projects = await db.collection('projects').where({ _id: _.in(projectIds) }).limit(100).get()
      projectMap = projects.data.reduce((map, item) => {
        map[item._id] = item
        return map
      }, {})
    }

    return {
      items: items.map((item) => Object.assign({}, item, {
        projectName: item.projectName || (projectMap[item.projectId] && projectMap[item.projectId].name) || '未命名工地'
      }))
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '获取待审核日报失败'
      }
    }
  }
}
