const { call, showError } = require('../../services/cloud')
const { DEMO_MODE, demoCustomers } = require('../../utils/demo')

Page({
  data: {
    loading: false,
    customers: [],
    allCustomers: [],
    searchKeyword: '',
    stageFilter: '',
    stageOptions: ['全部', '咨询', '已到店', '已量房', '已出图', '已报价', '准备签单', '已签单'],
    customerStats: {
      total: 0,
      consulting: 0,
      quoting: 0,
      signed: 0
    },
    user: null,
    canCreate: false
  },

  onShow() {
    getApp().ensureLogin()
      .then((user) => {
        const canUseCustomers = user && ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales'].indexOf(user.role) !== -1
        this.setData({
          user,
          canCreate: canUseCustomers
        })
        if (!user || ['owner', 'worker'].indexOf(user.role) !== -1) {
          this.setData({ customers: [] })
          wx.switchTab({ url: '/pages/workbench/workbench' })
          return
        }
        this.loadCustomers()
      })
      .catch((error) => {
        this.setData({ customers: [], user: null, canCreate: false })
        showError('登录失败', error)
      })
  },

  loadCustomers() {
    this.setData({ loading: true })
    call('listCustomers')
      .then((res) => {
        const items = res.items || []
        this.setData({ allCustomers: this.prepareCustomers(items) })
        this.applyFilter()
      })
      .catch((error) => {
        if (DEMO_MODE) {
          this.setData({ allCustomers: this.prepareCustomers(demoCustomers) })
          this.applyFilter()
          return
        }
        this.setData({ allCustomers: [], customers: [] })
        showError('客户加载失败', error)
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  onSearch(e) {
    this.setData({ searchKeyword: String(e.detail.value || '').trim() })
    this.applyFilter()
  },

  onStageFilter(e) {
    this.setData({ stageFilter: e.currentTarget.dataset.stage || '' })
    this.applyFilter()
  },

  prepareCustomers(items) {
    return (items || []).map((item) => {
      const stage = item.stage || '咨询'
      return Object.assign({}, item, {
        stage,
        nextAction: this.getNextAction(stage, item.dealStatus || '未成交')
      })
    })
  },

  getNextAction(stage, dealStatus) {
    if (dealStatus === '已成交') return '创建工地'
    if (dealStatus === '已流失') return '复盘来源'
    const actions = {
      '咨询': '约到店/量房',
      '已到店': '安排量房',
      '已量房': '出方案报价',
      '已出图': '确认方案',
      '已报价': '推进签约',
      '准备签单': '确认合同',
      '已签单': '创建工地'
    }
    return actions[stage] || '继续跟进'
  },

  makeCustomerStats(items) {
    const list = items || []
    return {
      total: list.length,
      consulting: list.filter((item) => ['咨询', '已到店', '已量房'].indexOf(item.stage || '咨询') !== -1).length,
      quoting: list.filter((item) => ['已出图', '已报价', '准备签单'].indexOf(item.stage || '') !== -1).length,
      signed: list.filter((item) => item.dealStatus === '已成交' || item.stage === '已签单').length
    }
  },

  applyFilter() {
    const keyword = this.data.searchKeyword.toLowerCase()
    const stageFilter = this.data.stageFilter
    let list = this.data.allCustomers
    if (keyword) {
      list = list.filter(function (item) {
        return (item.name && item.name.toLowerCase().indexOf(keyword) !== -1) ||
               (item.phone && String(item.phone).indexOf(keyword) !== -1) ||
               (item.address && item.address.toLowerCase().indexOf(keyword) !== -1) ||
               (item.source && item.source.toLowerCase().indexOf(keyword) !== -1)
      })
    }
    if (stageFilter) {
      list = list.filter((item) => (item.stage || '咨询') === stageFilter)
    }
    this.setData({
      customers: list,
      customerStats: this.makeCustomerStats(this.data.allCustomers)
    })
  },

  goCreate() {
    wx.navigateTo({ url: '/subpackages/internal/pages/customer-edit/customer-edit' })
  },

  goDetail(event) {
    const id = event.currentTarget.dataset.id
    wx.navigateTo({ url: `/subpackages/internal/pages/customer-edit/customer-edit?id=${id}` })
  }
})
