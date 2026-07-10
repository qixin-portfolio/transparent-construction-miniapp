const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const FULL_PROJECT_ROLES = ['admin', 'boss_qi', 'boss_hu']
const BIND_CODE_ROLES = FULL_PROJECT_ROLES.concat(['designer', 'sales', 'project_manager'])
const CODE_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000
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
    const existing = await db.collection('worker_project_bind_codes')
      .where({ code, status: 'active' })
      .limit(1)
      .get()
    if (!existing.data.length) return code
  }
  throw new Error('工长绑定码生成失败，请稍后再试')
}

async function expireCodes(codes, now) {
  const tasks = codes
    .filter((item) => item.expiresAt <= now)
    .map((item) => db.collection('worker_project_bind_codes').doc(item._id).update({
      data: { status: 'expired', updatedAt: db.serverDate() }
    }))
  await Promise.all(tasks)
}

exports.main = async (event) => {
  try {
    const projectId = String(event.projectId || '').trim()
    if (!projectId) throw new Error('缺少工地 ID')

    const { openid, user } = await getCurrentUser()
    const allowed = await canManageProject(openid, user, projectId)
    if (!allowed) throw new Error('当前账号没有生成工长绑定码的权限')

    const projectRes = await db.collection('projects').doc(projectId).get()
    const project = projectRes.data
    if (!project) throw new Error('工地不存在')

    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const tenantName = user.tenantName || DEFAULT_TENANT_NAME
    if (!tenantMatches(project.tenantId, tenantId)) {
      throw new Error('当前账号无权生成该工地绑定码')
    }

    const now = Date.now()
    const activeCodesRes = await db.collection('worker_project_bind_codes')
      .where({ projectId, status: 'active', tenantId: tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId })
      .orderBy('expiresAt', 'desc')
      .limit(10)
      .get()
    await expireCodes(activeCodesRes.data, now)

    const code = await makeUniqueCode()
    const expiresAt = now + CODE_EXPIRES_IN
    const addRes = await db.collection('worker_project_bind_codes').add({
      data: {
        code,
        projectId,
        tenantId,
        tenantName,
        projectName: project.name || '',
        status: 'active',
        expiresAt,
        createdByOpenid: openid,
        createdByName: user.name || '',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })

    return {
      _id: addRes._id,
      code,
      expiresAt,
      projectId,
      projectName: project.name || ''
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '生成工长绑定码失败'
      }
    }
  }
}
