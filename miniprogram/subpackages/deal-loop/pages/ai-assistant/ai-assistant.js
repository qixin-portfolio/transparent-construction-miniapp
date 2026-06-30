const { getCustomerById } = require('../../mock/customers')
const { generateSuggestion } = require('../../utils/aiMockEngine')
const { getPhase2Guards } = require('../../utils/riskGuards')
const { mapCustomerToDetail } = require('../../utils/v1ReadonlyAdapters')

function buildMockSuggestion(customer) {
  const mapped = customer ? mapCustomerToDetail(customer) : null
  return {
    customer: mapped,
    suggestion: generateSuggestion(mapped || customer),
    dataSourceLabel: 'Mock fallback',
    dataSourceClass: 'mock',
    dataSourceHint: '未调用真实客户详情，已使用本地 mock。'
  }
}

Page({
  data: {
    customers: [],
    selectedIndex: 0,
    customer: null,
    suggestion: null,
    guards: [],
    showGuards: false,
    loading: true,
    dataSourceLabel: 'Mock fallback',
    dataSourceClass: 'mock',
    dataSourceHint: '正在尝试只读加载真实客户字段'
  },
  onLoad(options = {}) {
    const customerId = String(options.id || options.customerId || '').trim()
    this.setData({ guards: this.makeReadonlyGuards() })
    if (!customerId) {
      const fallback = buildMockSuggestion(getCustomerById(''))
      this.setData({
        ...fallback,
        loading: false
      })
      return
    }
    this.setData({
      dataSourceLabel: 'Mock fallback',
      dataSourceClass: 'mock',
      dataSourceHint: '正在尝试只读加载真实客户字段'
    })
    wx.cloud.callFunction({
      name: 'getCustomer',
      data: { customerId }
    })
      .then((res) => {
        const result = res.result || {}
        if (result.error) {
          throw new Error(result.error.message || 'getCustomer 返回错误')
        }
        const customer = result.customer
        if (!customer || customer.deleted === true) {
          throw new Error('客户不存在或已删除')
        }
        const mapped = mapCustomerToDetail(customer)
        const suggestion = generateSuggestion(mapped)
        this.setData({
          customer: mapped,
          suggestion,
          dataSourceLabel: '真实客户字段',
          dataSourceClass: 'real',
          dataSourceHint: '只读来自 getCustomer，未调用真实 AI。',
          loading: false
        })
      })
      .catch((error) => {
        const fallback = buildMockSuggestion(getCustomerById(customerId))
        this.setData({
          ...fallback,
          dataSourceLabel: '加载失败，已回退 mock',
          dataSourceHint: error && error.message ? error.message : '真实客户字段加载失败'
        })
      })
  },
  makeReadonlyGuards() {
    return [
      'Phase 3B-3 Readonly',
      '仅可调用 getCustomer',
      '不回写客户数据',
      '不调用真实 AI',
      '不调用 aiGenerateOwnerSummary',
      '不影响 V1'
    ]
  },
  toggleGuards() {
    this.setData({ showGuards: !this.data.showGuards })
  },
  onCustomerChange(event) {
    const selectedIndex = Number(event.detail.value || 0)
    const customer = this.data.customers[selectedIndex]
    this.setData({ selectedIndex }, () => this.useCustomer(customer))
  },
  useCustomer(customer) {
    const mapped = customer ? mapCustomerToDetail(customer) : customer
    this.setData({
      customer: mapped,
      suggestion: generateSuggestion(mapped || customer)
    })
  },
  regenerate() {
    this.useCustomer(this.data.customer)
    wx.showToast({
      title: '已生成 mock 建议',
      icon: 'none'
    })
  },
  copyMessage() {
    const message = (this.data.suggestion && this.data.suggestion.recommendedMessage) || ''
    wx.setClipboardData({
      data: message
    })
  },
  goCustomerDetail() {
    const customerId = (this.data.customer && this.data.customer.customerId) || ''
    wx.navigateTo({
      url: `/subpackages/deal-loop/pages/customer-detail/customer-detail?id=${customerId}`
    })
  }
})
