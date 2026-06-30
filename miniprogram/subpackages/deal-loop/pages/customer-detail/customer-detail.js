const { getCustomerById } = require('../../mock/customers')
const { getFollowRecordsByCustomer } = require('../../mock/followRecords')
const { generateSuggestion } = require('../../utils/aiMockEngine')
const { getMaterialsByIds } = require('../../utils/materialMapper')

Page({
  data: {
    customer: null,
    followRecords: [],
    suggestion: null,
    materials: []
  },

  onLoad(options = {}) {
    const customer = getCustomerById(options.id || '')
    const followRecords = getFollowRecordsByCustomer(customer.customerId)
    const suggestion = generateSuggestion(customer)
    this.setData({
      customer,
      followRecords,
      suggestion,
      materials: getMaterialsByIds(suggestion.recommendedMaterialIds)
    })
  },

  goAssistant() {
    wx.navigateTo({
      url: `/subpackages/deal-loop/pages/ai-assistant/ai-assistant?id=${this.data.customer.customerId}`
    })
  },

  goMaterials() {
    wx.navigateTo({
      url: '/subpackages/deal-loop/pages/trust-materials/trust-materials'
    })
  },

  goContractDraft() {
    wx.navigateTo({
      url: `/subpackages/deal-loop/pages/contract-to-project/contract-to-project?id=${this.data.customer.customerId}`
    })
  }
})
