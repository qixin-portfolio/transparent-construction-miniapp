const { getMockCustomerById } = require('../../mock/customers')
const { generateSuggestion } = require('../../utils/aiMockEngine')
const { getCustomerIdentity, mapCustomerToDetail } = require('../../utils/v1ReadonlyAdapters')

const READ_FAILED_MESSAGE = '客户读取失败，请返回客户列表重新打开'
const CONTEXT_ERROR_MESSAGE = '客户上下文异常，请返回重新打开'
const STAGE_DISPLAY_LABELS = {
  quoted: '已报价',
  signed: '已签约',
  visited: '已到店',
  new: '新线索',
  new_lead: '新线索',
  highRisk: '高风险',
  high_risk: '高风险',
  pending: '待跟进',
  unknown: '当前阶段',
  blocked: '当前阶段'
}

function normalizeCustomerId(value) {
  return String(value || '').trim()
}

function getStageDisplayLabel(value) {
  const key = String(value || '').trim()
  return STAGE_DISPLAY_LABELS[key] || key || '当前阶段'
}

function buildSuggestionView(suggestion) {
  if (!suggestion || typeof suggestion !== 'object') return suggestion
  return Object.assign({}, suggestion, {
    triggerStageLabel: getStageDisplayLabel(suggestion.triggerStage)
  })
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
    stage: status || '客户资料读取失败',
    budgetRange: customerId ? '当前关联客户' : '未从客户列表进入',
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
    materials: [],
    triggerStageLabel: '当前阶段'
  }
}

function buildContextErrorState(customerId, message, hint) {
  const customer = makeBlockedCustomer(customerId, message, '客户资料读取失败')
  return Object.assign({
    customers: [],
    selectedIndex: 0,
    customer,
    suggestion: makeBlockedSuggestion(message),
    dataSourceLabel: '客户资料读取失败',
    dataSourceClass: 'error',
    dataSourceHint: hint || message,
    loading: false,
    contextBlocked: true
  }, makeContextData(customerId, customer, '客户资料读取失败', message))
}

function isSameCustomer(customerId, customer) {
  const actualId = getCustomerIdentity(customer)
  return !!customerId && !!actualId && actualId === customerId
}

function buildMockSuggestion(customer, customerId, hint) {
  const mapped = customer ? mapCustomerToDetail(customer) : null
  const dataSourceLabel = '示例建议'
  return Object.assign({
    customers: mapped ? [mapped] : [],
    selectedIndex: 0,
    customer: mapped,
    suggestion: buildSuggestionView(generateSuggestion(mapped || customer)),
    dataSourceLabel,
    dataSourceClass: 'mock',
    dataSourceHint: hint || '当前展示本地示例建议，仅供内部参考。',
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
    contextStatus: '示例建议',
    contextError: '',
    contextBlocked: false,
    dataSourceLabel: '示例建议',
    dataSourceClass: 'mock',
    dataSourceHint: '正在尝试只读加载客户资料'
  },
  onLoad(options = {}) {
    wx.setNavigationBarTitle({ title: 'AI 跟进助手' })
    const customerId = normalizeCustomerId(options.customerId || options.id)
    this.setData({
      guards: this.makeReadonlyGuards(),
      customerId,
      urlCustomerId: customerId,
      currentCustomerName: '未读取',
      contextStatus: customerId ? '正在读取客户资料' : '示例建议',
      contextError: '',
      contextBlocked: false
    })
    if (!customerId) {
      const fallback = buildMockSuggestion(
        getMockCustomerById(''),
        '',
        '未从客户列表进入，当前展示示例建议。'
      )
      this.setData({
        ...fallback,
        loading: false
      })
      return
    }
    this.setData({
      dataSourceLabel: '只读客户资料',
      dataSourceClass: 'real',
      dataSourceHint: '正在只读加载客户资料，不调用真实 AI。'
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
            '返回的客户资料与当前页面不一致，请返回客户列表重新打开。'
          ))
          wx.showToast({
            title: CONTEXT_ERROR_MESSAGE,
            icon: 'none'
          })
          return
        }
        const suggestion = buildSuggestionView(generateSuggestion(mapped))
        this.setData({
          customers: [mapped],
          selectedIndex: 0,
          customer: mapped,
          suggestion,
          dataSourceLabel: '只读客户资料',
          dataSourceClass: 'real',
          dataSourceHint: `当前关联客户：${mapped.name || '未命名客户'}；仅根据客户阶段和当前顾虑生成建议，不调用真实 AI。`,
          loading: false,
          contextBlocked: false,
          ...makeContextData(customerId, mapped, '只读客户资料')
        })
        wx.setNavigationBarTitle({ title: 'AI 跟进助手' })
      })
      .catch((error) => {
        this.useFallbackOrError(customerId, error)
      })
  },
  makeReadonlyGuards() {
    return [
      'V2 试验功能，只读展示',
      '仅读取客户资料',
      '不修改客户数据',
      '不调用真实 AI',
      '不调用自动总结服务',
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
        '当前客户资料与页面来源不一致，请返回客户列表重新打开。'
      ))
      return
    }
    this.setData({
      customer: mapped,
      suggestion: buildSuggestionView(generateSuggestion(mapped || customer)),
      ...makeContextData(customerId, mapped, this.data.dataSourceLabel)
    })
  },
  useFallbackOrError(customerId, error) {
    const mockCustomer = getMockCustomerById(customerId)
    if (mockCustomer) {
      const fallback = buildMockSuggestion(
        mockCustomer,
        customerId,
        '客户资料暂时读取失败，当前展示同一客户的本地示例建议。'
      )
      this.setData({
        ...fallback,
        dataSourceLabel: '示例建议',
        dataSourceHint: fallback.dataSourceHint,
        loading: false
      })
      wx.setNavigationBarTitle({ title: 'AI 跟进助手' })
      return
    }
    this.setData(buildContextErrorState(
      customerId,
      READ_FAILED_MESSAGE,
      '客户资料暂时读取失败，请返回客户列表重新打开。'
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
      title: '已生成示例建议',
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
        title: '未找到客户资料，无法返回详情',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: `/subpackages/deal-loop/pages/customer-detail/customer-detail?customerId=${encodeURIComponent(customerId)}`
    })
  },
  goMaterials() {
    if (this.data.contextBlocked) {
      wx.showToast({
        title: READ_FAILED_MESSAGE,
        icon: 'none'
      })
      return
    }
    const customerId = getCustomerIdentity(this.data.customer) || this.data.customerId || ''
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
  }
})
