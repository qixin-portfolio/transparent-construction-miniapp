const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'
const ADMIN_ROLES = ['admin', 'boss_qi', 'boss_hu']

function tenantScope(tenantId) {
  return tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId
}

async function getAllowedCaller() {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) throw new Error('无法识别当前调用者')
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  const user = res.data[0] || null
  if (!user || ADMIN_ROLES.indexOf(user.role) === -1) {
    throw new Error('当前账号无权初始化客户权益')
  }
  return user
}

const BENEFITS = [
  {
    // 权益01：售后优先响应
    benefitType: '权益 01',
    title: '售后优先响应',
    description: '老客户报修24小时内优先响应、优先派单、优先上门。',
    rules: '同手机号仅推荐一次 / 已在客户库的不计入 / 内部员工不作被推荐人 / 客服人工确认有效线索',
    targetType: 'completed_owner',
    status: 'active',
    validFrom: null,
    validTo: null,
    sort: 1,
    highlight: false,
    tenantId: '',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    // 权益02：免费复检（高亮）
    benefitType: '权益 02',
    title: '免费复检',
    description: '每年1次免费上门复检（水电/防水/墙面），出具简易报告。',
    rules: '需提前3天预约，仅限已竣工项目地址',
    targetType: 'completed_owner',
    status: 'active',
    validFrom: null,
    validTo: null,
    sort: 2,
    highlight: true,
    tenantId: '',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    // 权益03：局改优惠
    benefitType: '权益 03',
    title: '局改优惠',
    description: '老客户二次装修或局部改造享专属折扣，低于市场价10%~15%。',
    rules: '仅限同一业主名下房产，不可转让',
    targetType: 'completed_owner',
    status: 'active',
    validFrom: null,
    validTo: null,
    sort: 3,
    highlight: false,
    tenantId: '',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    // 权益04：推荐有礼（三级即时激励）
    benefitType: '权益 04',
    title: '推荐有礼',
    description: '三级即时激励：邀友即得20元话费券 / 服务有礼100元服务券或现金红包 / 成交再得500-2000元按合同金额',
    rules: '同手机号仅推荐一次 / 已在客户库的不计入 / 内部员工不作被推荐人 / 客服人工确认有效线索',
    targetType: 'completed_owner',
    status: 'active',
    validFrom: null,
    validTo: null,
    sort: 4,
    highlight: false,
    tenantId: '',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

exports.main = async () => {
  try {
    const user = await getAllowedCaller()
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const tenantName = user.tenantName || DEFAULT_TENANT_NAME
    const now = db.serverDate()
    const results = []
    for (const benefit of BENEFITS) {
      const tenantBenefit = Object.assign({}, benefit, {
        tenantId,
        tenantName,
        updatedAt: now
      })
      // upsert by title to avoid duplicates on re-run
      const existing = await db.collection('customer_benefits')
        .where({ title: benefit.title, tenantId: tenantScope(tenantId) })
        .limit(1)
        .get()

      if (existing.data && existing.data.length > 0) {
        await db.collection('customer_benefits').doc(existing.data[0]._id).update({
          data: tenantBenefit
        })
        results.push({ action: 'updated', title: benefit.title, _id: existing.data[0]._id })
      } else {
        const res = await db.collection('customer_benefits').add({
          data: Object.assign({}, tenantBenefit, { createdAt: now })
        })
        results.push({ action: 'created', title: benefit.title, _id: res._id })
      }
    }

    return { success: true, count: results.length, results }
  } catch (error) {
    return { error: { message: error.message || '种子数据写入失败' } }
  }
}
