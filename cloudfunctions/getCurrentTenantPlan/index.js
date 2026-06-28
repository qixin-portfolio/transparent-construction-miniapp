const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const DEFAULT_TENANT_ID = 'tenant_shengjing_default'

const PLAN_NAMES = {
  free: '免费试用版',
  starter: '基础版',
  pro: '专业版',
  enterprise: '企业版'
}

const STATUS_TEXTS = {
  trial: '试用中',
  active: '已开通',
  expired: '已过期',
  disabled: '已停用',
  suspended: '已暂停',
  cancelled: '已取消'
}

const DEFAULT_PLAN = {
  plan: 'free',
  status: 'trial',
  maxProjects: 3,
  maxStaff: 3,
  enabledModules: ['project', 'daily_report', 'owner_view']
}

// 不计入员工数的角色
const NON_STAFF_ROLES = ['admin', 'boss_qi', 'boss_hu', 'owner']
// 计入员工数的角色
const STAFF_ROLES = ['worker', 'designer', 'sales', 'project_manager', 'manager', 'foreman']

function toTime(value) {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  if (value.$date && value.$date.$numberLong) return new Date(Number(value.$date.$numberLong)).toISOString()
  if (value.$numberLong) return new Date(Number(value.$numberLong)).toISOString()
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : new Date(value).toISOString()
}

function normalizeLimit(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : fallback
}

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  const user = res.data[0] || null
  if (user && !user.tenantId) {
    user.tenantId = DEFAULT_TENANT_ID
  }
  return { openid: OPENID, user }
}

exports.main = async () => {
  try {
    const { user } = await getCurrentUser()
    if (!user || !user.tenantId) {
      return { success: false, message: '用户未注册租户' }
    }

    const tenantId = user.tenantId

    // 查询 subscriptions
    let sub = null
    try {
      const subRes = await db.collection('subscriptions').doc(tenantId).get()
      sub = subRes.data || null
    } catch (_) {
      // subscriptions 不存在
    }

    // 查询 tenants 作为 fallback
    let tenant = null
    try {
      const tenantRes = await db.collection('tenants').doc(tenantId).get()
      tenant = tenantRes.data || null
    } catch (_) {
      // tenants 不存在
    }

    // 合并套餐信息，优先级 subscriptions > tenants > 默认
    const plan = sub && sub.plan ? sub.plan : (tenant && tenant.plan) || DEFAULT_PLAN.plan
    const status = sub && sub.status ? sub.status : (tenant && tenant.status) || DEFAULT_PLAN.status
    const maxProjects = normalizeLimit(
      sub && sub.maxProjects != null ? sub.maxProjects : (tenant && tenant.maxProjects),
      DEFAULT_PLAN.maxProjects
    )
    const maxStaff = normalizeLimit(
      sub && sub.maxStaff != null ? sub.maxStaff : (tenant && tenant.maxStaff),
      DEFAULT_PLAN.maxStaff
    )
    const enabledModules = (sub && sub.enabledModules) || (tenant && tenant.enabledModules) || DEFAULT_PLAN.enabledModules
    const startAt = toTime(sub && sub.startAt) || toTime(tenant && tenant.createdAt) || null
    const endAt = toTime(sub && sub.endAt) || null

    // 统计已用项目数
    const usedProjectsRes = await db.collection('projects')
      .where(_.and([
        { tenantId },
        { deleted: _.neq(true) }
      ]))
      .count()
    const usedProjects = usedProjectsRes.total || 0

    // 统计已用员工数
    const usedStaffRes = await db.collection('users')
      .where(_.and([
        { tenantId },
        { role: _.in(STAFF_ROLES) },
        { status: 'active' }
      ]))
      .count()
    const usedStaff = usedStaffRes.total || 0

    // 计算百分比
    const projectPercent = maxProjects > 0 ? Math.min(Math.round((usedProjects / maxProjects) * 100), 100) : 0
    const staffPercent = maxStaff > 0 ? Math.min(Math.round((usedStaff / maxStaff) * 100), 100) : 0

    const isProjectNearLimit = maxProjects > 0 && usedProjects >= maxProjects - 1
    const isStaffNearLimit = maxStaff > 0 && usedStaff >= maxStaff - 1
    const isProjectAtLimit = maxProjects > 0 && usedProjects >= maxProjects
    const isStaffAtLimit = maxStaff > 0 && usedStaff >= maxStaff

    // 生成提示文案
    let limitMessage = ''
    const isNearLimit = isProjectNearLimit || isStaffNearLimit
    const isAtLimit = isProjectAtLimit || isStaffAtLimit
    if (isAtLimit) {
      limitMessage = '当前套餐额度已用完，请联系服务顾问升级套餐。'
    } else if (isNearLimit) {
      limitMessage = '额度快用完了，如需增加项目或员工，请联系服务顾问升级套餐。'
    }

    return {
      success: true,
      tenantId,
      plan,
      planName: PLAN_NAMES[plan] || plan,
      status,
      statusText: STATUS_TEXTS[status] || status,
      maxProjects,
      maxStaff,
      usedProjects,
      usedStaff,
      enabledModules,
      startAt,
      endAt,
      projectPercent,
      staffPercent,
      isProjectNearLimit,
      isStaffNearLimit,
      isProjectAtLimit,
      isStaffAtLimit,
      limitMessage
    }
  } catch (error) {
    return {
      success: false,
      message: error.message || '获取套餐信息失败'
    }
  }
}
