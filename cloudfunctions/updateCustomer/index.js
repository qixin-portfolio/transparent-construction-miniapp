const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const CUSTOMER_ROLES = ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales']
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'
const CUSTOMER_LIFECYCLE_CODES = ['lead', 'consulting', 'measured', 'quoted', 'signed', 'in_construction', 'delivered', 'lost']

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

function assertRole(user, roles) {
  if (!user || roles.indexOf(user.role) === -1) {
    throw new Error('当前账号没有操作客户库的权限')
  }
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key)
}

function getCustomerLifecycleStatus(customer) {
  const lifecycleStatus = String((customer && customer.lifecycleStatus) || '').trim()
  if (CUSTOMER_LIFECYCLE_CODES.indexOf(lifecycleStatus) !== -1) return lifecycleStatus

  const dealStatus = String((customer && customer.dealStatus) || '').trim()
  const stage = String((customer && customer.stage) || '').trim()
  if (dealStatus === '已流失') return 'lost'
  if (dealStatus === '已成交' || stage === '已签单') return 'signed'
  if (['准备签单', '已报价', '已出图'].indexOf(stage) !== -1) return 'quoted'
  if (stage === '已量房') return 'measured'
  return 'consulting'
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    assertRole(user, CUSTOMER_ROLES)

    const customerId = String(event.customerId || event.id || '').trim()
    if (!customerId) throw new Error('缺少客户 ID')

    // 先查客户，确认权限
    const existing = await db.collection('customers').doc(customerId).get()
    const customer = existing.data
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const tenantName = user.tenantName || DEFAULT_TENANT_NAME
    if (customer.tenantId && customer.tenantId !== tenantId) {
      throw new Error('无权修改该客户')
    }

    const ALL_CUSTOMER_ROLES = ['admin', 'boss_qi', 'boss_hu']
    if (ALL_CUSTOMER_ROLES.indexOf(user.role) === -1 && customer.ownerOpenid !== openid) {
      throw new Error('无权修改该客户')
    }

    // 校验手机号
    const phone = String(event.phone || '').trim()
    if (phone && !/^1\d{10}$/.test(phone)) throw new Error('手机号格式不正确')

    // 手机号查重（排除自己）
    if (phone) {
      const duplicated = await db.collection('customers')
        .where({ phone, tenantId: _.in([tenantId, '', null]), _id: _.neq(customerId), deleted: _.neq(true) })
        .limit(1)
        .get()
      if (duplicated.data.length) {
        throw new Error('该手机号已被其他客户使用')
      }
    }

    const now = db.serverDate()
    const stage = String(event.stage || customer.stage || '咨询').trim()
    const dealStatus = String(event.dealStatus || customer.dealStatus || '未成交').trim()
    const explicitLifecycleStatus = String(event.lifecycleStatus || '').trim()
    const lifecycleStatus = hasOwn(event, 'lifecycleStatus') && CUSTOMER_LIFECYCLE_CODES.indexOf(explicitLifecycleStatus) !== -1
      ? explicitLifecycleStatus
      : (customer.lifecycleStatus === 'delivered'
        ? 'delivered'
        : getCustomerLifecycleStatus({ stage, dealStatus }))
    const updateData = {
      name: String(event.name || customer.name || '').trim(),
      phone,
      tenantId,
      tenantName,
      source: String(event.source || customer.source || '').trim(),
      address: String(event.address || customer.address || '').trim(),
      need: String(event.need || customer.need || '').trim(),
      stage,
      dealStatus,
      lifecycleStatus,
      updatedByOpenid: openid,
      updatedBy: user._id || openid,
      updatedAt: now
    }

    await db.collection('customers').doc(customerId).update({ data: updateData })

    return { id: customerId }
  } catch (error) {
    return {
      error: {
        message: error.message || '更新客户失败'
      }
    }
  }
}
