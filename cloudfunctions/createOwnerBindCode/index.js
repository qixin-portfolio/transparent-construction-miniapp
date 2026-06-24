const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const FULL_PROJECT_ROLES = ['admin', 'boss_qi', 'boss_hu']
const BIND_CODE_ROLES = FULL_PROJECT_ROLES.concat(['designer', 'sales'])
const CODE_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000
const MAX_OWNERS = 2  // 一个工地最多 2 个业主（夫妻各一个）
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'

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
    const existing = await db.collection('owner_bind_codes')
      .where({ code, status: 'active' })
      .limit(1)
      .get()
    if (!existing.data.length) return code
  }
  throw new Error('绑定码生成失败，请稍后再试')
}

function normalizeOwners(project) {
  const openids = Array.isArray(project.ownerOpenids)
    ? project.ownerOpenids.filter(Boolean)
    : []
  if (!openids.length && project.ownerOpenid) {
    openids.push(project.ownerOpenid)
  }
  return Array.from(new Set(openids))
}

async function expireCodes(codes, now) {
  const tasks = codes
    .filter((item) => item.expiresAt <= now)
    .map((item) => db.collection('owner_bind_codes').doc(item._id).update({
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
    if (!allowed) throw new Error('当前账号没有生成绑定码的权限')

    const projectRes = await db.collection('projects').doc(projectId).get()
    const project = projectRes.data
    if (!project) throw new Error('工地不存在')
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const tenantName = user.tenantName || DEFAULT_TENANT_NAME
    if (project.tenantId && project.tenantId !== tenantId) {
      throw new Error('当前账号无权生成该工地绑定码')
    }

    const now = Date.now()
    const ownerOpenids = normalizeOwners(project)
    const availableSlots = MAX_OWNERS - ownerOpenids.length

    if (availableSlots <= 0) {
      throw new Error(`该工地已绑定 ${MAX_OWNERS} 位业主，无需再生成绑定码`)
    }

    // 查询该工地所有 active 绑定码
    const activeCodesRes = await db.collection('owner_bind_codes')
      .where({ projectId, status: 'active', tenantId: _.in([tenantId, '', null]) })
      .orderBy('expiresAt', 'desc')
      .limit(20)
      .get()
    await expireCodes(activeCodesRes.data, now)

    const validActiveCodes = activeCodesRes.data
      .filter((item) => item.expiresAt > now)
      .slice(0, availableSlots)
      .map((item) => ({
        code: item.code,
        expiresAt: item.expiresAt,
        usedByOpenid: item.usedByOpenid || ''
      }))

    const codes = validActiveCodes.slice()
    while (codes.length < availableSlots) {
      const code = await makeUniqueCode()
      const expiresAt = now + CODE_EXPIRES_IN
      await db.collection('owner_bind_codes').add({
        data: {
          code,
          projectId,
          tenantId,
          tenantName,
          projectName: project.name || '',
          status: 'active',
          expiresAt,
          createdByOpenid: openid,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      })
      codes.push({ code, expiresAt, usedByOpenid: '' })
    }

    return {
      code: codes[0] ? codes[0].code : '',
      codes,
      expiresAt: codes[0] ? codes[0].expiresAt : 0,
      projectId,
      projectName: project.name || '',
      ownerCount: ownerOpenids.length,
      activeCount: codes.length,
      availableSlots,
      maxOwners: MAX_OWNERS
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '生成业主绑定码失败'
      }
    }
  }
}
