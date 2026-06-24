const { showError } = require('../../services/cloud')

function safePathText(text) {
  return String(text || 'user')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '-')
    .slice(0, 40)
}

Page({
  data: {
    user: null,
    loading: false,
    roleLabel: '',
    canReview: false,
    canViewCustomers: false,
    canUseAiAssistant: false,
    canManageStaff: false,
    isOwner: false,
    profileSaving: false,
    profileSyncEditing: false,
    profileForm: {
      nickName: '',
      avatarUrl: '',
      avatarTempPath: '',
      avatarFileID: ''
    }
  },

  onShow() {
    this.syncTabBar()
    const app = getApp()
    const user = app.normalizeUser ? app.normalizeUser(app.globalData.user || null) : (app.globalData.user || null)
    this.setData({ user })
    this.setAccess(user)
  },

  syncTabBar() {
    const tabBar = this.getTabBar && this.getTabBar()
    if (!tabBar) return
    tabBar.buildList()
    tabBar.setData({ selected: 2 })
  },

  setAccess(user) {
    const role = user && user.role
    const hasWechatProfile = !!(user && user.hasWechatProfile)
    this.setData({
      roleLabel: user && user.roleLabel ? user.roleLabel : '',
      profileSyncEditing: !hasWechatProfile,
      profileForm: {
        nickName: user ? (user.nickName || user.name || '') : '',
        avatarUrl: user ? (user.avatarUrl || '') : '',
        avatarTempPath: '',
        avatarFileID: user ? (user.avatarFileID || '') : ''
      },
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

  showProfileSyncEditor() {
    this.setData({ profileSyncEditing: true })
  },

  hideProfileSyncEditor() {
    if (this.data.profileSaving) return
    if (!this.data.user || !this.data.user.hasWechatProfile) return
    this.setData({ profileSyncEditing: false })
  },

  onChooseAvatar(event) {
    const avatarUrl = event.detail && event.detail.avatarUrl ? event.detail.avatarUrl : ''
    if (!avatarUrl) return
    this.setData({
      'profileForm.avatarUrl': avatarUrl,
      'profileForm.avatarTempPath': avatarUrl
    })
  },

  onNickNameInput(event) {
    this.setData({
      'profileForm.nickName': event.detail.value || ''
    })
  },

  uploadProfileAvatar() {
    const form = this.data.profileForm || {}
    const filePath = form.avatarTempPath || ''
    if (!filePath) return Promise.resolve(form.avatarFileID || '')

    const suffix = filePath.match(/\.[a-zA-Z0-9]+(?=$|\?)/)
    const ext = suffix ? suffix[0] : '.jpg'
    const user = this.data.user || {}
    const cloudPath = [
      'user-avatars',
      safePathText(user._id || user.openid || 'me'),
      `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`
    ].join('/')

    return wx.cloud.uploadFile({
      cloudPath,
      filePath
    }).then((res) => res.fileID)
  },

  saveWechatProfile() {
    const app = getApp()
    const form = this.data.profileForm || {}
    const nickName = String(form.nickName || '').trim()

    if (!this.data.user) {
      this.login()
      return
    }
    if (!nickName && !form.avatarTempPath && !form.avatarFileID) {
      wx.showToast({
        title: '请先填写昵称或选择头像',
        icon: 'none'
      })
      return
    }

    this.setData({ profileSaving: true })
    this.uploadProfileAvatar()
      .then((avatarFileID) => app.syncWechatProfile({
        nickName,
        avatarFileID
      }))
      .then((user) => {
        this.setData({ user })
        this.setAccess(user)
        this.setData({ profileSyncEditing: false })
        wx.showToast({
          title: '已保存',
          icon: 'success'
        })
      })
      .catch((error) => {
        showError('保存失败', error)
      })
      .finally(() => {
        this.setData({ profileSaving: false })
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
    wx.navigateTo({ url: '/subpackages/owner/pages/projects/projects' })
  }
})
