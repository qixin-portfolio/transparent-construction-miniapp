const { customers, getCustomerById } = require('../../mock/customers')
const { toProjectDraft } = require('../../utils/v1Adapters')
const { getPhase2Guards, makeHumanGateMessage } = require('../../utils/riskGuards')

Page({
  data: {
    customer: null,
    projectDraft: null,
    checklist: [],
    guards: [],
    gateMessage: ''
  },

  onLoad(options = {}) {
    const signedCustomer = customers.find((item) => item.dealStatus === '已成交') || customers[0]
    const customer = options.id ? getCustomerById(options.id) : signedCustomer
    const projectDraft = toProjectDraft(customer)
    this.setData({
      customer,
      projectDraft,
      checklist: this.makeChecklist(customer, projectDraft),
      guards: getPhase2Guards(),
      gateMessage: makeHumanGateMessage('真实创建工地')
    })
  },

  makeChecklist(customer, draft) {
    return [
      { label: '客户已签约', ok: customer.dealStatus === '已成交' || customer.stage === '已签单' },
      { label: '工地名称草案', ok: !!draft.name },
      { label: '小区/地址', ok: !!draft.address },
      { label: '保留人工确认', ok: true },
      { label: '不调用 createProject', ok: true }
    ]
  },

  copyDraft() {
    wx.setClipboardData({
      data: JSON.stringify(this.data.projectDraft, null, 2)
    })
  }
})
