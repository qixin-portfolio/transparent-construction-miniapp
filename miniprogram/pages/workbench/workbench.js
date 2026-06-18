const { call, showError } = require('../../services/cloud')

Page({
  data: {
    authReady: false,
    user: null,
    pendingCount: 0,
    projectCount: 0,
    activeProjectCount: 0,
    loading: false,
    canReview: false,
    canCreateProject: false,
    canUploadLog: false,
    canViewCustomers: false,
    canUseAiAssistant: false,
    canManageStaff: false,
    isOwner: false,
    ownerProject: null,
    ownerStats: {
      logCount: 0,
      photoCount: 0,
      latestStage: '',
      latestDateText: ''
    },
    ownerLatestPhoto: '',
    staffActivateVisible: false,
    staffCode: '',
    staffActivating: false
  },

  onShow() {
    const app = getApp()
    const user = app.globalData.user || null
    this.setAccess(user)
    this.setData({ authReady: false, pendingCount: 0 })
    app.ensureLogin()
      .then((loginUser) => {
        this.setAccess(loginUser)
        this.setData({ authReady: true })
        if (loginUser && loginUser.role === 'owner') {
          this.loadOwnerHome()
          return
        }
        this.loadStaffDashboard()
      })
      .catch(() => {
        this.setData({ authReady: true })
        this.loadStaffDashboard()
      })
  },

  setAccess(user) {
    const role = user && user.role
    this.setData({
      user: user || null,
      canReview: ['admin', 'boss_qi', 'boss_hu'].indexOf(role) !== -1,
      canCreateProject: ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales'].indexOf(role) !== -1,
      canUploadLog: ['admin', 'boss_qi', 'boss_hu', 'designer', 'worker'].indexOf(role) !== -1,
      canViewCustomers: ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales'].indexOf(role) !== -1,
      canUseAiAssistant: ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales'].indexOf(role) !== -1,
      canManageStaff: ['admin', 'boss_qi', 'boss_hu'].indexOf(role) !== -1,
      isOwner: role === 'owner'
    })
  },

  loadOwnerHome() {
    this.setData({ loading: true })
    call('getOwnerProject')
      .then((res) => {
        const logs = res.logs || []
        const stats = this.makeOwnerStats(logs)
        this.setData({
          ownerProject: res.project || null,
          ownerStats: stats,
          ownerLatestPhoto: this.findLatestPhoto(logs)
        })
      })
      .catch(() => {
        this.setData({
          ownerProject: null,
          ownerStats: this.makeOwnerStats([]),
          ownerLatestPhoto: ''
        })
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  loadStaffDashboard() {
    this.setData({ loading: true })
    const pendingTask = call('listPendingStageLogs')
      .then((res) => (res.items || []).length)
      .catch(() => 0)
    const projectTask = call('listMyProjects')
      .then((res) => res.items || [])
      .catch(() => [])

    Promise.all([pendingTask, projectTask])
      .then(([pendingCount, projects]) => {
        const activeProjectCount = projects.filter((item) => (item.status || '施工中') === '施工中').length
        this.setData({
          pendingCount,
          projectCount: projects.length,
          activeProjectCount
        })
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  formatDate(value) {
    if (!value) return ''
    let raw = value
    if (value.$date && value.$date.$numberLong) raw = Number(value.$date.$numberLong)
    if (value.$numberLong) raw = Number(value.$numberLong)
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return ''
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    const hour = `${date.getHours()}`.padStart(2, '0')
    const minute = `${date.getMinutes()}`.padStart(2, '0')
    return `${month}月${day}日 ${hour}:${minute}`
  },

  makeOwnerStats(logs) {
    const latest = logs[0] || {}
    const photoCount = logs.reduce((total, item) => total + ((item.photos || []).length), 0)
    return {
      logCount: logs.length,
      photoCount,
      latestStage: latest.stage || '',
      latestDateText: this.formatDate(latest.createdAt || latest.updatedAt || latest.reviewedAt)
    }
  },

  findLatestPhoto(logs) {
    for (let i = 0; i < logs.length; i += 1) {
      const photos = logs[i].photos || []
      if (photos.length) return photos[0]
    }
    return ''
  },

  goProjects() {
    wx.switchTab({ url: '/pages/projects/projects' })
  },

  goUploadEntry() {
    wx.switchTab({
      url: '/pages/projects/projects',
      success: () => {
        wx.showToast({ title: '先选择工地，再写日报', icon: 'none' })
      }
    })
  },

  goCreateProject() {
    wx.navigateTo({ url: '/subpackages/internal/pages/project-edit/project-edit' })
  },

  goCustomers() {
    wx.navigateTo({ url: '/pages/customers/customers' })
  },

  goReview() {
    wx.navigateTo({ url: '/subpackages/internal/pages/review-log/review-log' })
  },

  goOwnerProject() {
    wx.navigateTo({ url: '/subpackages/owner/pages/owner/owner' })
  },

  goAiAssistant() {
    wx.navigateTo({ url: '/subpackages/internal/pages/ai-assistant/ai-assistant' })
  },

  goProfile() {
    wx.switchTab({ url: '/pages/profile/profile' })
  },

  goStaffManage() {
    wx.navigateTo({ url: '/subpackages/internal/pages/staff-manage/staff-manage' })
  },

  showStaffActivate() {
    this.setData({ staffActivateVisible: true, staffCode: '' })
  },

  hideStaffActivate() {
    if (this.data.staffActivating) return
    this.setData({ staffActivateVisible: false, staffCode: '' })
  },

  onStaffCodeInput(e) {
    this.setData({ staffCode: String(e.detail.value || '').replace(/\D/g, '').slice(0, 6) })
  },

  confirmStaffActivate() {
    const code = String(this.data.staffCode || '').trim()
    if (!/^\d{6}$/.test(code)) {
      wx.showToast({ title: '请输入 6 位邀请码', icon: 'none' })
      return
    }
    this.setData({ staffActivating: true })
    call('bindStaffRole', { code })
      .then((res) => {
        wx.showToast({
          title: res.message || '激活成功',
          icon: 'success',
          duration: 1500
        })
        this.setData({ staffActivateVisible: false, staffCode: '' })
        // 强制重新登录拿新角色，再刷新页面
        const app = getApp()
        app.ensureLogin({ force: true })
          .then((loginUser) => {
            this.setAccess(loginUser)
            this.setData({ authReady: true })
            if (loginUser && loginUser.role === 'owner') {
              this.loadOwnerHome()
            } else {
              this.loadStaffDashboard()
            }
          })
      })
      .catch((err) => {
        showError('激活失败', err)
      })
      .finally(() => {
        this.setData({ staffActivating: false })
      })
  },

  noop() {},

  onError(error) {
    showError('加载失败', error)
  }
})
