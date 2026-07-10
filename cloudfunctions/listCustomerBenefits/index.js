const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'

// 数据库为空时的默认权益（V1.3 老友会权益体系）
const FALLBACK_BENEFITS = [
  {
    benefitType: '权益 01',
    title: '售后优先响应',
    description: '老客户报修24小时内优先响应、优先派单、优先上门。',
    rules: '老客户报修优先响应',
    targetType: 'completed_owner',
    sort: 1,
    highlight: false
  },
  {
    benefitType: '权益 02',
    title: '免费复检',
    description: '每年1次免费上门复检（水电/防水/墙面），出具简易报告。',
    rules: '需提前3天预约，仅限已竣工项目地址',
    targetType: 'completed_owner',
    sort: 2,
    highlight: true
  },
  {
    benefitType: '权益 03',
    title: '局改优惠',
    description: '老客户二次装修或局部改造享专属折扣，低于市场价10%~15%。',
    rules: '仅限同一业主名下房产，不可转让',
    targetType: 'completed_owner',
    sort: 3,
    highlight: false
  },
  {
    benefitType: '权益 04',
    title: '推荐有礼',
    description: '三级即时激励：邀友即得20元话费券 / 服务有礼100元服务券或现金红包 / 成交再得500-2000元按合同金额',
    rules: '同手机号仅推荐一次 / 已在客户库的不计入 / 内部员工不作被推荐人 / 客服人工确认有效线索',
    targetType: 'completed_owner',
    sort: 4,
    highlight: false
  }
]

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

exports.main = async (event) => {
  try {
    const { user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const projectId = String(event.projectId || '').trim()
    const ownerId = user._id || ''

    const res = await db.collection('customer_benefits')
      .where({ tenantId: tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId, status: 'active' })
      .orderBy('updatedAt', 'desc')
      .limit(100)
      .get()
    let items = (res.data || []).filter((item) => {
      const target = item.targetType || 'all'
      if (target === 'all' || target === 'completed_owner') return true
      if (target === 'project') return (item.projectIds || []).indexOf(projectId) !== -1
      if (target === 'owner') return (item.ownerIds || []).indexOf(ownerId) !== -1
      return false
    })

    // 数据库没有权益数据时，返回默认权益（V1.2 老友会体系）
    if (!items.length) {
      items = FALLBACK_BENEFITS
    }

    return { items }
  } catch (error) {
    return { error: { message: error.message || '获取老客户权益失败' } }
  }
}
