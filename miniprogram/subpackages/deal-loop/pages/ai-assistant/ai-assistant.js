const { customers, getCustomerById } = require('../../mock/customers')
const { generateSuggestion } = require('../../utils/aiMockEngine')
const { getPhase2Guards } = require('../../utils/riskGuards')

Page({
  data: {
    customers,
    selectedIndex: 0,
    customer: null,
    suggestion: null,
    guards: []
  },

  onLoad(options = {}) {
    const customer = getCustomerById(options.id || '')
    const selectedIndex = Math.max(0, customers.findIndex((item) => item.customerId === customer.customerId))
    this.setData({
      selectedIndex,
      guards: getPhase2Guards()
    }, () => this.useCustomer(customer))
  },

  onCustomerChange(event) {
    const selectedIndex = Number(event.detail.value || 0)
    this.setData({ selectedIndex }, () => this.useCustomer(this.data.customers[selectedIndex]))
  },

  useCustomer(customer) {
    this.setData({
      customer,
      suggestion: generateSuggestion(customer)
    })
  },

  regenerate() {
    this.useCustomer(this.data.customer)
    wx.showToast({ title: '已生成 mock 建议', icon: 'none' })
  },

  copyMessage() {
    const message = (this.data.suggestion && this.data.suggestion.recommendedMessage) || ''
    wx.setClipboardData({ data: message })
  }
})
