const { pipelineStages, customers } = require('../../mock/customers')
const { getPipelineStage, getPipelineLabel, makePipelineStats } = require('../../utils/pipelineStatus')
const { getPhase2Guards } = require('../../utils/riskGuards')

Page({
  data: {
    stageTabs: [],
    activeStage: 'all',
    customers: [],
    visibleCustomers: [],
    stats: {
      total: 0,
      hot: 0,
      signed: 0,
      highRisk: 0
    },
    guards: []
  },

  onLoad() {
    const preparedCustomers = customers.map((customer) => {
      const pipelineStage = getPipelineStage(customer)
      return Object.assign({}, customer, {
        pipelineStage,
        pipelineLabel: getPipelineLabel(pipelineStage)
      })
    })
    this.setData({
      stageTabs: [{ code: 'all', label: '全部', desc: '所有客户' }].concat(pipelineStages),
      customers: preparedCustomers,
      stats: makePipelineStats(preparedCustomers),
      guards: getPhase2Guards()
    }, () => this.applyFilter())
  },

  switchStage(event) {
    const code = event.currentTarget.dataset.code || 'all'
    this.setData({ activeStage: code }, () => this.applyFilter())
  },

  applyFilter() {
    const activeStage = this.data.activeStage
    const list = activeStage === 'all'
      ? this.data.customers
      : this.data.customers.filter((customer) => customer.pipelineStage === activeStage)
    this.setData({ visibleCustomers: list })
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
  }
})
