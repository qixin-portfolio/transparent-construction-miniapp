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
    showGuards: false
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
      '不修改客户数据',
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
