const { pipelineStages, customers } = require('../../mock/customers')
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
    showGuards: false
  },

  onLoad() {
    const preparedCustomers = customers.map((customer) => {
      const pipelineStage = getPipelineStage(customer)
      return Object.assign({}, customer, {
        pipelineStage,
        pipelineLabel: getPipelineLabel(pipelineStage),
        riskClass: getRiskClass(customer.riskLevel),
        primaryRiskReason: (customer.riskReasons || [])[0] || '暂无风险备注'
      })
    })
    this.setData({
      stageTabs: ACTION_FILTERS.concat([{ code: 'all', label: '全部', desc: '所有客户' }], pipelineStages),
      customers: sortCustomersForAction(preparedCustomers),
      stats: makePipelineStats(preparedCustomers),
      guards: getPhase2Guards()
    }, () => this.applyFilter())
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
