const { customers, getMockCustomerById } = require('../../mock/customers')
const { getPhase2Guards, makeHumanGateMessage } = require('../../utils/riskGuards')
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
      name: 'Mock 演示客户'
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
    dataSourceLabel: 'Mock fallback',
    dataSourceClass: 'mock',
    dataSourceHint: '正在准备工地创建草案',
    contextError: ''
  },

  onLoad(options = {}) {
    const customerId = normalizeCustomerId(options.customerId || options.id)
    this.setData({
      customerId,
      guards: getPhase2Guards(),
      gateMessage: makeHumanGateMessage('真实创建工地'),
      dataSourceLabel: customerId ? '真实客户字段 + 工地草案' : 'Mock fallback',
      dataSourceClass: customerId ? 'real' : 'mock',
      dataSourceHint: customerId ? '正在只读加载客户字段并生成工地草案' : '未提供客户 ID，使用默认 mock 草案'
    })
    if (!customerId) {
      this.useCustomerForDraft(
        makeDemoCustomer(''),
        'Mock fallback',
        'mock',
        '未提供客户 ID，使用默认 mock 草案。'
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
          '真实客户字段 + 工地草案',
          'real',
          `URL customerId: ${customerId}；只读来自 getCustomer，未写入任何集合。`
        )
      })
      .catch((error) => {
        this.useCustomerForDraft(
          makeDemoCustomer(customerId),
          '客户读取失败，已回退 mock',
          'mock',
          `URL customerId: ${customerId}；${error && error.message ? error.message : '真实客户读取失败'}；已使用 mock 草案。`
        )
      })
  },

  makeMappingRows(customer, draft) {
    return [
      { from: 'customer._id / customerId', to: 'project.customerId', value: draft.customerId || '待确认' },
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
      { label: '客户 ID 已归一', ok: !!draft.customerId || this.data.dataSourceClass === 'mock' },
      { label: '工地名称草案', ok: !!draft.name },
      { label: '小区/地址简写', ok: !!draft.address },
      { label: '保留人工确认', ok: true },
      { label: '不触发真实工地创建，不写 projects', ok: true },
      { label: '不写 project_members / customers', ok: true }
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
      dataSourceHint: `URL customerId: ${customerId}；返回客户 ID: ${actualId || '空'}`,
      contextError: CONTEXT_ERROR_MESSAGE
    })
    wx.showToast({
      title: CONTEXT_ERROR_MESSAGE,
      icon: 'none'
    })
  },

  copyDraft() {
    wx.setClipboardData({
      data: JSON.stringify(this.data.projectDraft, null, 2)
    })
  },

  mockGenerateDraft() {
    wx.showModal({
      title: '生成工地草案（mock）',
      content: 'Phase 3B-5 仅生成工地草案，不调用 createProject，不写 projects。',
      showCancel: false
    })
  },

  toggleGuards() {
    this.setData({ showGuards: !this.data.showGuards })
  }
})
