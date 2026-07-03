const { getMockCustomerById } = require('../../mock/customers')
const { buildCaseAssetDraftFromCustomer } = require('../../mock/caseAssets')
const { guardDealLoopPage } = require('../../utils/accessGuard')
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
    name: '示例案例演示客户',
    source: '示例演示',
    community: '本地小区',
    area: '120平',
    layout: '三室两厅',
    stylePreference: '现代简约',
    budgetRange: '预算待确认',
    need: '透明工地过程留痕',
    concern: '担心施工过程看不见',
    stage: '案例草案演示',
    dealStatus: '示例草案',
    primaryRiskReason: '客户资料读取失败，当前展示示例草案'
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
    dataSourceLabel: '示例案例草案',
    dataSourceClass: 'mock',
    dataSourceHint: '正在准备示例案例内容草案',
    contextError: ''
  },

  onLoad(options = {}) {
    if (!guardDealLoopPage()) return
    const customerId = normalizeCustomerId(options.customerId || options.id)
    this.setData({
      customerId,
      guards: this.makeReadonlyGuards(),
      dataSourceLabel: customerId ? '只读客户资料 + 示例案例草案' : '示例案例草案',
      dataSourceClass: customerId ? 'real' : 'mock',
      dataSourceHint: customerId ? '正在只读加载客户资料并整理案例内容草案' : '未从客户列表进入，当前展示示例案例草案。'
    })

    if (!customerId) {
      this.useCustomerForCaseAsset(
        makeGenericMockCustomer(''),
        '示例案例草案',
        'mock',
        '未从客户列表进入，当前展示示例案例草案。'
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
          '只读客户资料 + 示例案例草案',
          'real',
          '客户资料只读加载完成，当前仅整理案例内容草案。'
        )
      })
      .catch((error) => {
        this.useCustomerForCaseAsset(
          makeGenericMockCustomer(customerId),
          '客户资料读取失败，已展示示例草案',
          'mock',
          '客户资料暂时读取失败，当前展示示例案例草案。'
        )
      })
  },

  makeReadonlyGuards() {
    return [
      'V2 试验功能，只读展示',
      '仅读取客户资料',
      '不读取原始照片、日报正文、图纸或授权记录',
      '不支持自动发布到小红书、抖音、官网或 GEO',
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
      title: `案例内容草案-${customer && customer.name ? customer.name : '客户'}`
    })
  },

  showContextError(customerId, actualId) {
    this.setData({
      customer: null,
      caseAsset: null,
      materials: [],
      dataSourceLabel: CONTEXT_ERROR_MESSAGE,
      dataSourceClass: 'error',
      dataSourceHint: '返回的客户资料与当前页面不一致，请返回客户列表重新打开。',
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
      title: '不支持自动发布',
      content: '当前仅生成案例内容草案，不调用发布服务，不写数据库；如需用于小红书、抖音、官网或 GEO 内容，应先确认案例授权。',
      showCancel: false
    })
  }
})
