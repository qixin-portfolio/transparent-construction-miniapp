const { call, showError } = require('../../services/cloud')
const { DEMO_MODE, demoCustomers } = require('../../utils/demo')

Page({
  data: {
    loading: false,
    customers: [],
    user: null,
    canCreate: false
  },

  onShow() {
    getApp().ensureLogin()
      .then((user) => {
        const canUseCustomers = user && ['admin', 'boss_qi', 'boss_hu', 'designer'].indexOf(user.role) !== -1
        this.setData({
          user,
          canCreate: canUseCustomers
        })
        if (!user || ['owner', 'worker'].indexOf(user.role) !== -1) {
          this.setData({ customers: [] })
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
        this.setData({ customers: res.items || [] })
      })
      .catch((error) => {
        if (DEMO_MODE) {
          this.setData({ customers: demoCustomers })
          return
        }
        this.setData({ customers: [] })
        showError('客户加载失败', error)
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/customer-edit/customer-edit' })
  }
})
