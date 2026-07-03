const { getCustomerById } = require('../../mock/customers')
const { getFollowRecordsByCustomer } = require('../../mock/followRecords')
const { generateSuggestion } = require('../../utils/aiMockEngine')
const { guardDealLoopPage } = require('../../utils/accessGuard')
const { getMaterialsByIds } = require('../../utils/materialMapper')
const { mapCustomerToDetail } = require('../../utils/v1ReadonlyAdapters')

const CUSTOMER_FEEDBACK_QUESTIONS = [
  '1. 这个客户当前最大的顾虑是什么？',
  '2. 下一步应该约沟通、补资料，还是推进签约？',
  '3. 需要给客户看哪些工地证据或案例？',
  '4. 当前建议有没有误导或看不懂的地方？'
]

function makeNextActionCard(customer) {
  const stage = customer && customer.pipelineStage
  const riskLevel = customer && customer.riskLevel
  const concern = (customer && customer.concern) || '客户顾虑待确认'
  const need = (customer && customer.need) || '装修需求待确认'
  const budget = (customer && customer.budgetRange) || '预算待确认'
  const area = (customer && customer.area) || '房屋情况待确认'
  if (stage === 'signed') {
    return {
      judgement: `客户已签约，当前重点是把${area}、业主信息和开工前资料核对清楚，先形成内部草案。`,
      actions: ['核对业主信息、房屋信息和开工时间', '整理工地创建草案，等待人工确认', '同步施工阶段和关键节点口径'],
      talk: '接下来我会先帮您整理开工前的信息，后面工地进度、现场照片和关键节点都会尽量做到有记录、有确认，方便您随时查看。',
      note: '内部参考，只整理草案，不创建真实工地'
    }
  }
  if (riskLevel === '高风险' || stage === 'hot_follow') {
    return {
      judgement: `客户已经接近关键决策，但当前顾虑是“${concern}”，应先把信任问题讲清楚，再判断是否推进签约。`,
      actions: ['先确认客户最担心的问题', '准备 1 个相似案例或工地过程说明', '用简短话术邀约客户继续沟通'],
      talk: '您担心施工过程和材料是否透明，这个很正常。我们现在可以把施工节点、现场照片、材料确认和后期保障都留痕，让您不用天天跑工地也能看到过程。',
      note: '内部参考，请人工判断后使用'
    }
  }
  if (stage === 'quoted' || stage === 'proposal') {
    return {
      judgement: `客户已进入方案或报价沟通，预算信息为“${budget}”，重点不是催决定，而是拆清价格、材料和方案取舍。`,
      actions: ['24 小时内回访报价反馈', '把价格、材料和施工项拆开讲清楚', '补充同类案例或工地证据'],
      talk: '您好，上次给您看的方案和报价，您可以重点看看有没有哪个地方不清楚。价格、材料、施工过程这几个点，我都可以给您拆开讲清楚，您不用急着做决定。',
      note: '只读客户资料，不写入跟进记录'
    }
  }
  if (stage === 'measured' || stage === 'contacted') {
    return {
      judgement: `客户已建立初步沟通，当前需求是“${need}”，下一步要把方案期待、预算范围和沟通时间对齐。`,
      actions: ['确认客户最在意效果、预算还是施工过程', '准备 1 个相似风格案例', '约定下一次方案沟通时间'],
      talk: '您好，我先不急着给您报一个大概价，想先把房屋情况、预算范围和您最在意的点确认清楚，这样后面方案和报价会更准。',
      note: '内部参考，不写入跟进记录'
    }
  }
  return {
    judgement: `客户仍在需求确认阶段，当前房屋和预算信息还需要补齐，先确认真实需求，再考虑方案和报价。`,
    actions: ['补齐房屋情况、预算范围和装修时间', '确认客户最担心的问题', '再决定是否邀约到店、量房或方案沟通'],
    talk: '您好，我先不急着给您报一个大概价，想先把房屋情况、预算范围和您最在意的点确认清楚，这样后面方案和报价会更准。',
    note: '示例建议，不调用真实 AI'
  }
}

function normalizeCustomerId(value) {
  return String(value || '').trim()
}

function getCustomerIdFromContext(customer, pageData) {
  const source = customer || {}
  const data = pageData || {}
  return normalizeCustomerId(
    source.customerId ||
    source.id ||
    source._id ||
    data.customerId ||
    data.id ||
    ''
  )
}

function buildMockDetail(id) {
  const customer = getCustomerById(id)
  if (!customer) {
    return {
      customer: null,
      followRecords: [],
      suggestion: null,
      materials: [],
      dataSourceLabel: '示例内容',
      dataSourceClass: 'mock',
      dataSourceHint: '未从客户列表进入，当前展示示例内容。'
    }
  }
  const mapped = mapCustomerToDetail(customer)
  const followRecords = getFollowRecordsByCustomer(mapped.customerId)
  const suggestion = generateSuggestion(mapped)
  return {
    customer: mapped,
    followRecords: Array.isArray(followRecords) ? followRecords : [],
    suggestion,
    materials: getMaterialsByIds(suggestion.recommendedMaterialIds),
    nextActionCard: makeNextActionCard(mapped),
    dataSourceLabel: '示例内容',
    dataSourceClass: 'mock',
    dataSourceHint: '当前展示本地示例内容，仅供内部参考。'
  }
}

Page({
  data: {
    customer: null,
    followRecords: [],
    suggestion: null,
    materials: [],
    nextActionCard: null,
    loading: true,
    customerId: '',
    id: '',
    dataSourceLabel: '示例内容',
    dataSourceClass: 'mock',
    dataSourceHint: '正在只读加载客户资料',
    guards: [],
    showGuards: false,
    feedbackQuestions: CUSTOMER_FEEDBACK_QUESTIONS,
    followupReviewTips: [
      '先确认客户顾虑',
      '再判断下一步动作',
      '补充信任材料后再推进',
      '请人工判断后使用'
    ]
  },
  onLoad(options = {}) {
    if (!guardDealLoopPage()) return
    wx.setNavigationBarTitle({ title: '客户成交详情' })
    const customerId = String(options.customerId || options.id || '').trim()
    this.setData({
      guards: this.makeReadonlyGuards(),
      customerId,
      id: customerId
    })
    if (!customerId) {
      const fallback = buildMockDetail('')
      this.setData({
        ...fallback,
        loading: false
      })
      return
    }
    this.setData({
      dataSourceLabel: '只读客户资料',
      dataSourceClass: 'mock',
      dataSourceHint: '正在只读加载客户资料'
    })
    wx.cloud.callFunction({
      name: 'getCustomer',
      data: { customerId }
    })
      .then((res) => {
        const result = res.result || {}
        if (result.error) {
          throw new Error('客户资料读取失败')
        }
        const customer = result.customer
        if (!customer || customer.deleted === true) {
          throw new Error('客户不存在或已删除')
        }
        const mapped = mapCustomerToDetail(customer)
        const followRecords = getFollowRecordsByCustomer(mapped.customerId)
        const suggestion = generateSuggestion(mapped)
        const materials = getMaterialsByIds(suggestion.recommendedMaterialIds)
        this.setData({
          customer: mapped,
          followRecords: Array.isArray(followRecords) ? followRecords : [],
          suggestion,
          materials,
          nextActionCard: makeNextActionCard(mapped),
          dataSourceLabel: '只读客户资料',
          dataSourceClass: 'real',
          dataSourceHint: '仅用于内部成交跟进，未修改任何数据。',
          loading: false
        })
      })
      .catch((error) => {
        const fallback = buildMockDetail(customerId)
        this.setData({
          ...fallback,
          dataSourceLabel: '示例内容',
          dataSourceHint: '客户资料暂时读取失败，当前展示示例内容。'
        })
      })
  },
  makeReadonlyGuards() {
    return [
      'V2 试验功能，只读资料',
      '仅读取客户资料',
      '仅用于内部成交跟进',
      '不修改客户数据',
      '不创建跟进记录',
      '复制话术仅复制到剪贴板',
      '不会自动发送',
      '不调用真实 AI',
      '不创建真实工地',
      '不自动发布内容',
      '不影响 V1'
    ]
  },
  toggleGuards() {
    this.setData({ showGuards: !this.data.showGuards })
  },
  copyCustomerFeedbackQuestions() {
    const customerName = this.data.customer && this.data.customer.name ? this.data.customer.name : '当前客户'
    wx.setClipboardData({
      data: [
        `成交跟进复盘：${customerName}`,
        '进入客户详情后，先确认顾虑、下一步动作和需要补充的信任材料。',
        ...CUSTOMER_FEEDBACK_QUESTIONS
      ].join('\n'),
      success: () => {
        wx.showToast({
          title: '已复制反馈问题',
          icon: 'none'
        })
      }
    })
  },
  copyNextActionTalk() {
    const card = this.data.nextActionCard || {}
    const customerName = this.data.customer && this.data.customer.name ? this.data.customer.name : '当前客户'
    wx.setClipboardData({
      data: [
        `跟进话术：${customerName}`,
        card.talk || '请先确认客户顾虑，再人工判断下一步跟进方式。'
      ].join('\n'),
      success: () => {
        wx.showToast({
          title: '已复制跟进话术',
          icon: 'none'
        })
      }
    })
  },
  goAssistant() {
    const customerId = getCustomerIdFromContext(this.data.customer, this.data)
    if (!customerId) {
      wx.showToast({
        title: '未找到客户资料，无法查看话术建议',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: `/subpackages/deal-loop/pages/ai-assistant/ai-assistant?customerId=${encodeURIComponent(customerId)}`
    })
  },
  goMaterials() {
    const customerId = getCustomerIdFromContext(this.data.customer, this.data)
    if (!customerId) {
      wx.showToast({
        title: '未找到客户资料，无法推荐素材',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: `/subpackages/deal-loop/pages/trust-materials/trust-materials?customerId=${encodeURIComponent(customerId)}`
    })
  },
  goContractDraft() {
    const customerId = getCustomerIdFromContext(this.data.customer, this.data)
    if (!customerId) {
      wx.showToast({
        title: '未找到客户资料，无法生成工地草案',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: `/subpackages/deal-loop/pages/contract-to-project/contract-to-project?customerId=${encodeURIComponent(customerId)}`
    })
  }
})
