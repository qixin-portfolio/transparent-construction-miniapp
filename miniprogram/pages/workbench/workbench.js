const { call, showError } = require('../../services/cloud')

Page({
  data: {
    user: null,
    pendingCount: 0,
    loading: false,
    canReview: false,
    canViewCustomers: false
  },

  onShow() {
    const app = getApp()
    const user = app.globalData.user || null
    this.setAccess(user)
    this.setData({ pendingCount: 0 })
    app.ensureLogin()
      .then((loginUser) => {
        this.setAccess(loginUser)
        this.loadPendingCount()
      })
      .catch(() => {
        this.loadPendingCount()
      })
  },

  setAccess(user) {
    const role = user && user.role
    this.setData({
      user: user || null,
      canReview: ['admin', 'boss_qi', 'boss_hu'].indexOf(role) !== -1,
      canViewCustomers: ['admin', 'boss_qi', 'boss_hu', 'designer'].indexOf(role) !== -1
    })
  },

  loadPendingCount() {
    this.setData({ loading: true })
    call('listPendingStageLogs')
      .then((res) => {
        this.setData({ pendingCount: (res.items || []).length })
      })
      .catch(() => {
        this.setData({ pendingCount: 0 })
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  goProjects() {
    wx.switchTab({ url: '/pages/projects/projects' })
  },

  goCustomers() {
    wx.switchTab({ url: '/pages/customers/customers' })
  },

  goReview() {
    wx.navigateTo({ url: '/pages/review-log/review-log' })
  },

  goOwnerProject() {
    wx.navigateTo({ url: '/pages/owner/owner' })
  },

  goProfile() {
    wx.switchTab({ url: '/pages/profile/profile' })
  },

  onError(error) {
    showError('加载失败', error)
  }
})
