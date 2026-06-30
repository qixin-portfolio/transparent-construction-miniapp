const { getMockCustomerById } = require('../../mock/customers')
const { buildCaseAssetDraftFromCustomer } = require('../../mock/caseAssets')
const { getMaterialsByIds } = require('../../utils/materialMapper')
const { getCustomerIdentity, mapCustomerToDetail } = require('../../utils/v1ReadonlyAdapters')

const CONTEXT_ERROR_MESSAGE = '客户上下文异常，请返回重新打开'

function normalizeCustomerId(value) {
  return String(value || '').trim()
}

function isSameCustomer(customerId, customer) {
  const actualId = getCustomerIdentity(customer)
  return !!customerId && !!actualId && actualId === customerId
}

function makeGenericMockCustomer(customerId) {
  const mock = getMockCustomerById(customerId)
  if (mock) return mapCustomerToDetail(mock)
  if (!customerId) return mapCustomerToDetail(getMockCustomerById(''))
  return {
    id: '',
    customerId: '',
    v1CustomerId: '',
    tenantId: 'tenant_shengjing_default',
    name: 'Mock 案例演示客户',
    source: 'mock 演示',
    community: '本地小区',
    area: '120平',
    layout: '三室两厅',
    stylePreference: '现代简约',
    budgetRange: '预算待确认',
    need: '透明工地过程留痕',
    concern: '担心施工过程看不见',
    stage: '案例草案演示',
    dealStatus: 'Mock fallback',
    primaryRiskReason: '真实客户读取失败，使用通用 mock 草案'
  }
}

Page({
  data: {
    customer: null,
    caseAsset: null,
    materials: [],
    guards: [],
    loading: true,
    customerId: '',
    dataSourceLabel: 'Mock fallback',
    dataSourceClass: 'mock',
    dataSourceHint: '正在准备 mock 案例资产草案',
    contextError: ''
  },

  onLoad(options = {}) {
    const customerId = normalizeCustomerId(options.customerId || options.id)
    this.setData({
      customerId,
      guards: this.makeReadonlyGuards(),
      dataSourceLabel: customerId ? '真实客户字段 + Mock 案例草案' : 'Mock fallback',
      dataSourceClass: customerId ? 'real' : 'mock',
      dataSourceHint: customerId ? '正在只读加载客户字段并生成 mock 案例草案' : '未提供客户 ID，使用默认 mock 案例草案'
    })

    if (!customerId) {
      this.useCustomerForCaseAsset(
        makeGenericMockCustomer(''),
        'Mock fallback',
        'mock',
        '未提供客户 ID，使用默认 mock 案例草案。'
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
        this.useCustomerForCaseAsset(
          mapped,
          '真实客户字段 + Mock 案例草案',
          'real',
          `URL customerId: ${customerId}；只读来自 getCustomer，案例资产仍为本地 mock 草案。`
        )
      })
      .catch((error) => {
        this.useCustomerForCaseAsset(
          makeGenericMockCustomer(customerId),
          '客户读取失败，已回退 mock',
          'mock',
          `URL customerId: ${customerId}；${error && error.message ? error.message : '真实客户读取失败'}；已使用 mock 案例草案。`
        )
      })
  },

  makeReadonlyGuards() {
    return [
      'Phase 3B-6 Readonly',
      '仅可调用 getCustomer',
      '不读取真实工地、日报、照片、图纸或授权',
      '不自动发布小红书/抖音/官网/GEO',
      '不写数据库',
      '不影响 V1'
    ]
  },

  useCustomerForCaseAsset(customer, label, sourceClass, hint) {
    const caseAsset = buildCaseAssetDraftFromCustomer(customer)
    this.setData({
      customer,
      caseAsset,
      materials: getMaterialsByIds(caseAsset.materialIds),
      dataSourceLabel: label,
      dataSourceClass: sourceClass,
      dataSourceHint: hint,
      contextError: '',
      loading: false
    })
    wx.setNavigationBarTitle({
      title: `案例资产-${customer && customer.name ? customer.name : 'Mock'}`
    })
  },

  showContextError(customerId, actualId) {
    this.setData({
      customer: null,
      caseAsset: null,
      materials: [],
      dataSourceLabel: CONTEXT_ERROR_MESSAGE,
      dataSourceClass: 'error',
      dataSourceHint: `URL customerId: ${customerId}；返回客户 ID: ${actualId || '空'}`,
      contextError: CONTEXT_ERROR_MESSAGE,
      loading: false
    })
    wx.showToast({
      title: CONTEXT_ERROR_MESSAGE,
      icon: 'none'
    })
  },

  copyXiaohongshuTitle() {
    const titles = (this.data.caseAsset && this.data.caseAsset.xiaohongshuTitles) || []
    wx.setClipboardData({
      data: titles[0] || ''
    })
  },

  copyDouyinTopic() {
    const topics = (this.data.caseAsset && this.data.caseAsset.douyinTopics) || []
    wx.setClipboardData({
      data: topics[0] || ''
    })
  },

  copyGeoQa() {
    const items = (this.data.caseAsset && this.data.caseAsset.geoQaMaterials) || []
    wx.setClipboardData({
      data: items.map((item) => `问：${item.question}\n答：${item.answer}`).join('\n\n')
    })
  },

  showPublishGuard() {
    wx.showModal({
      title: '不自动发布',
      content: 'Phase 3B-6 仅生成 mock 案例资产草案，不请求 API，不写数据库，不自动发布。',
      showCancel: false
    })
  }
})
