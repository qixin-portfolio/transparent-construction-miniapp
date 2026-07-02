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

const PIPELINE_FEEDBACK_QUESTIONS = [
  '1. 你能一眼看懂今天应该重点跟进谁吗？',
  '2. 当前客户阶段和跟进建议是否清楚？',
  '3. 哪个信息最能帮助你判断成交机会？'
]

function makeSalesNextAction(customer) {
  const stage = customer && customer.pipelineStage
  const riskLevel = customer && customer.riskLevel
  if (stage === 'signed') {
    return {
      action: '核对签约信息，整理工地创建草案',
      focus: '确认合同、地址和开工信息是否完整',
      hint: '只做内部参考，不创建真实工地'
    }
  }
  if (riskLevel === '高风险' || stage === 'hot_follow') {
    return {
      action: '先确认客户当前最大顾虑',
      focus: '把价格、售后或施工疑问逐条讲清楚',
      hint: '风险较高，请人工判断后推进'
    }
  }
  if (stage === 'quoted' || stage === 'proposal') {
    return {
      action: '报价后 24 小时内回访',
      focus: '解释方案差异，再补充案例或工地证据',
      hint: '重点看客户是否还在比价'
    }
  }
  if (stage === 'measured' || stage === 'contacted') {
    return {
      action: '邀约客户确认方案',
      focus: '补齐需求、预算和房屋信息',
      hint: '先把下一次沟通时间约清楚'
    }
  }
  return {
    action: '准备信任证据后再跟进',
    focus: '先解释透明工地和施工留痕',
    hint: '内部参考，不写入跟进记录'
  }
}

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
    dataSourceHint: '正在只读加载客户资料',
    feedbackQuestions: PIPELINE_FEEDBACK_QUESTIONS,
    followupTips: [
      '优先看高意向客户',
      '先确认客户顾虑',
      '再准备信任证据',
      '最后推进下一步动作'
    ]
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
      '不调用真实 AI',
      '不创建真实工地',
      '不自动发布内容',
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
        primaryRiskReason: (customer.riskReasons || [])[0] || '暂无风险备注',
        salesNextAction: makeSalesNextAction(Object.assign({}, customer, { pipelineStage }))
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
  },

  copyFeedbackQuestions() {
    wx.setClipboardData({
      data: [
        '本轮体验反馈',
        '看完成交跟进后，请老板重点反馈：是否看得懂、哪个客户最值得跟、下一步动作是否清楚。',
        ...PIPELINE_FEEDBACK_QUESTIONS
      ].join('\n'),
      success: () => {
        wx.showToast({
          title: '已复制反馈问题',
          icon: 'none'
        })
      }
    })
  }
})
