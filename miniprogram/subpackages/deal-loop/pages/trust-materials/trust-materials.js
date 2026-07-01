const { getMockCustomerById } = require('../../mock/customers')
const { materialTypes } = require('../../mock/trustMaterials')
const {
  filterRecommendedMaterials,
  getMaterialSummary,
  recommendMaterialsForCustomer
} = require('../../utils/materialMapper')
const {
  buildEmptyEvidenceView,
  buildEvidenceSummaryView
} = require('../../utils/evidenceSummaryAdapter')
const { getCustomerIdentity, mapCustomerToDetail } = require('../../utils/v1ReadonlyAdapters')

const CONTEXT_ERROR_MESSAGE = '客户上下文异常，请返回重新打开'

function normalizeCustomerId(value) {
  return String(value || '').trim()
}

function isSameCustomer(customerId, customer) {
  const actualId = getCustomerIdentity(customer)
  return !!customerId && !!actualId && actualId === customerId
}

function makeDemoCustomer(customerId) {
  const mock = getMockCustomerById(customerId) || getMockCustomerById('')
  const mapped = mapCustomerToDetail(mock)
  if (customerId && !(mock && isSameCustomer(customerId, mapped))) {
    return Object.assign({}, mapped, {
      id: '',
      customerId: '',
      v1CustomerId: '',
      name: 'Mock 演示客户'
    })
  }
  return mapped
}

Page({
  data: {
    materialTypes,
    activeType: 'all',
    customerId: '',
    customer: null,
    allMaterials: [],
    materials: [],
    loading: true,
    dataSourceLabel: 'Mock fallback',
    dataSourceClass: 'mock',
    dataSourceHint: '正在准备 mock 信任素材',
    contextError: '',
    recommendationSummary: '',
    evidenceLoading: false,
    evidenceSummaryView: buildEmptyEvidenceView()
  },

  onLoad(options = {}) {
    const customerId = normalizeCustomerId(options.customerId || options.id)
    this.setData({
      customerId,
      dataSourceLabel: customerId ? '真实客户字段 + Mock 素材' : 'Mock fallback',
      dataSourceClass: customerId ? 'real' : 'mock',
      dataSourceHint: customerId ? '正在只读加载客户字段并匹配 mock 素材' : '未提供客户 ID，使用默认 mock 客户和 mock 素材',
      evidenceSummaryView: buildEmptyEvidenceView({
        statusLabel: customerId ? '等待读取真实证据摘要' : 'Mock fallback',
        statusClass: customerId ? 'mock' : 'empty',
        statusHint: customerId ? '客户字段读取成功后，再读取真实证据摘要。' : '未提供客户 ID，仅展示示例推荐素材。'
      })
    })
    if (!customerId) {
      this.useCustomerForMaterials(
        makeDemoCustomer(''),
        'Mock fallback',
        'mock',
        '未提供客户 ID，使用默认 mock 客户和 mock 素材'
      )
      return
    }
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
          this.showContextError(customerId, getCustomerIdentity(mapped))
          return
        }
        this.useCustomerForMaterials(
          mapped,
          '真实客户字段 + Mock 素材',
          'real',
          `URL customerId: ${customerId}；只读来自 getCustomer，素材仍为本地 mock。`
        )
        this.loadEvidenceSummary(customerId)
      })
      .catch((error) => {
        this.useCustomerForMaterials(
          makeDemoCustomer(customerId),
          '客户读取失败，已回退 mock',
          'mock',
          `URL customerId: ${customerId}；${error && error.message ? error.message : '真实客户读取失败'}；已使用 mock 客户字段匹配 mock 素材。`
        )
      })
  },

  switchType(event) {
    const type = event.currentTarget.dataset.type || 'all'
    this.setData({ activeType: type }, () => this.applyFilter())
  },

  applyFilter() {
    this.setData({
      materials: filterRecommendedMaterials(this.data.allMaterials, this.data.activeType)
    })
  },

  loadEvidenceSummary(customerId) {
    if (!customerId) return
    this.setData({
      evidenceLoading: true,
      evidenceSummaryView: buildEmptyEvidenceView({
        statusLabel: '正在读取真实证据摘要',
        statusClass: 'mock',
        statusHint: '只读调用 getV2EvidenceSummary，不读取原始素材。'
      })
    })
    wx.cloud.callFunction({
      name: 'getV2EvidenceSummary',
      data: { customerId }
    })
      .then((res) => {
        const result = res.result || {}
        const view = buildEvidenceSummaryView(result)
        const hasSummary = view.hasSummary
        this.setData({
          evidenceLoading: false,
          evidenceSummaryView: view,
          dataSourceLabel: hasSummary ? '真实客户字段 + 真实证据摘要 + Mock 推荐素材' : '真实客户字段 + Mock 推荐素材',
          dataSourceClass: hasSummary ? 'real' : 'mock',
          dataSourceHint: hasSummary
            ? `URL customerId: ${customerId}；证据摘要来自 getV2EvidenceSummary，推荐素材仍为示例素材。`
            : `URL customerId: ${customerId}；${view.statusHint}；推荐素材仍为示例素材。`
        })
      })
      .catch(() => {
        const view = buildEvidenceSummaryView({ ok: false, code: 'READ_FAILED' })
        this.setData({
          evidenceLoading: false,
          evidenceSummaryView: view,
          dataSourceLabel: '真实客户字段 + Mock 推荐素材',
          dataSourceClass: 'mock',
          dataSourceHint: `URL customerId: ${customerId}；证据摘要读取失败，推荐素材仍为示例素材。`
        })
      })
  },

  useCustomerForMaterials(customer, label, sourceClass, hint) {
    const materials = recommendMaterialsForCustomer(customer, { limit: 8 })
    const firstReason = materials[0] && materials[0].recommendationReason
    this.setData({
      customer,
      allMaterials: materials,
      materials: filterRecommendedMaterials(materials, this.data.activeType),
      dataSourceLabel: label,
      dataSourceClass: sourceClass,
      dataSourceHint: hint,
      contextError: '',
      recommendationSummary: firstReason || '已基于当前客户阶段和顾虑匹配 mock 信任素材。',
      loading: false
    })
  },

  showContextError(customerId, actualId) {
    this.setData({
      customer: null,
      allMaterials: [],
      materials: [],
      dataSourceLabel: CONTEXT_ERROR_MESSAGE,
      dataSourceClass: 'error',
      dataSourceHint: `URL customerId: ${customerId}；返回客户 ID: ${actualId || '空'}`,
      contextError: CONTEXT_ERROR_MESSAGE,
      recommendationSummary: '',
      evidenceLoading: false,
      evidenceSummaryView: buildEmptyEvidenceView({
        statusLabel: CONTEXT_ERROR_MESSAGE,
        statusClass: 'error',
        statusHint: '客户上下文异常，已停止读取真实证据摘要。'
      }),
      loading: false
    })
    wx.showToast({
      title: CONTEXT_ERROR_MESSAGE,
      icon: 'none'
    })
  },

  mockSendMaterial(event) {
    const id = event.currentTarget.dataset.id
    const material = this.data.materials.find((item) => item.materialId === id)
    wx.showModal({
      title: 'Mock 发送',
      content: material ? getMaterialSummary(material) : '当前仅为 mock 提示，不调用分享或接口。',
      showCancel: false
    })
  }
})
