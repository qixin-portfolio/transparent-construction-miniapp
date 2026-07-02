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
