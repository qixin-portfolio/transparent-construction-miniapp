const { showError } = require('../../services/cloud')

Page({
  data: {
    user: null,
    loading: false,
    canReview: false,
    canViewCustomers: false,
    canUseAiAssistant: false,
    canManageStaff: false,
    isOwner: false
  },

  onShow() {
    const app = getApp()
    const user = app.globalData.user || null
    this.setData({ user })
    this.setAccess(user)
  },

  setAccess(user) {
    const role = user && user.role
    this.setData({
      canReview: ['admin', 'boss_qi', 'boss_hu'].indexOf(role) !== -1,
      canViewCustomers: ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales'].indexOf(role) !== -1,
      canUseAiAssistant: ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales'].indexOf(role) !== -1,
      canManageStaff: ['admin', 'boss_qi', 'boss_hu'].indexOf(role) !== -1,
      isOwner: role === 'owner'
    })
  },

  login() {
    const app = getApp()
    this.setData({ loading: true })
    app.ensureLogin({ force: true })
      .then((user) => {
        this.setData({ user })
        this.setAccess(user)
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
      })
      .catch((error) => {
        showError('登录失败', error)
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  goProjects() {
    wx.switchTab({ url: '/pages/projects/projects' })
  },

  goCustomers() {
    wx.navigateTo({ url: '/pages/customers/customers' })
  },

  goReview() {
    wx.navigateTo({ url: '/subpackages/internal/pages/review-log/review-log' })
  },

  goAiAssistant() {
    wx.navigateTo({ url: '/subpackages/internal/pages/ai-assistant/ai-assistant' })
  },

  goStaffManage() {
    wx.navigateTo({ url: '/subpackages/internal/pages/staff-manage/staff-manage' })
  },

  goOwnerProject() {
    wx.navigateTo({ url: '/subpackages/owner/pages/owner/owner' })
  }
})
