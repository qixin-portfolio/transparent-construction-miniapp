const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const ALL_PROJECT_ROLES = ['admin', 'boss_qi', 'boss_hu']

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  return { openid: OPENID, user: res.data[0] || null }
}

async function canAccessProject(openid, user, project) {
  if (!user || !project) return false
  if (ALL_PROJECT_ROLES.indexOf(user.role) !== -1) return true
  if (user.role === 'owner' && project.ownerOpenid === openid) return true

  const member = await db.collection('project_members')
    .where({ projectId: project._id, userOpenid: openid })
    .limit(1)
    .get()
  return member.data.length > 0
}

exports.main = async (event) => {
  try {
    const projectId = String(event.projectId || '').trim()
    if (!projectId) throw new Error('缺少工地 ID')

    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')

    const projectRes = await db.collection('projects').doc(projectId).get()
    const project = projectRes.data
    const allowed = await canAccessProject(openid, user, project)
    if (!allowed) throw new Error('当前账号无权查看该工地')

    let logQuery = db.collection('stage_logs').where({ projectId })
    if (user.role === 'owner') {
      logQuery = db.collection('stage_logs').where({
        projectId,
        ownerVisible: true,
        reviewStatus: 'approved'
      })
    }

    const logs = await logQuery.orderBy('createdAt', 'desc').limit(50).get()

    return {
      project,
      logs: logs.data
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '获取工地详情失败'
      }
    }
  }
}
