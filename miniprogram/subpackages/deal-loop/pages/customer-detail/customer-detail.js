const { getCustomerById } = require('../../mock/customers')
const { getFollowRecordsByCustomer } = require('../../mock/followRecords')
const { generateSuggestion } = require('../../utils/aiMockEngine')
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
  if (stage === 'signed') {
    return {
      judgement: '客户已成交，下一步重点是核对开工前资料。',
      actions: ['核对合同、地址和开工时间', '整理工地创建草案，等待人工确认', '提醒团队不要重复录入关键信息'],
      talk: '您好，我们先把合同信息、开工时间和房屋资料再核对一遍。我会先整理一份工地创建草案，确认无误后再进入下一步。',
      note: '内部参考，不创建真实工地'
    }
  }
  if (riskLevel === '高风险' || stage === 'hot_follow') {
    return {
      judgement: `客户当前顾虑是“${concern}”，需要先降低疑虑再推进。`,
      actions: ['先确认客户最担心的问题', '准备售后、工地管理或施工证据', '沟通后再判断是否推进签约'],
      talk: '您好，我这边根据您目前关注的点，先帮您整理了几个关键问题：施工过程怎么看、材料怎么确认、后期有没有保障。我们可以先把这些讲清楚，再决定下一步方案。',
      note: '内部参考，请人工判断后使用'
    }
  }
  if (stage === 'quoted' || stage === 'proposal') {
    return {
      judgement: '客户已进入方案或报价沟通，重点是解释差异和补充信任证据。',
      actions: ['24 小时内回访报价反馈', '说明方案差异和材料边界', '补充案例或工地证据'],
      talk: '您好，方案和报价您可以先重点看材料、施工项和后期保障这几块。我这边也可以把相近案例和工地证据整理给您，方便您对比判断。',
      note: '只读客户资料，不写入跟进记录'
    }
  }
  return {
    judgement: '客户仍在需求确认阶段，先把预算、房屋信息和下一次沟通时间问清楚。',
    actions: ['补齐需求、预算和房屋信息', '邀约到店、量房或方案沟通', '提前准备同风格案例'],
    talk: '您好，我先把您的装修需求、预算范围和房屋情况整理清楚，再给您安排下一步沟通。这样方案会更贴近您家里的实际情况。',
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
        title: '未找到客户资料，无法生成 AI 话术',
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
