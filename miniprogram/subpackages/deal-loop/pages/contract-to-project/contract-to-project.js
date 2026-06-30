const { customers, getCustomerById } = require('../../mock/customers')
const { toProjectDraft } = require('../../utils/v1Adapters')
const { getPhase2Guards, makeHumanGateMessage } = require('../../utils/riskGuards')

Page({
  data: {
    customer: null,
    projectDraft: null,
    mappingRows: [],
    checklist: [],
    guards: [],
    gateMessage: '',
    showGuards: false
  },

  onLoad(options = {}) {
    const signedCustomer = customers.find((item) => item.dealStatus === '已成交') || customers[0]
    const customer = options.id ? getCustomerById(options.id) : signedCustomer
    const projectDraft = toProjectDraft(customer)
    this.setData({
      customer,
      projectDraft,
      mappingRows: this.makeMappingRows(customer, projectDraft),
      checklist: this.makeChecklist(customer, projectDraft),
      guards: getPhase2Guards(),
      gateMessage: makeHumanGateMessage('真实创建工地')
    })
  },

  makeMappingRows(customer, draft) {
    return [
      { from: 'customerId', to: 'project.customerId', value: draft.customerId },
      { from: '客户姓名', to: '业主姓名', value: draft.ownerName },
      { from: '小区 / 面积 / 风格 / 预算', to: '工地基础信息草案', value: draft.baseInfoDraft },
      { from: '签约后动作', to: '工地创建草案', value: customer.todayAction || customer.nextAction }
    ]
  },

  makeChecklist(customer, draft) {
    return [
      { label: '客户已签约', ok: customer.dealStatus === '已成交' || customer.stage === '已签单' },
      { label: '工地名称草案', ok: !!draft.name },
      { label: '小区/地址', ok: !!draft.address },
      { label: '保留人工确认', ok: true },
      { label: '不触发真实工地创建，不写 projects', ok: true }
    ]
  },

  copyDraft() {
    wx.setClipboardData({
      data: JSON.stringify(this.data.projectDraft, null, 2)
    })
  },

  toggleGuards() {
    this.setData({ showGuards: !this.data.showGuards })
  }
})
