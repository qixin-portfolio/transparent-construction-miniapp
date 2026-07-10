const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const ADMIN_ROLES = ['admin', 'boss_qi', 'boss_hu', 'platform_admin', 'super_admin']
const PLATFORM_ADMIN_ROLES = ['platform_admin', 'super_admin']
const VALID_PLANS = ['free', 'starter', 'pro', 'enterprise']
const VALID_STATUSES = ['trial', 'active', 'expired', 'disabled', 'suspended', 'cancelled']
const VALID_MODULES = ['project', 'daily_report', 'owner_view']

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  const user = res.data[0] || null
  return { openid: OPENID, user }
}

function cleanText(value) {
  return String(value || '').trim()
}

exports.main = async (event) => {
  try {
    const { OPENID } = cloud.getWXContext()
    const { user } = await getCurrentUser()

    // 权限校验
    if (!user) {
      return { success: false, message: '未找到用户信息' }
    }
    if (ADMIN_ROLES.indexOf(user.role) === -1) {
      return { success: false, message: '无权限执行此操作' }
    }

    const { plan, status, maxProjects, maxStaff, enabledModules, startAt, endAt, note } = event
    const requestedTenantId = cleanText(event.tenantId)
    const tenantId = requestedTenantId || cleanText(user.tenantId)

    // 参数校验
    if (!tenantId) {
      return { success: false, message: 'tenantId 不能为空' }
    }
    if (PLATFORM_ADMIN_ROLES.indexOf(user.role) === -1 && tenantId !== user.tenantId) {
      return { success: false, code: 'CROSS_TENANT_FORBIDDEN', message: '无权修改其他企业套餐' }
    }

    if (plan && VALID_PLANS.indexOf(plan) === -1) {
      return { success: false, message: `无效套餐类型，支持: ${VALID_PLANS.join(', ')}` }
    }

    if (status && VALID_STATUSES.indexOf(status) === -1) {
      return { success: false, message: `无效套餐状态，支持: ${VALID_STATUSES.join(', ')}` }
    }

    // 校验 tenantId 是否存在
    let tenant = null
    try {
      const tenantRes = await db.collection('tenants').doc(tenantId).get()
      tenant = tenantRes.data || null
    } catch (_) {
      return { success: false, message: '租户不存在' }
    }

    const now = new Date()

    // 构建 subscriptions 更新数据
    const subData = {
      tenantId,
      tenantName: tenant.tenantName || tenant.name || '',
      updatedAt: now,
      updatedByOpenid: OPENID
    }

    if (plan) subData.plan = plan
    if (status) subData.status = status
    if (maxProjects != null) subData.maxProjects = Number(maxProjects)
    if (maxStaff != null) subData.maxStaff = Number(maxStaff)
    if (enabledModules) {
      // 只保留有效模块
      const filtered = enabledModules.filter((m) => VALID_MODULES.indexOf(m) !== -1)
      if (filtered.length) subData.enabledModules = filtered
    }
    if (startAt) subData.startAt = new Date(startAt)
    if (endAt) subData.endAt = new Date(endAt)
    if (note) subData.note = cleanText(note)

    // 同步更新 tenants
    const tenantData = {
      updatedAt: now
    }
    if (plan) tenantData.plan = plan
    if (status) tenantData.status = status
    if (maxProjects != null) tenantData.maxProjects = Number(maxProjects)
    if (maxStaff != null) tenantData.maxStaff = Number(maxStaff)
    if (enabledModules) {
      const filtered = enabledModules.filter((m) => VALID_MODULES.indexOf(m) !== -1)
      if (filtered.length) tenantData.enabledModules = filtered
    }

    // 检查 subscriptions 是否存在
    let existingSub = null
    try {
      const subRes = await db.collection('subscriptions').doc(tenantId).get()
      existingSub = subRes.data || null
    } catch (_) {
      // 不存在
    }

    if (existingSub) {
      await db.collection('subscriptions').doc(tenantId).update({ data: subData })
    } else {
      subData.createdAt = now
      await db.collection('subscriptions').doc(tenantId).set({ data: subData })
    }

    // 同步 tenants
    await db.collection('tenants').doc(tenantId).update({ data: tenantData })

    // 返回最终结果
    const effectivePlan = plan || (existingSub && existingSub.plan) || tenant.plan || 'free'
    const effectiveStatus = status || (existingSub && existingSub.status) || tenant.status || 'trial'
    const effectiveMaxProjects = maxProjects != null ? Number(maxProjects) : (existingSub && existingSub.maxProjects) || tenant.maxProjects || 3
    const effectiveMaxStaff = maxStaff != null ? Number(maxStaff) : (existingSub && existingSub.maxStaff) || tenant.maxStaff || 3

    return {
      success: true,
      tenantId,
      plan: effectivePlan,
      status: effectiveStatus,
      maxProjects: effectiveMaxProjects,
      maxStaff: effectiveMaxStaff,
      message: '套餐已更新'
    }
  } catch (error) {
    return {
      success: false,
      message: error.message || '更新套餐失败'
    }
  }
}
