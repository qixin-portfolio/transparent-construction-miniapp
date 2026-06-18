const { call, showError } = require('../../services/cloud')
const { DEMO_MODE, demoProjects } = require('../../utils/demo')
const storeConfig = require('../../config/store-config')

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
    projectStats: {
      total: 0,
      active: 0,
      unbound: 0
    },
    isOwner: false,
    // 门店页数据
    storeInfo: storeConfig.storeInfo,
    douyinAccounts: storeConfig.douyinAccounts,
    showcaseCases: storeConfig.showcaseCases,
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
    getApp().ensureLogin()
      .then((user) => {
        const isOwner = user && user.role === 'owner'
        this.setData({
          user,
          canCreate: user && ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales'].indexOf(user.role) !== -1,
          canUpload: user && ['admin', 'boss_qi', 'boss_hu', 'designer', 'worker'].indexOf(user.role) !== -1,
          canManageOwner: user && ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales'].indexOf(user.role) !== -1,
          isOwner
        })
        if (isOwner) {
          // 业主：查一下有没有绑定工地（控制进度入口显示），不查工地列表
          this.checkOwnerProject()
          return
        }
        this.loadProjects()
      })
      .catch((error) => {
        this.setData({ projects: [], user: null, canCreate: false, canUpload: false, canManageOwner: false, isOwner: false })
        showError('登录失败', error)
      })
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

  loadProjects() {
    this.setData({ loading: true })
    call('listMyProjects')
      .then((res) => {
        const items = res.items || []
        this.setData({ allProjects: items })
        this.applyFilter()
      })
      .catch((error) => {
        if (DEMO_MODE) {
          this.setData({ allProjects: demoProjects })
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
      active: items.filter((item) => (item.status || '施工中') === '施工中').length,
      unbound: items.filter((item) => !item.ownerOpenid).length
    }
  },

  goDetail(event) {
    if (this.data.isOwner) {
      wx.navigateTo({ url: '/subpackages/owner/pages/owner/owner' })
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

  // ===== 门店页方法 =====

  goOwnerProgress() {
    wx.navigateTo({ url: '/subpackages/owner/pages/owner/owner' })
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
      .map((item) => item.image)
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
      .then(() => {
        wx.showModal({
          title: '预约已提交',
          content: '晟景顾问会根据您留下的信息联系沟通。',
          showCancel: false,
          confirmText: '知道了'
        })
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
        showError('预约失败', error)
      })
      .finally(() => {
        this.setData({ appointmentSubmitting: false })
      })
  }
})
