const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const CUSTOMER_ROLES = ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales', 'owner']
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
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const tenantName = user.tenantName || DEFAULT_TENANT_NAME

    const name = String(event.name || '').trim()
    const phone = String(event.phone || '').trim()
    if (!name) throw new Error('客户姓名不能为空')
    if (phone && !/^1\d{10}$/.test(phone)) throw new Error('手机号格式不正确')

    if (phone) {
      const duplicated = await db.collection('customers')
        .where({ phone, tenantId: tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId, deleted: _.neq(true) })
        .limit(1)
        .get()
      if (duplicated.data.length) {
        // 重复预约不报错，直接返回已有记录 ID，前端显示「已预约过」
        return { id: duplicated.data[0]._id, duplicated: true }
      }
    }

    const now = db.serverDate()
    const stage = String(event.stage || '咨询').trim()
    const dealStatus = String(event.dealStatus || '未成交').trim()
    const data = {
      name,
      phone,
      tenantId,
      tenantName,
      source: String(event.source || '').trim(),
      address: String(event.address || '').trim(),
      need: String(event.need || '').trim(),
      stage,
      dealStatus,
      lifecycleStatus: getCustomerLifecycleStatus({ lifecycleStatus: event.lifecycleStatus, stage, dealStatus }),
      ownerOpenid: openid,
      createdByOpenid: openid,
      createdBy: user._id || openid,
      updatedByOpenid: openid,
      updatedBy: user._id || openid,
      deleted: false,
      createdAt: now,
      updatedAt: now
    }

    const res = await db.collection('customers').add({ data })
    return { id: res._id }
  } catch (error) {
    return {
      error: {
        message: error.message || '新增客户失败'
      }
    }
  }
}
