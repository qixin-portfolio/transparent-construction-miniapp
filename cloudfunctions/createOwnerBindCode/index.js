const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const FULL_PROJECT_ROLES = ['admin', 'boss_qi', 'boss_hu']
const BIND_CODE_ROLES = FULL_PROJECT_ROLES.concat(['designer', 'sales'])
const CODE_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  return { openid: OPENID, user: res.data[0] || null }
}

async function canManageProject(openid, user, projectId) {
  if (!user || BIND_CODE_ROLES.indexOf(user.role) === -1) return false
  if (FULL_PROJECT_ROLES.indexOf(user.role) !== -1) return true

  const member = await db.collection('project_members')
    .where({ projectId, userOpenid: openid })
    .limit(1)
    .get()
  return member.data.length > 0
}

function makeCode() {
  return String(crypto.randomInt(100000, 1000000))
}

async function makeUniqueCode() {
  for (let index = 0; index < 12; index += 1) {
    const code = makeCode()
    const existing = await db.collection('owner_bind_codes')
      .where({ code, status: 'active' })
      .limit(1)
      .get()
    if (!existing.data.length) return code
  }
  throw new Error('绑定码生成失败，请稍后再试')
}

exports.main = async (event) => {
  try {
    const projectId = String(event.projectId || '').trim()
    if (!projectId) throw new Error('缺少工地 ID')

    const { openid, user } = await getCurrentUser()
    const allowed = await canManageProject(openid, user, projectId)
    if (!allowed) throw new Error('当前账号没有生成绑定码的权限')

    const projectRes = await db.collection('projects').doc(projectId).get()
    const project = projectRes.data
    if (!project) throw new Error('工地不存在')

    const now = Date.now()
    const activeCodeRes = await db.collection('owner_bind_codes')
      .where({ projectId, status: 'active' })
      .orderBy('expiresAt', 'desc')
      .limit(1)
      .get()
    const activeCode = activeCodeRes.data[0]
    if (activeCode && activeCode.expiresAt > now) {
      return {
        code: activeCode.code,
        expiresAt: activeCode.expiresAt,
        projectId,
        projectName: project.name || ''
      }
    }
    if (activeCode) {
      await db.collection('owner_bind_codes').doc(activeCode._id).update({
        data: {
          status: 'expired',
          updatedAt: db.serverDate()
        }
      })
    }

    const code = await makeUniqueCode()
    const expiresAt = now + CODE_EXPIRES_IN
    await db.collection('owner_bind_codes').add({
      data: {
        code,
        projectId,
        projectName: project.name || '',
        status: 'active',
        expiresAt,
        createdByOpenid: openid,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })

    return {
      code,
      expiresAt,
      projectId,
      projectName: project.name || ''
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '生成业主绑定码失败'
      }
    }
  }
}
