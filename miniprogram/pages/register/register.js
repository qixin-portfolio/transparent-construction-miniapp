const { call, showError } = require('../../services/cloud')

Page({
  data: {
    submitting: false,
    isBossEntry: false,
    form: {
      companyName: '',
      bossName: '',
      phone: '',
      city: '',
      mainBusiness: ''
    }
  },

  onLoad(options = {}) {
    const isBossEntry = options.entry === 'boss_register'
    this.setData({ isBossEntry })
    if (this.routeEntryContext()) return
    if (!isBossEntry) {
      this.handleInvalidEntry()
      return
    }

    const app = getApp()
    const user = app.globalData.user || null
    if (user && user.tenantId) {
      this.goWorkbench()
    }
  },

  onShow() {
    if (this.routeEntryContext()) return
    this.routeExistingNonBossUser()
  },

  routeEntryContext() {
    const app = getApp()
    const context = app.getEntryContext ? app.getEntryContext() : null
    if (!context) return false

    if (context.type === 'owner_bind') {
      const query = context.bindCode ? `?bindCode=${context.bindCode}` : ''
      if (app.clearEntryContext) app.clearEntryContext()
      wx.redirectTo({
        url: `/subpackages/owner/pages/owner/owner${query}`
      })
      return true
    }

    if (context.type === 'staff_join' || context.type === 'worker_bind') {
      wx.switchTab({
        url: '/pages/workbench/workbench'
      })
      return true
    }

    if (context.type === 'public') {
      if (app.clearEntryContext) app.clearEntryContext()
      wx.reLaunch({
        url: '/pages/projects/projects?entry=public'
      })
      return true
    }

    return false
  },

  routeExistingNonBossUser() {
    const app = getApp()
    const user = app.globalData.user || null
    if (!user || !user.role) return false

    if (user.role === 'owner') {
      wx.redirectTo({
        url: '/subpackages/owner/pages/projects/projects'
      })
      return true
    }

    if (['worker', 'project_manager', 'designer', 'sales'].indexOf(user.role) !== -1) {
      this.goWorkbench()
      return true
    }

    return false
  },

  handleInvalidEntry() {
    wx.showToast({
      title: '请从装修公司注册入口进入',
      icon: 'none'
    })

    setTimeout(() => {
      const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
      if (pages.length > 1) {
        wx.navigateBack()
        return
      }
      wx.reLaunch({
        url: '/pages/projects/projects?entry=public'
      })
    }, 1200)
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field
    if (!field) return

    let value = event.detail.value || ''
    if (field === 'phone') {
      value = String(value).replace(/\D/g, '').slice(0, 11)
    }

    this.setData({
      [`form.${field}`]: value
    })
  },

  validateForm() {
    const form = this.data.form
    if (!String(form.companyName || '').trim()) throw new Error('请填写公司名称')
    if (!String(form.bossName || '').trim()) throw new Error('请填写老板姓名')
    if (!/^1\d{10}$/.test(String(form.phone || '').trim())) throw new Error('请填写正确手机号')
    if (!String(form.city || '').trim()) throw new Error('请填写所在城市')
  },

  submitRegister() {
    if (!this.data.isBossEntry) {
      this.handleInvalidEntry()
      return
    }

    if (this.data.submitting) return

    try {
      this.validateForm()
    } catch (error) {
      showError(error.message)
      return
    }

    const form = this.data.form
    this.setData({ submitting: true })
    call('registerTenant', {
      companyName: String(form.companyName || '').trim(),
      bossName: String(form.bossName || '').trim(),
      phone: String(form.phone || '').trim(),
      city: String(form.city || '').trim(),
      mainBusiness: String(form.mainBusiness || '').trim()
    })
      .then((res) => {
        const app = getApp()
        const userTask = res.user
          ? app.hydrateUser(res.user)
          : app.ensureLogin({ force: true, skipRegisterRedirect: true })
        return userTask.then(() => res)
      })
      .then((res) => {
        wx.showToast({
          title: res.existing ? '已开通过' : '开通成功',
          icon: 'success'
        })
        this.goWorkbench()
      })
      .catch((error) => {
        showError('开通失败', error)
      })
      .finally(() => {
        this.setData({ submitting: false })
      })
  },

  goInviteFlow() {
    wx.setStorageSync('saasInviteFlow', true)
    wx.switchTab({
      url: '/pages/workbench/workbench'
    })
  },

  goRoleEntry() {
    wx.switchTab({
      url: '/pages/workbench/workbench'
    })
  },

  goWorkbench() {
    wx.switchTab({
      url: '/pages/workbench/workbench'
    })
  }
})
