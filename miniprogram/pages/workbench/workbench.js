const { call, showError } = require('../../services/cloud')
const { isProjectInProgress } = require('../../utils/status')
const { DEFAULT_TENANT_ID } = require('../../config/tenant-defaults')

const SHENGJING_SLOGAN = {
  primary: '交城 28 年老品牌',
  secondary: '每个工地都留痕'
}

const TENANT_SLOGAN = {
  primary: '客户看得见进度',
  secondary: '每个节点都留痕'
}

Page({
  data: {
    authReady: false,
    user: null,
    pendingCount: 0,
    projectCount: 0,
    activeProjectCount: 0,
    afterSalesPendingCount: 0,
    loading: false,
    canReview: false,
    canCreateProject: false,
    canUploadLog: false,
    canViewCustomers: false,
    canUseAiAssistant: false,
    canManageStaff: false,
    canAfterSales: false,
    isBoss: false,
    isOwner: false,
    isWorker: false,
   bossDashboard: null,
    tenantPlan: null,
   bossMetrics: {
     todayUploadedCount: 0,
     staleProjectCount: 0,
     issueLogCount: 0,
     newCustomerCount: 0,
     signedCustomerCount: 0,
     conversionRate: 0
   },
    bossAlerts: [],
    staffRank: [],
    recentActivities: [],
    ownerProject: null,
    ownerStats: {
      logCount: 0,
      photoCount: 0,
      latestStage: '',
      latestDateText: ''
    },
    ownerLatestPhoto: '',
    ownerPortal: null,
    completedProject: null,
    historicalCustomer: null,
    staffActivateVisible: false,
    staffCode: '',
    staffActivating: false,
    workerProject: null,
    workerRecentLogs: [],
    workerCheckins: [],
    workerCheckingIn: false,
    workerProjectCodeVisible: false,
    workerProjectCode: '',
    workerProjectBinding: false,
    workbenchSloganPrimary: SHENGJING_SLOGAN.primary,
    workbenchSloganSecondary: SHENGJING_SLOGAN.secondary
  },

  onShow() {
    this.syncTabBar()
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
      .catch((error) => {
        if (error && error.needRegister) return
        this.setData({ authReady: true })
        this.loadStaffDashboard()
      })
  },

  syncTabBar() {
    const tabBar = this.getTabBar && this.getTabBar()
    if (!tabBar) return
    tabBar.buildList()
    tabBar.setData({ selected: 0 })
  },

  getWorkbenchSlogan(user) {
    const isShengjingTenant = !user || !user.tenantId || user.tenantId === DEFAULT_TENANT_ID
    return isShengjingTenant ? SHENGJING_SLOGAN : TENANT_SLOGAN
  },

  setAccess(user) {
    const app = getApp()
    const displayUser = app.normalizeUser ? app.normalizeUser(user || null) : (user || null)
    user = displayUser
    const role = user && user.role
    const slogan = this.getWorkbenchSlogan(user)
    this.setData({
      user: user || null,
      workbenchSloganPrimary: slogan.primary,
      workbenchSloganSecondary: slogan.secondary,
      canReview: ['admin', 'boss_qi', 'boss_hu'].indexOf(role) !== -1,
      canCreateProject: ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales'].indexOf(role) !== -1,
      canUploadLog: ['admin', 'boss_qi', 'boss_hu', 'designer', 'worker', 'project_manager'].indexOf(role) !== -1,
      canViewCustomers: ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales'].indexOf(role) !== -1,
      canUseAiAssistant: ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales'].indexOf(role) !== -1,
      canManageStaff: ['admin', 'boss_qi', 'boss_hu'].indexOf(role) !== -1,
      canAfterSales: ['admin', 'boss_qi', 'boss_hu', 'designer', 'worker'].indexOf(role) !== -1,
      canPreviewOwner: ['admin', 'boss_qi', 'boss_hu'].indexOf(role) !== -1,
      isBoss: ['admin', 'boss_qi', 'boss_hu'].indexOf(role) !== -1,
      isOwner: role === 'owner',
      isWorker: ['worker', 'project_manager'].indexOf(role) !== -1
    })
  },

  loadOwnerHome() {
    this.setData({ loading: true })
    call('getOwnerPortal')
      .then((portalRes) => {
        const portal = portalRes || {}
        this.setData({
          ownerPortal: portal,
          completedProject: portal.completedProject || null,
          historicalCustomer: portal.historicalCustomer || null
        })
        if (portal.activeProject) {
          return call('getOwnerProject')
        }
        return { project: null, logs: [] }
      })
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
          ownerPortal: null,
          completedProject: null,
          historicalCustomer: null,
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
    const afterSalesTask = this.data.canAfterSales
      ? call('listAfterSalesTickets', { scope: 'staff', status: 'pending' })
          .then((res) => (res.items || []).length)
          .catch(() => 0)
      : Promise.resolve(0)

   if (this.data.isBoss) {
      Promise.all([call('getBossDashboard'), afterSalesTask, call('getCurrentTenantPlan').catch(() => null)])
        .then(([res, afterSalesCount, planRes]) => {
          const dashboard = res.dashboard || null
          const metrics = dashboard && dashboard.metrics ? dashboard.metrics : {}
          const tenantPlan = planRes && planRes.success ? planRes : null
          this.setData({
            pendingCount: metrics.pendingReviewCount || 0,
            projectCount: metrics.projectCount || 0,
            activeProjectCount: metrics.activeProjectCount || 0,
            afterSalesPendingCount: afterSalesCount,
            tenantPlan,
            bossDashboard: dashboard,
            bossMetrics: Object.assign({}, this.data.bossMetrics, metrics),
            bossAlerts: dashboard ? (dashboard.alerts || []) : [],
            staffRank: dashboard ? (dashboard.staffRank || []) : [],
            recentActivities: dashboard ? (dashboard.recentActivities || []) : []
          })
        })
        .catch(() => {
          this.setData({
            pendingCount: 0,
            projectCount: 0,
            activeProjectCount: 0,
            afterSalesPendingCount: 0,
            tenantPlan: null,
            bossDashboard: null,
            bossAlerts: [],
            staffRank: [],
            recentActivities: []
          })
        })
        .finally(() => {
          this.setData({ loading: false })
        })
      return
    }

    if (this.data.isWorker) {
      this.loadWorkerDashboard()
      return
    }

    const pendingTask = call('listPendingStageLogs')
      .then((res) => (res.items || []).length)
      .catch(() => 0)
    const projectTask = call('listMyProjects')
      .then((res) => res.items || [])
      .catch(() => [])
    const bossTask = this.data.isBoss
      ? call('getBossDashboard').then((res) => res.dashboard || null).catch(() => null)
      : Promise.resolve(null)

    Promise.all([pendingTask, projectTask, bossTask, afterSalesTask])
      .then(([pendingCount, projects, dashboard, afterSalesCount]) => {
        const activeProjectCount = projects.filter(isProjectInProgress).length
        const metrics = dashboard && dashboard.metrics ? dashboard.metrics : {}
        this.setData({
          pendingCount: metrics.pendingReviewCount != null ? metrics.pendingReviewCount : pendingCount,
          projectCount: projects.length,
          activeProjectCount: metrics.activeProjectCount != null ? metrics.activeProjectCount : activeProjectCount,
          afterSalesPendingCount: afterSalesCount,
          bossDashboard: dashboard,
          bossMetrics: Object.assign({}, this.data.bossMetrics, metrics),
          bossAlerts: dashboard ? (dashboard.alerts || []) : [],
          staffRank: dashboard ? (dashboard.staffRank || []) : [],
          recentActivities: dashboard ? (dashboard.recentActivities || []) : []
        })
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  loadWorkerDashboard() {
    call('listMyProjects')
      .then((res) => {
        const projects = res.items || []
        const project = projects[0] || null
        if (!project) {
          this.setData({
            pendingCount: 0,
            projectCount: 0,
            activeProjectCount: 0,
            workerProject: null,
            workerRecentLogs: [],
            workerCheckins: []
          })
          return null
        }

        const detailTask = call('getProjectDetail', { projectId: project._id })
          .then((detail) => detail.logs || [])
          .catch(() => [])
        const checkinTask = call('listWorkerCheckins', { projectId: project._id })
          .then((checkinRes) => checkinRes.items || [])
          .catch(() => [])

        return Promise.all([detailTask, checkinTask]).then(([logs, checkins]) => {
          const activeProjectCount = projects.filter(isProjectInProgress).length
          this.setData({
            pendingCount: 0,
            projectCount: projects.length,
            activeProjectCount,
            workerProject: project,
            workerRecentLogs: this.makeWorkerLogs(logs),
            workerCheckins: this.makeWorkerCheckins(checkins)
          })
          return null
        })
      })
      .catch((error) => {
        this.setData({
          pendingCount: 0,
          projectCount: 0,
          activeProjectCount: 0,
          workerProject: null,
          workerRecentLogs: [],
          workerCheckins: []
        })
        showError('工长工作台加载失败', error)
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

  makeWorkerLogs(logs) {
    return (logs || []).slice(0, 5).map((item) => {
      const status = item.reviewStatus || 'pending'
      return Object.assign({}, item, {
        dateText: this.formatDate(item.createdAt || item.updatedAt),
        statusText: status === 'approved' ? '已发布' : (status === 'rejected' ? '已退回' : '待审核')
      })
    })
  },

  makeWorkerCheckins(items) {
    return (items || []).slice(0, 5).map((item) => Object.assign({}, item, {
      dateText: this.formatDate(item.createdAt || item.updatedAt)
    }))
  },

  goProjects() {
    wx.switchTab({ url: '/pages/projects/projects' })
  },

  goUploadEntry() {
    if (this.data.isWorker) {
      this.goWorkerUpload()
      return
    }
    wx.switchTab({
      url: '/pages/projects/projects',
      success: () => {
        wx.showToast({ title: '先选择工地，再写日报', icon: 'none' })
      }
    })
  },

  goWorkerUpload() {
    const project = this.data.workerProject || {}
    if (!project._id) {
      wx.showToast({ title: '还未绑定工地', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: `/subpackages/internal/pages/upload-log/upload-log?projectId=${project._id}&projectName=${encodeURIComponent(project.name || '')}`
    })
  },

  goWorkerProject() {
    const project = this.data.workerProject || {}
    if (!project._id) {
      wx.showToast({ title: '还未绑定工地', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/subpackages/internal/pages/project-detail/project-detail?id=${project._id}` })
  },

  showWorkerProjectBind() {
    this.setData({ workerProjectCodeVisible: true, workerProjectCode: '' })
  },

  hideWorkerProjectBind() {
    if (this.data.workerProjectBinding) return
    this.setData({ workerProjectCodeVisible: false, workerProjectCode: '' })
  },

  onWorkerProjectCodeInput(event) {
    this.setData({
      workerProjectCode: String(event.detail.value || '').replace(/\D/g, '').slice(0, 6)
    })
  },

  confirmWorkerProjectBind() {
    const code = String(this.data.workerProjectCode || '').trim()
    if (!/^\d{6}$/.test(code)) {
      wx.showToast({ title: '请输入 6 位工长绑定码', icon: 'none' })
      return
    }
    if (this.data.workerProjectBinding) return

    this.setData({ workerProjectBinding: true })
    call('bindWorkerProject', { code })
      .then((res) => {
        wx.showToast({ title: res.message || '绑定成功', icon: 'success' })
        this.setData({ workerProjectCodeVisible: false, workerProjectCode: '' })
        this.loadWorkerDashboard()
      })
      .catch((error) => {
        showError('绑定失败', error)
      })
      .finally(() => {
        this.setData({ workerProjectBinding: false })
      })
  },

  recordWorkerCheckin() {
    const project = this.data.workerProject || {}
    if (!project._id) {
      wx.showToast({ title: '还未绑定工地', icon: 'none' })
      return
    }
    if (this.data.workerCheckingIn) return

    this.setData({ workerCheckingIn: true })
    call('recordWorkerCheckin', { projectId: project._id })
      .then((res) => {
        wx.showToast({
          title: res.alreadyChecked ? '今天已打卡' : '已打卡',
          icon: res.alreadyChecked ? 'none' : 'success'
        })
        return call('listWorkerCheckins', { projectId: project._id })
      })
      .then((res) => {
        this.setData({ workerCheckins: this.makeWorkerCheckins(res.items || []) })
      })
      .catch((error) => {
        showError('打卡失败', error)
      })
      .finally(() => {
        this.setData({ workerCheckingIn: false })
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
    wx.navigateTo({ url: '/subpackages/owner/pages/projects/projects' })
  },

  goCompletedHome() {
    const project = this.data.completedProject || {}
    if (!project._id) {
      wx.showToast({ title: '暂无完工服务', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/subpackages/owner/pages/completed-home/completed-home?projectId=${project._id}` })
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

  goAfterSalesManage() {
    wx.navigateTo({ url: '/subpackages/internal/pages/after-sales-list/after-sales-list' })
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
