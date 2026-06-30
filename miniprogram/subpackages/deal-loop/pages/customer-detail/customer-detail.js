const { getCustomerById } = require('../../mock/customers')
const { getFollowRecordsByCustomer } = require('../../mock/followRecords')
const { generateSuggestion } = require('../../utils/aiMockEngine')
const { getMaterialsByIds } = require('../../utils/materialMapper')
const { mapCustomerToDetail } = require('../../utils/v1ReadonlyAdapters')

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
      dataSourceLabel: 'Mock fallback',
      dataSourceClass: 'mock',
      dataSourceHint: '未提供客户 ID，已使用本地 mock。'
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
    dataSourceLabel: 'Mock fallback',
    dataSourceClass: 'mock',
    dataSourceHint: '未调用真实客户详情，已使用本地 mock。'
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
    dataSourceLabel: 'Mock fallback',
    dataSourceClass: 'mock',
    dataSourceHint: '正在尝试只读加载真实客户详情',
    guards: [],
    showGuards: false
  },
  onLoad(options = {}) {
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
      dataSourceLabel: 'Mock fallback',
      dataSourceClass: 'mock',
      dataSourceHint: '正在尝试只读加载真实客户详情'
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
        const followRecords = getFollowRecordsByCustomer(mapped.customerId)
        const suggestion = generateSuggestion(mapped)
        const materials = getMaterialsByIds(suggestion.recommendedMaterialIds)
        this.setData({
          customer: mapped,
          followRecords: Array.isArray(followRecords) ? followRecords : [],
          suggestion,
          materials,
          dataSourceLabel: '真实客户详情',
          dataSourceClass: 'real',
          dataSourceHint: '只读来自 getCustomer，未写入任何集合。',
          loading: false
        })
      })
      .catch((error) => {
        const fallback = buildMockDetail(customerId)
        this.setData({
          ...fallback,
          dataSourceLabel: '加载失败，已回退 mock',
          dataSourceHint: error && error.message ? error.message : '真实客户详情加载失败'
        })
      })
  },
  makeReadonlyGuards() {
    return [
      'Phase 3B-2 Readonly',
      '仅可调用 getCustomer',
      '不回写客户数据',
      '不创建跟进记录',
      '不调用真实 AI',
      '不影响 V1'
    ]
  },
  toggleGuards() {
    this.setData({ showGuards: !this.data.showGuards })
  },
  goAssistant() {
    const customerId = getCustomerIdFromContext(this.data.customer, this.data)
    if (!customerId) {
      wx.showToast({
        title: '缺少客户ID，无法生成 AI 话术',
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
        title: '缺少客户ID，无法推荐素材',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: `/subpackages/deal-loop/pages/trust-materials/trust-materials?customerId=${encodeURIComponent(customerId)}`
    })
  },
  goContractDraft() {
    const customerId = (this.data.customer && this.data.customer.customerId) || ''
    wx.navigateTo({
      url: `/subpackages/deal-loop/pages/contract-to-project/contract-to-project?id=${customerId}`
    })
  }
})
