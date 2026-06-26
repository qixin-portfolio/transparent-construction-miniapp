const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

// 可以被邀请码激活的内部角色
const INVITABLE_ROLES = ['worker', 'project_manager', 'designer', 'sales', 'boss_qi', 'boss_hu']
// 有权生成邀请码的管理角色
const MANAGE_ROLES = ['admin', 'boss_qi', 'boss_hu']
const CODE_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'
const PLAN_MODULES = ['project', 'daily_report', 'owner_view']
const STAFF_LIMIT_ROLES = ['manager', 'foreman', 'designer', 'worker', 'project_manager', 'sales']

const ROLE_LABELS = {
  worker: '工长',
  project_manager: '项目经理',
  designer: '设计师',
  sales: '销售',
  boss_qi: '老板（老齐）',
  boss_hu: '老板（老胡）'
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

function makeCode() {
  return String(crypto.randomInt(100000, 1000000))
}

async function makeUniqueCode() {
  for (let i = 0; i < 12; i += 1) {
    const code = makeCode()
    const existing = await db.collection('staff_invite_codes')
      .where({ code, status: 'active' })
      .limit(1)
      .get()
    if (!existing.data.length) return code
  }
  throw new Error('邀请码生成失败，请稍后再试')
}

function normalizeLimit(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}

async function getOptionalDoc(collectionName, id) {
  try {
    const res = await db.collection(collectionName).doc(id).get()
    return res.data || null
  } catch (_) {
    return null
  }
}

function isActivePlan(plan) {
  const status = plan && (plan.status || plan.subscriptionStatus)
  return !status || ['trial', 'active'].indexOf(status) !== -1
}

async function getTenantPlan(tenantId) {
  const subRes = await db.collection('subscriptions')
    .where({
      tenantId,
      status: _.in(['trial', 'active'])
    })
    .limit(1)
    .get()
    .catch(() => ({ data: [] }))

  let source = subRes.data[0] || null
  if (!source) {
    const subscription = await getOptionalDoc('subscriptions', tenantId)
    if (subscription && isActivePlan(subscription)) source = subscription
  }

  if (!source) {
    const tenant = await getOptionalDoc('tenants', tenantId)
    source = tenant || {}
  }

  return {
    plan: source.plan || source.subscriptionPlan || 'free',
    status: source.status || source.subscriptionStatus || 'trial',
    maxProjects: normalizeLimit(source.maxProjects, 3),
    maxStaff: normalizeLimit(source.maxStaff || source.maxUsers, 3),
    enabledModules: source.enabledModules || PLAN_MODULES
  }
}

function staffTenantWhere(tenantId) {
  if (tenantId === DEFAULT_TENANT_ID) {
    return _.in([tenantId, '', null])
  }
  return tenantId
}

function createPlanLimitError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

async function assertStaffLimit(tenantId) {
  const plan = await getTenantPlan(tenantId)
  const countRes = await db.collection('users')
    .where({
      tenantId: staffTenantWhere(tenantId),
      status: 'active',
      role: _.in(STAFF_LIMIT_ROLES)
    })
    .count()
  const currentCount = countRes.total || 0
  if (currentCount >= plan.maxStaff) {
    throw createPlanLimitError(
      'PLAN_STAFF_LIMIT_REACHED',
      `当前套餐最多可添加 ${plan.maxStaff} 名员工，请升级套餐后继续添加`
    )
  }
  return plan
}

exports.main = async (event) => {
  try {
    const role = String(event.role || '').trim()
    const remark = String(event.remark || '').trim().slice(0, 50)

    if (INVITABLE_ROLES.indexOf(role) === -1) {
      throw new Error('不支持的角色，可选：' + INVITABLE_ROLES.map((r) => ROLE_LABELS[r] || r).join(' / '))
    }

    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    if (MANAGE_ROLES.indexOf(user.role) === -1) {
      throw new Error('仅管理员可生成内部员工邀请码')
    }
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const tenantName = user.tenantName || DEFAULT_TENANT_NAME

    if (STAFF_LIMIT_ROLES.indexOf(role) !== -1) {
      await assertStaffLimit(tenantId)
    }

    const now = Date.now()
    // 同一角色若有未过期的有效邀请码，直接复用返回
    const activeRes = await db.collection('staff_invite_codes')
      .where({ role, tenantId: _.in([tenantId, '', null]), status: 'active', expiresAt: _.gt(now) })
      .orderBy('expiresAt', 'desc')
      .limit(1)
      .get()
    const activeCode = activeRes.data[0]
    if (activeCode) {
      return {
        code: activeCode.code,
        role,
        roleLabel: ROLE_LABELS[role] || role,
        remark: activeCode.remark || '',
        expiresAt: activeCode.expiresAt,
        createdAt: activeCode.createdAt
      }
    }

    const code = await makeUniqueCode()
    const expiresAt = now + CODE_EXPIRES_IN
    const addRes = await db.collection('staff_invite_codes').add({
      data: {
        code,
        tenantId,
        tenantName,
        role,
        roleLabel: ROLE_LABELS[role] || role,
        remark,
        status: 'active',
        expiresAt,
        createdByOpenid: openid,
        createdByName: user.name || '',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })

    return {
      code,
      role,
      roleLabel: ROLE_LABELS[role] || role,
      remark,
      expiresAt,
      _id: addRes._id
    }
  } catch (error) {
    return {
      error: {
        code: error.code || '',
        message: error.message || '生成内部员工邀请码失败'
      }
    }
  }
}
