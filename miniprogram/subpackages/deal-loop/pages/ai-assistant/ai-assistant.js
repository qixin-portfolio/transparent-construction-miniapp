const { getMockCustomerById } = require('../../mock/customers')
const { generateSuggestion } = require('../../utils/aiMockEngine')
const { getPhase2Guards } = require('../../utils/riskGuards')
const { getCustomerIdentity, mapCustomerToDetail } = require('../../utils/v1ReadonlyAdapters')

const READ_FAILED_MESSAGE = '客户读取失败，请返回客户列表重新打开'
const CONTEXT_ERROR_MESSAGE = '客户上下文异常，请返回重新打开'

function normalizeCustomerId(value) {
  return String(value || '').trim()
}

function makeContextData(customerId, customer, status, errorMessage = '') {
  return {
    urlCustomerId: customerId || '',
    currentCustomerName: (customer && customer.name) || '未读取',
    contextStatus: status || '',
    contextError: errorMessage || ''
  }
}

function makeBlockedCustomer(customerId, message, status) {
  return {
    id: customerId || '',
    customerId: customerId || '',
    v1CustomerId: customerId || '',
    name: message,
    stage: status || '真实客户读取失败',
    budgetRange: customerId ? `URL customerId: ${customerId}` : 'URL customerId: 无',
    community: '请返回客户列表重新打开'
  }
}

function makeBlockedSuggestion(message) {
  return {
    suggestionId: 'blocked_customer_context',
    customerId: '',
    triggerStage: 'blocked',
    customerConcern: message,
    recommendedApproach: message,
    materialSendPlan: '暂不推荐发送素材',
    recommendedMessage: message,
    recommendedMaterialIds: [],
    nextAction: message,
    tone: 'blocked',
    confidenceLabel: 'blocked',
    riskNotes: [message],
    generatedBy: 'context_guard',
    createdAt: '2026-06-30T00:00:00+08:00',
    materials: []
  }
}

function buildContextErrorState(customerId, message, hint) {
  const customer = makeBlockedCustomer(customerId, message, '真实客户读取失败')
  return Object.assign({
    customers: [],
    selectedIndex: 0,
    customer,
    suggestion: makeBlockedSuggestion(message),
    dataSourceLabel: '真实客户读取失败',
    dataSourceClass: 'error',
    dataSourceHint: hint || message,
    loading: false,
    contextBlocked: true
  }, makeContextData(customerId, customer, '真实客户读取失败', message))
}

function isSameCustomer(customerId, customer) {
  const actualId = getCustomerIdentity(customer)
  return !!customerId && !!actualId && actualId === customerId
}

function buildMockSuggestion(customer, customerId, hint) {
  const mapped = customer ? mapCustomerToDetail(customer) : null
  const dataSourceLabel = 'Mock fallback'
  return Object.assign({
    customers: mapped ? [mapped] : [],
    selectedIndex: 0,
    customer: mapped,
    suggestion: generateSuggestion(mapped || customer),
    dataSourceLabel,
    dataSourceClass: 'mock',
    dataSourceHint: hint || '未调用真实客户详情，已使用本地 mock。',
    contextBlocked: false
  }, makeContextData(customerId, mapped, dataSourceLabel))
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
    customerId: '',
    urlCustomerId: '',
    currentCustomerName: '未读取',
    contextStatus: 'Mock fallback',
    contextError: '',
    contextBlocked: false,
    dataSourceLabel: 'Mock fallback',
    dataSourceClass: 'mock',
    dataSourceHint: '正在尝试只读加载真实客户字段'
  },
  onLoad(options = {}) {
    const customerId = normalizeCustomerId(options.customerId || options.id)
    this.setData({
      guards: this.makeReadonlyGuards(),
      customerId,
      urlCustomerId: customerId,
      currentCustomerName: '未读取',
      contextStatus: customerId ? '正在读取真实客户字段' : 'Mock fallback',
      contextError: '',
      contextBlocked: false
    })
    if (!customerId) {
      const fallback = buildMockSuggestion(
        getMockCustomerById(''),
        '',
        '未提供客户 ID，已使用默认 mock 演示客户。'
      )
      this.setData({
        ...fallback,
        loading: false
      })
      wx.setNavigationBarTitle({ title: 'AI 话术 Mock 演示' })
      return
    }
    this.setData({
      dataSourceLabel: '真实客户字段',
      dataSourceClass: 'real',
      dataSourceHint: `URL customerId: ${customerId}；正在尝试只读加载真实客户字段`
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
        if (!isSameCustomer(customerId, mapped)) {
          this.setData(buildContextErrorState(
            customerId,
            CONTEXT_ERROR_MESSAGE,
            `URL customerId: ${customerId}；返回客户 ID: ${getCustomerIdentity(mapped) || '空'}`
          ))
          wx.showToast({
            title: CONTEXT_ERROR_MESSAGE,
            icon: 'none'
          })
          return
        }
        const suggestion = generateSuggestion(mapped)
        this.setData({
          customers: [mapped],
          selectedIndex: 0,
          customer: mapped,
          suggestion,
          dataSourceLabel: '真实客户字段',
          dataSourceClass: 'real',
          dataSourceHint: `URL customerId: ${customerId}；当前客户：${mapped.name || '未命名客户'}；只读来自 getCustomer，未调用真实 AI。`,
          loading: false,
          contextBlocked: false,
          ...makeContextData(customerId, mapped, '真实客户字段')
        })
        wx.setNavigationBarTitle({ title: `AI 话术-${mapped.name || '客户'}` })
      })
      .catch((error) => {
        this.useFallbackOrError(customerId, error)
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
    if (this.data.contextBlocked) {
      wx.showToast({
        title: READ_FAILED_MESSAGE,
        icon: 'none'
      })
      return
    }
    const selectedIndex = Number(event.detail.value || 0)
    const customer = this.data.customers[selectedIndex]
    this.setData({ selectedIndex }, () => this.useCustomer(customer))
  },
  useCustomer(customer) {
    if (this.data.contextBlocked) return
    const mapped = customer ? mapCustomerToDetail(customer) : customer
    const customerId = this.data.customerId || getCustomerIdentity(mapped)
    if (customerId && mapped && !isSameCustomer(customerId, mapped)) {
      this.setData(buildContextErrorState(
        customerId,
        CONTEXT_ERROR_MESSAGE,
        `URL customerId: ${customerId}；当前客户 ID: ${getCustomerIdentity(mapped) || '空'}`
      ))
      return
    }
    this.setData({
      customer: mapped,
      suggestion: generateSuggestion(mapped || customer),
      ...makeContextData(customerId, mapped, this.data.dataSourceLabel)
    })
  },
  useFallbackOrError(customerId, error) {
    const message = error && error.message ? error.message : '真实客户字段加载失败'
    const mockCustomer = getMockCustomerById(customerId)
    if (mockCustomer) {
      const fallback = buildMockSuggestion(
        mockCustomer,
        customerId,
        `URL customerId: ${customerId}；getCustomer 失败：${message}；已使用同 ID mock。`
      )
      this.setData({
        ...fallback,
        dataSourceLabel: 'Mock fallback',
        dataSourceHint: fallback.dataSourceHint,
        loading: false
      })
      wx.setNavigationBarTitle({ title: `AI 话术-${fallback.currentCustomerName || 'Mock'}` })
      return
    }
    this.setData(buildContextErrorState(
      customerId,
      READ_FAILED_MESSAGE,
      `URL customerId: ${customerId}；getCustomer 失败：${message}；本地 mock 无同 ID。`
    ))
    wx.showToast({
      title: READ_FAILED_MESSAGE,
      icon: 'none'
    })
  },
  regenerate() {
    if (this.data.contextBlocked) {
      wx.showToast({
        title: READ_FAILED_MESSAGE,
        icon: 'none'
      })
      return
    }
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
    const customerId = getCustomerIdentity(this.data.customer) || this.data.customerId || ''
    if (!customerId) {
      wx.showToast({
        title: '缺少客户ID，无法返回客户详情',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: `/subpackages/deal-loop/pages/customer-detail/customer-detail?customerId=${encodeURIComponent(customerId)}`
    })
  }
})
