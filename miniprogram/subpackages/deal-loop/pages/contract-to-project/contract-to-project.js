const { customers, getMockCustomerById } = require('../../mock/customers')
const {
  getCustomerIdentity,
  mapCustomerToDetail,
  mapCustomerToProjectDraft
} = require('../../utils/v1ReadonlyAdapters')

const CONTEXT_ERROR_MESSAGE = '客户上下文异常，请返回重新打开'

function normalizeCustomerId(value) {
  return String(value || '').trim()
}

function isSameCustomer(customerId, customer) {
  const actualId = getCustomerIdentity(customer)
  return !!customerId && !!actualId && actualId === customerId
}

function makeDemoCustomer(customerId) {
  const signedCustomer = customers.find((item) => item.dealStatus === '已成交') || customers[0]
  const mock = getMockCustomerById(customerId) || signedCustomer
  const mapped = mapCustomerToDetail(mock)
  if (customerId && !(mock && isSameCustomer(customerId, mapped))) {
    return Object.assign({}, mapped, {
      id: '',
      customerId: '',
      v1CustomerId: '',
      name: '示例演示客户'
    })
  }
  return mapped
}

Page({
  data: {
    customer: null,
    projectDraft: null,
    mappingRows: [],
    checklist: [],
    guards: [],
    gateMessage: '',
    showGuards: false,
    customerId: '',
    dataSourceLabel: '示例草案',
    dataSourceClass: 'mock',
    dataSourceHint: '正在准备工地创建草案',
    contextError: ''
  },

  onLoad(options = {}) {
    const customerId = normalizeCustomerId(options.customerId || options.id)
    this.setData({
      customerId,
      guards: this.makeReadonlyGuards(),
      gateMessage: '创建正式工地属于高风险动作，需要人工确认后再执行。',
      dataSourceLabel: customerId ? '只读客户资料 + 工地草案' : '示例草案',
      dataSourceClass: customerId ? 'real' : 'mock',
      dataSourceHint: customerId ? '正在只读加载客户资料并整理工地草案' : '未从客户列表进入，当前展示示例草案。'
    })
    if (!customerId) {
      this.useCustomerForDraft(
        makeDemoCustomer(''),
        '示例草案',
        'mock',
        '未从客户列表进入，当前展示示例草案。'
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
        this.useCustomerForDraft(
          mapped,
          '只读客户资料 + 工地草案',
          'real',
          '客户资料只读加载完成，当前仅整理工地草案。'
        )
      })
      .catch((error) => {
        this.useCustomerForDraft(
          makeDemoCustomer(customerId),
          '客户资料读取失败，已展示示例草案',
          'mock',
          '客户资料暂时读取失败，当前展示示例草案。'
        )
      })
  },

  makeReadonlyGuards() {
    return [
      'V2 试验功能，只读展示',
      '仅读取客户资料',
      '当前仅整理工地草案',
      '不创建真实工地',
      '不修改现有项目数据',
      '不影响 V1'
    ]
  },

  makeMappingRows(customer, draft) {
    return [
      { from: '客户资料', to: '关联客户', value: draft.customerName || (customer && customer.name) || '待确认' },
      { from: '客户姓名', to: '业主姓名', value: draft.ownerName },
      { from: '小区 / 面积 / 风格', to: '工地基础信息', value: draft.baseInfoDraft },
      { from: '预算 / 需求', to: '项目备注', value: draft.projectRemarkDraft },
      { from: '当前阶段', to: '转工地前置状态', value: draft.preProjectStatus },
      { from: '签约后动作', to: '工地创建草案', value: customer.todayAction || customer.nextAction || '待人工确认' }
    ]
  },

  makeChecklist(customer, draft) {
    return [
      { label: '客户已签约', ok: customer.dealStatus === '已成交' || customer.stage === '已签单' },
      { label: '客户资料已关联', ok: !!draft.customerId || this.data.dataSourceClass === 'mock' },
      { label: '工地名称草案', ok: !!draft.name },
      { label: '小区/地址简写', ok: !!draft.address },
      { label: '保留人工确认', ok: true },
      { label: '不创建真实工地', ok: true },
      { label: '不修改现有项目数据', ok: true }
    ]
  },

  useCustomerForDraft(customer, label, sourceClass, hint) {
    const projectDraft = mapCustomerToProjectDraft(customer)
    this.setData({
      customer,
      projectDraft,
      mappingRows: this.makeMappingRows(customer, projectDraft),
      checklist: this.makeChecklist(customer, projectDraft),
      dataSourceLabel: label,
      dataSourceClass: sourceClass,
      dataSourceHint: hint,
      contextError: ''
    })
  },

  showContextError(customerId, actualId) {
    this.setData({
      customer: null,
      projectDraft: null,
      mappingRows: [],
      checklist: [],
      dataSourceLabel: CONTEXT_ERROR_MESSAGE,
      dataSourceClass: 'error',
      dataSourceHint: '返回的客户资料与当前页面不一致，请返回客户列表重新打开。',
      contextError: CONTEXT_ERROR_MESSAGE
    })
    wx.showToast({
      title: CONTEXT_ERROR_MESSAGE,
      icon: 'none'
    })
  },

  copyDraft() {
    const draft = this.data.projectDraft || {}
    const text = [
      `关联客户：${draft.customerName || '待确认'}`,
      `业主姓名草案：${draft.ownerName || '待确认'}`,
      `工地小区草案：${draft.projectCommunity || '待确认'}`,
      `工地面积草案：${draft.projectArea || '待确认'}`,
      `装修风格草案：${draft.projectStyle || '待确认'}`,
      `预算备注：${draft.budgetNote || '待确认'}`,
      `项目备注草案：${draft.projectRemarkDraft || '待确认'}`,
      '说明：当前仅为草案预览，不会创建真实工地。'
    ].join('\n')
    wx.setClipboardData({
      data: text
    })
  },

  mockGenerateDraft() {
    wx.showModal({
      title: '预览工地草案',
      content: '当前仅预览工地草案，不会创建真实工地，也不会修改现有项目数据。',
      showCancel: false
    })
  },

  toggleGuards() {
    this.setData({ showGuards: !this.data.showGuards })
  }
})
