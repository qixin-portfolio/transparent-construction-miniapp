const { pipelineStages, customers: mockCustomers } = require('../../mock/customers')
const {
  ACTION_FILTERS,
  getPipelineStage,
  getPipelineLabel,
  getRiskClass,
  filterCustomersForAction,
  makePipelineStats,
  sortCustomersForAction
} = require('../../utils/pipelineStatus')
const { mapCustomerListToPipelineCards } = require('../../utils/v1ReadonlyAdapters')

Page({
  data: {
    stageTabs: [],
    activeFilter: 'today_follow',
    customers: [],
    visibleCustomers: [],
    stats: {
      todayFollow: 0,
      keyPush: 0,
      closing: 0,
      highRisk: 0
    },
    guards: [],
    showGuards: false,
    loading: true,
    dataSourceLabel: '示例内容',
    dataSourceClass: 'mock',
    dataSourceHint: '正在只读加载客户资料'
  },

  onLoad() {
    this.setData({
      stageTabs: ACTION_FILTERS.concat([{ code: 'all', label: '全部', desc: '所有客户' }], pipelineStages),
      guards: this.makeReadonlyGuards()
    })
    this.loadPipelineCustomers()
  },

  makeReadonlyGuards() {
    return [
      'V2 试验功能，只读资料',
      '仅读取客户列表',
      '仅用于内部成交跟进',
      '不修改现有客户数据',
      '不影响 V1',
      '不部署，不上传体验版'
    ]
  },

  prepareCustomers(customers) {
    return (customers || []).map((customer) => {
      const pipelineStage = getPipelineStage(customer)
      return Object.assign({}, customer, {
        pipelineStage,
        pipelineLabel: getPipelineLabel(pipelineStage),
        riskClass: getRiskClass(customer.riskLevel),
        primaryRiskReason: (customer.riskReasons || [])[0] || '暂无风险备注'
      })
    })
  },

  loadPipelineCustomers() {
    this.setData({
      loading: true,
      dataSourceLabel: '只读客户资料',
      dataSourceClass: 'mock',
      dataSourceHint: '正在只读加载客户资料'
    })

    wx.cloud.callFunction({
      name: 'listCustomers',
      data: {
        source: 'deal-loop-pipeline-readonly'
      }
    })
      .then((res) => {
        const result = res.result || {}
        if (result.error) {
          throw new Error('客户列表读取失败')
        }
        const cards = mapCustomerListToPipelineCards(result.items)
        if (!cards.length) {
          this.useMockCustomers('示例内容', '暂无可展示客户，当前展示示例内容。')
          return
        }
        this.useCustomers(cards, '只读客户资料', 'real', '仅用于内部成交跟进，未修改任何数据。')
      })
      .catch((error) => {
        this.useMockCustomers('示例内容', '当前无法读取客户资料，暂展示示例内容。')
      })
  },

  useCustomers(customers, label, sourceClass, hint) {
    const preparedCustomers = this.prepareCustomers(customers)
    this.setData({
      customers: sortCustomersForAction(preparedCustomers),
      stats: makePipelineStats(preparedCustomers),
      dataSourceLabel: label,
      dataSourceClass: sourceClass,
      dataSourceHint: hint,
      loading: false
    }, () => this.applyFilter())
  },

  useMockCustomers(label, hint) {
    this.useCustomers(mockCustomers, label, 'mock', hint)
  },

  switchStage(event) {
    const code = event.currentTarget.dataset.code || 'all'
    this.setData({ activeFilter: code }, () => this.applyFilter())
  },

  applyFilter() {
    const list = filterCustomersForAction(this.data.customers, this.data.activeFilter)
    this.setData({ visibleCustomers: sortCustomersForAction(list) })
  },

  goCustomerDetail(event) {
    const id = event.currentTarget.dataset.id
    wx.navigateTo({
      url: `/subpackages/deal-loop/pages/customer-detail/customer-detail?id=${id}`
    })
  },

  goAssistant(event) {
    const id = event.currentTarget.dataset.id
    wx.navigateTo({
      url: `/subpackages/deal-loop/pages/ai-assistant/ai-assistant?id=${id}`
    })
  },

  goMaterials(event) {
    const id = event.currentTarget.dataset.id
    if (!id) {
      wx.showToast({
        title: '未找到客户资料，无法推荐素材',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: `/subpackages/deal-loop/pages/trust-materials/trust-materials?customerId=${encodeURIComponent(id)}`
    })
  },

  toggleGuards() {
    this.setData({ showGuards: !this.data.showGuards })
  }
})
