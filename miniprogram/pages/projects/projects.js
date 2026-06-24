const { call, showError } = require('../../services/cloud')
const { DEMO_MODE, demoProjects } = require('../../utils/demo')
const { getProjectStatusCode, getProjectStatusLabel, isProjectInProgress } = require('../../utils/status')
const storeConfig = require('../../config/store-config')
const { formatPublicCases } = require('../../utils/caseDisplay')
const { getReferenceCases } = require('../../utils/reference-cases')

Page({
  data: {
    loading: false,
    projects: [],
    allProjects: [],
    searchKeyword: '',
    statusFilter: '',
    user: null,
    canCreate: false,
    canUpload: false,
    canManageOwner: false,
    canDelete: false,
    isWorker: false,
    workerProjectCodeVisible: false,
    workerProjectCode: '',
    workerProjectBinding: false,
    workerCheckingProjectId: '',
    projectStats: {
      total: 0,
      active: 0,
      unbound: 0
    },
    isOwner: false,
    // 门店页数据
    storeBrandName: storeConfig.storeInfo.name,
    storeSlogan: '交城 28 年本土硬核金牌老品牌',
    storeTags: ['高定全案整装', '私宅空间定制', '全德系工程工艺'],
    advisors: storeConfig.advisors,
    storeInfo: storeConfig.storeInfo,
    douyinAccounts: storeConfig.douyinAccounts,
    showcaseCases: [],
    caseSource: '',
    contactInfo: storeConfig.contactInfo,
    hasOwnerProject: false,
    appointmentVisible: false,
    appointmentSubmitting: false,
    appointmentForm: {
      name: '',
      phone: '',
      address: '',
      need: ''
    }
  },

  onShow() {
    this.syncTabBar()
    getApp().ensureLogin()
      .then((user) => {
        const isOwner = user && user.role === 'owner'
        const isWorker = user && ['worker', 'project_manager'].indexOf(user.role) !== -1
        this.setData({
          user,
          canCreate: user && ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales'].indexOf(user.role) !== -1,
          canUpload: user && ['admin', 'boss_qi', 'boss_hu', 'designer', 'worker', 'project_manager'].indexOf(user.role) !== -1,
          canManageOwner: user && ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales'].indexOf(user.role) !== -1,
          canDelete: user && user.role === 'admin',
          isOwner,
          isWorker
        })
        if (isOwner) {
          this.loadTenantBranding()
          this.loadPublicCases()
          // 业主：查一下有没有绑定工地（控制进度入口显示），不查工地列表
          this.checkOwnerProject()
          return
        }
        this.loadProjects()
      })
      .catch((error) => {
        this.setData({ projects: [], user: null, canCreate: false, canUpload: false, canManageOwner: false, canDelete: false, isOwner: false, isWorker: false })
        showError('登录失败', error)
      })
  },

  syncTabBar() {
    const tabBar = this.getTabBar && this.getTabBar()
    if (!tabBar) return
    tabBar.buildList()
    tabBar.setData({ selected: 1 })
  },

  checkOwnerProject() {
    call('getOwnerProject')
      .then((res) => {
        this.setData({ hasOwnerProject: !!res.project })
      })
      .catch(() => {
        this.setData({ hasOwnerProject: false })
      })
  },

  // 加载公开完工案例（前 3 条显示在门店首页）
  // 策略：品牌参考案例永远用本地（带图）排在前面，真实授权案例（云端真实照片）排在后面
  loadPublicCases() {
    call('listPublicCases', { action: 'list' })
      .then((res) => {
        const rawCases = res.cases || []
        // 过滤掉云函数返回的参考案例（旧版本可能 coverImage 为空）
        // 参考案例永远用本地版本，保证图片路径一致
        const realCases = rawCases.filter((c) => !c.isReference)
        // 本地参考案例（品牌门面）排前面，真实授权案例排后面
        const allRaw = getReferenceCases().concat(realCases)
        const allFormatted = formatPublicCases(allRaw)
        this.setData({
          showcaseCases: allFormatted.slice(0, 3),
          caseSource: realCases.length > 0 ? 'mixed' : 'reference'
        })
      })
      .catch(() => {
        // 云函数未部署或调用失败：全部用本地参考案例（带图片）
        const fallback = formatPublicCases(getReferenceCases())
        this.setData({ showcaseCases: fallback.slice(0, 3), caseSource: 'reference' })
      })
  },

  goCaseList() {
    wx.navigateTo({ url: '/subpackages/owner/pages/case-list/case-list' })
  },

  goCaseDetail(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    wx.navigateTo({ url: `/subpackages/owner/pages/case-detail/case-detail?caseId=${id}` })
  },

  loadTenantBranding() {
    call('getTenantBranding')
      .then((res) => {
        const branding = res.branding || {}
        const tenantName = branding.tenantName || storeConfig.storeInfo.name
        this.setData({
          storeBrandName: tenantName,
          storeSlogan: branding.slogan || this.data.storeSlogan,
          storeTags: Array.isArray(branding.tags) && branding.tags.length ? branding.tags : this.data.storeTags,
          storeInfo: Object.assign({}, this.data.storeInfo, {
            name: tenantName,
            address: branding.address || this.data.storeInfo.address,
            phone: branding.contactPhone || this.data.storeInfo.phone,
            hours: branding.businessHours || this.data.storeInfo.hours
          }),
          contactInfo: Object.assign({}, this.data.contactInfo, {
            name: tenantName,
            phone: branding.contactPhone || this.data.contactInfo.phone,
            wechat: branding.contactPhone || this.data.contactInfo.wechat
          })
        })
      })
      .catch(() => {})
  },

  loadProjects() {
    this.setData({ loading: true })
    call('listMyProjects')
      .then((res) => {
        const items = res.items || []
        this.setData({ allProjects: this.prepareProjects(items) })
        this.applyFilter()
      })
      .catch((error) => {
        if (DEMO_MODE) {
          this.setData({ allProjects: this.prepareProjects(demoProjects) })
          this.applyFilter()
          return
        }
        this.setData({ allProjects: [], projects: [] })
        showError('工地加载失败', error)
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  onSearch(e) {
    this.setData({ searchKeyword: String(e.detail.value || '').trim() })
    this.applyFilter()
  },

  onStatusFilter(e) {
    this.setData({ statusFilter: e.currentTarget.dataset.status || '' })
    this.applyFilter()
  },

  isProjectUnbound(project) {
    const ownerOpenids = Array.isArray(project.ownerOpenids) ? project.ownerOpenids.filter(Boolean) : []
    return !project.ownerOpenid && !ownerOpenids.length
  },

  prepareProjects(items) {
    return (items || []).map((item) => Object.assign({}, item, {
      statusCode: getProjectStatusCode(item),
      statusText: getProjectStatusLabel(item)
    }))
  },

  applyFilter() {
    const keyword = this.data.searchKeyword.toLowerCase()
    const status = this.data.statusFilter
    let list = this.data.allProjects
    if (keyword) {
      list = list.filter(function (item) {
        return (item.name && item.name.toLowerCase().indexOf(keyword) !== -1) ||
               (item.address && item.address.toLowerCase().indexOf(keyword) !== -1)
      })
    }
    if (status) {
      list = list.filter(function (item) {
        if (status === '施工中') return getProjectStatusCode(item) === 'in_progress'
        if (status === 'unbound') {
          const ownerOpenids = Array.isArray(item.ownerOpenids) ? item.ownerOpenids.filter(Boolean) : []
          return !item.ownerOpenid && !ownerOpenids.length
        }
        if (['已完工', '完工', '已竣工', '竣工验收'].indexOf(status) !== -1) return getProjectStatusCode(item) === 'completed'
        if (status === '已交付') return getProjectStatusCode(item) === 'delivered'
        if (status === '售后中') return getProjectStatusCode(item) === 'after_sales'
        return (item.status || '施工中') === status
      })
    }
    this.setData({
      projects: list,
      projectStats: this.makeProjectStats(this.data.allProjects)
    })
  },

  makeProjectStats(projects) {
    const items = projects || []
    return {
      total: items.length,
      active: items.filter(isProjectInProgress).length,
      unbound: items.filter(this.isProjectUnbound).length
    }
  },

  goDetail(event) {
    if (this.data.isOwner) {
      wx.navigateTo({ url: '/subpackages/owner/pages/projects/projects' })
      return
    }
    const id = event.currentTarget.dataset.id
    wx.navigateTo({
      url: `/subpackages/internal/pages/project-detail/project-detail?id=${id}`
    })
  },

  goCreate() {
    wx.navigateTo({ url: '/subpackages/internal/pages/project-edit/project-edit' })
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
        this.loadProjects()
      })
      .catch((error) => {
        showError('绑定失败', error)
      })
      .finally(() => {
        this.setData({ workerProjectBinding: false })
      })
  },

  goUploadFromProject(event) {
    if (!this.data.canUpload) {
      showError('当前账号不能上传日报')
      return
    }
    const id = event.currentTarget.dataset.id || ''
    const name = encodeURIComponent(event.currentTarget.dataset.name || '')
    if (!id) {
      showError('缺少工地 ID')
      return
    }
    wx.navigateTo({
      url: `/subpackages/internal/pages/upload-log/upload-log?projectId=${id}&projectName=${name}`
    })
  },

  recordWorkerCheckinFromProject(event) {
    if (!this.data.isWorker) {
      showError('仅工长或项目经理可以使用到场打卡')
      return
    }
    const id = event.currentTarget.dataset.id || ''
    if (!id) {
      showError('缺少工地 ID')
      return
    }
    if (this.data.workerCheckingProjectId) return

    this.setData({ workerCheckingProjectId: id })
    call('recordWorkerCheckin', { projectId: id })
      .then((res) => {
        wx.showToast({
          title: res.alreadyChecked ? '今天已打卡' : '已打卡',
          icon: res.alreadyChecked ? 'none' : 'success'
        })
      })
      .catch((error) => {
        showError('打卡失败', error)
      })
      .finally(() => {
        this.setData({ workerCheckingProjectId: '' })
      })
  },

  goBindFromProject(event) {
    if (!this.data.canManageOwner) {
      showError('当前账号不能管理业主绑定')
      return
    }
    const id = event.currentTarget.dataset.id || ''
    if (!id) {
      showError('缺少工地 ID')
      return
    }
    wx.navigateTo({
      url: `/subpackages/internal/pages/project-detail/project-detail?id=${id}`
    })
  },

  deleteProject(event) {
    if (!this.data.canDelete) {
      showError('仅管理员可删除工地')
      return
    }
    const id = event.currentTarget.dataset.id || ''
    const name = event.currentTarget.dataset.name || '该工地'
    if (!id) {
      showError('缺少工地 ID')
      return
    }
    wx.showModal({
      title: '删除工地',
      content: `确认删除「${name}」？该工地的日报、照片、绑定码、成员和图纸也会一并清理。`,
      confirmText: '删除',
      confirmColor: '#D9534F',
      success: (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '删除中...' })
        call('deleteProject', { projectId: id })
          .then(() => {
            wx.showToast({ title: '已删除', icon: 'success' })
            this.loadProjects()
          })
          .catch((error) => {
            showError('删除失败', error)
          })
          .finally(() => {
            wx.hideLoading()
          })
      }
    })
  },

  // ===== 门店页方法 =====

  copyAdvisorDouyin(event) {
    const id = event.currentTarget.dataset.douyin
    const name = event.currentTarget.dataset.name
    wx.setClipboardData({
      data: id,
      success: () => {
        wx.showModal({
          title: `已复制「${name}」抖音号`,
          content: `抖音号：${id}\n\n打开抖音搜索关注，看更多装修内容。`,
          showCancel: false,
          confirmText: '知道了'
        })
      }
    })
  },

  goOwnerProgress() {
    wx.navigateTo({ url: '/subpackages/owner/pages/projects/projects' })
  },

  copyDouyinId(event) {
    const id = event.currentTarget.dataset.id
    const name = event.currentTarget.dataset.name
    wx.setClipboardData({
      data: id,
      success: () => {
        wx.showModal({
          title: `已复制「${name}」抖音号`,
          content: `抖音号：${id}\n\n打开抖音搜索关注，看更多装修内容。`,
          showCancel: false,
          confirmText: '知道了'
        })
      }
    })
  },

  callStore() {
    wx.makePhoneCall({
      phoneNumber: this.data.storeInfo.phone
    })
  },

  openMap() {
    const info = this.data.storeInfo
    wx.openLocation({
      latitude: info.latitude,
      longitude: info.longitude,
      name: info.name,
      address: info.address,
      scale: 16
    })
  },

  previewCaseImage(event) {
    const url = event.currentTarget.dataset.url
    const urls = this.data.showcaseCases
      .map((item) => item.coverImage)
      .filter(Boolean)
    if (url && urls.length) {
      wx.previewImage({ current: url, urls })
    }
  },

  contactAdvisor() {
    wx.makePhoneCall({
      phoneNumber: this.data.contactInfo.phone
    })
  },

  showAppointment() {
    this.setData({ appointmentVisible: true })
  },

  hideAppointment() {
    if (this.data.appointmentSubmitting) return
    this.setData({ appointmentVisible: false })
  },

  noop() {},

  onAppointmentInput(event) {
    const key = event.currentTarget.dataset.key
    let value = event.detail.value || ''
    if (key === 'phone') {
      value = String(value).replace(/\D/g, '').slice(0, 11)
    }
    this.setData({
      [`appointmentForm.${key}`]: value
    })
  },

  submitAppointment() {
    const form = this.data.appointmentForm
    const name = String(form.name || '').trim()
    const phone = String(form.phone || '').trim()
    if (!name) {
      showError('请填写姓名')
      return
    }
    if (!/^1\d{10}$/.test(phone)) {
      showError('请填写正确手机号')
      return
    }

    this.setData({ appointmentSubmitting: true })
    call('createCustomer', {
      name,
      phone,
      address: String(form.address || '').trim(),
      need: String(form.need || '').trim(),
      source: '门店展示页预约',
      stage: '咨询',
      dealStatus: '未成交'
    })
      .then((res) => {
        if (res && res.duplicated) {
          wx.showModal({
            title: '您已预约过',
            content: '该手机号已登记过，顾问会尽快与您联系。如需修改信息请联系门店。',
            showCancel: false,
            confirmText: '知道了'
          })
        } else {
          wx.showModal({
            title: '预约已提交',
            content: '晟景顾问会根据您留下的信息联系沟通。',
            showCancel: false,
            confirmText: '知道了'
          })
        }
        this.setData({
          appointmentVisible: false,
          appointmentForm: {
            name: '',
            phone: '',
            address: '',
            need: ''
          }
        })
      })
      .catch((error) => {
        const msg = (error && error.message) ? error.message : '请稍后再试'
        wx.showModal({
          title: '预约失败',
          content: msg,
          showCancel: false,
          confirmText: '知道了'
        })
        console.error('[预约] createCustomer 失败:', error)
      })
      .finally(() => {
        this.setData({ appointmentSubmitting: false })
      })
  }
})
