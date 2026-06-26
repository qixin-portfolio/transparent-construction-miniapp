const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const INVITABLE_ROLES = ['worker', 'project_manager', 'designer', 'sales', 'boss_qi', 'boss_hu']
const STAFF_LIMIT_ROLES = ['manager', 'foreman', 'designer', 'worker', 'project_manager', 'sales']
const PLAN_MODULES = ['project', 'daily_report', 'owner_view']

const ROLE_LABELS = {
  worker: '工长',
  project_manager: '项目经理',
  designer: '设计师',
  sales: '销售',
  boss_qi: '老板（老齐）',
  boss_hu: '老板（老胡）'
}
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
    const code = String(event.code || '').replace(/\s/g, '').trim()
    if (!/^\d{6}$/.test(code)) throw new Error('请输入 6 位邀请码')

    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')

    // 查邀请码
    const codeRes = await db.collection('staff_invite_codes')
      .where({ code, status: 'active' })
      .limit(1)
      .get()
    const inviteCode = codeRes.data[0]
    if (!inviteCode) throw new Error('邀请码无效或已使用')

    if (inviteCode.expiresAt <= Date.now()) {
      await db.collection('staff_invite_codes').doc(inviteCode._id).update({
        data: { status: 'expired', updatedAt: db.serverDate() }
      })
      throw new Error('邀请码已过期，请联系管理员重新获取')
    }

    if (INVITABLE_ROLES.indexOf(inviteCode.role) === -1) {
      throw new Error('邀请码角色异常，请联系管理员')
    }

    // 已经是内部员工，不允许重复激活成更低权限角色（避免误操作降权）
    if (user.role && user.role !== 'owner' && user.role !== inviteCode.role) {
      throw new Error('你当前已是「' + (ROLE_LABELS[user.role] || user.role) + '」，如需变更角色请联系管理员')
    }
    if (user.role === inviteCode.role) {
      return {
        alreadyActivated: true,
        role: user.role,
        roleLabel: ROLE_LABELS[user.role] || user.role,
        message: '你已是该角色，无需重复激活'
      }
    }

    const now = db.serverDate()
    const tenantId = inviteCode.tenantId || user.tenantId || DEFAULT_TENANT_ID
    const tenantName = inviteCode.tenantName || user.tenantName || DEFAULT_TENANT_NAME

    if (STAFF_LIMIT_ROLES.indexOf(inviteCode.role) !== -1) {
      await assertStaffLimit(tenantId)
    }

    // 更新用户角色
    await db.collection('users').doc(user._id).update({
      data: {
        role: inviteCode.role,
        tenantId,
        tenantName,
        activatedAt: now,
        activatedByCode: code,
        updatedAt: now
      }
    })

    // 标记邀请码已使用
    await db.collection('staff_invite_codes').doc(inviteCode._id).update({
      data: {
        status: 'used',
        usedByOpenid: openid,
        usedByName: user.name || '',
        tenantId,
        tenantName,
        usedAt: now,
        updatedAt: now
      }
    })

    return {
      activated: true,
      role: inviteCode.role,
      roleLabel: ROLE_LABELS[inviteCode.role] || inviteCode.role,
      message: '角色激活成功，即将进入工作台'
    }
  } catch (error) {
    return {
      error: {
        code: error.code || '',
        message: error.message || '激活内部员工角色失败'
      }
    }
  }
}
