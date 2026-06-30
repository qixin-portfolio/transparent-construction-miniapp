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
const { getPhase2Guards } = require('../../utils/riskGuards')
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
    dataSourceLabel: 'Mock fallback',
    dataSourceClass: 'mock',
    dataSourceHint: '正在尝试只读加载真实客户数据'
  },

  onLoad() {
    this.setData({
      stageTabs: ACTION_FILTERS.concat([{ code: 'all', label: '全部', desc: '所有客户' }], pipelineStages),
      guards: this.makeReadonlyGuards()
    })
    this.loadPipelineCustomers()
  },

  makeReadonlyGuards() {
    return getPhase2Guards().map((item) => {
      if (item === '不调用云函数') return '仅 pipeline 只读调用 listCustomers'
      return item
    })
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
      dataSourceLabel: 'Mock fallback',
      dataSourceClass: 'mock',
      dataSourceHint: '正在尝试只读加载真实客户数据'
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
          throw new Error(result.error.message || 'listCustomers 返回错误')
        }
        const cards = mapCustomerListToPipelineCards(result.items)
        if (!cards.length) {
          this.useMockCustomers('Mock fallback', 'listCustomers 暂无可展示客户，已使用本地 mock。')
          return
        }
        this.useCustomers(cards, '真实客户数据', 'real', '只读来自 listCustomers，未写入任何集合。')
      })
      .catch((error) => {
        this.useMockCustomers('加载失败，已回退 mock', error && error.message ? error.message : '真实客户数据加载失败')
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

  goMaterials() {
    wx.navigateTo({
      url: '/subpackages/deal-loop/pages/trust-materials/trust-materials'
    })
  },

  toggleGuards() {
    this.setData({ showGuards: !this.data.showGuards })
  }
})
