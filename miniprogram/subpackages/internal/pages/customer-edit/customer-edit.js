const { call, showError } = require('../../../../services/cloud')

Page({
  data: {
    isEdit: false,
    customerId: '',
    stageOptions: ['咨询', '已到店', '已量房', '已出图', '已报价', '准备签单', '已签单'],
    dealStatusOptions: ['未成交', '已成交', '已流失'],
    stageIndex: 0,
    dealStatusIndex: 0,
    flowSteps: [],
    form: {
      name: '',
      phone: '',
      source: '',
      address: '',
      need: '',
      stage: '咨询',
      dealStatus: '未成交'
    },
    submitting: false
  },

  onLoad(options) {
    this.syncDerivedState()
    if (options.id) {
      this.setData({ isEdit: true, customerId: options.id })
      wx.setNavigationBarTitle({ title: '客户详情' })
      this.loadCustomer(options.id)
      return
    }
    if (options.source) {
      this.setData({ 'form.source': decodeURIComponent(options.source) })
    }
    this.syncDerivedState()
  },

  loadCustomer(id) {
    wx.showLoading({ title: '加载中...' })
    call('getCustomer', { customerId: id })
      .then((res) => {
        const c = res.customer || {}
        this.setData({
          form: {
            name: c.name || '',
            phone: c.phone || '',
            source: c.source || '',
            address: c.address || '',
            need: c.need || '',
            stage: c.stage || '咨询',
            dealStatus: c.dealStatus || '未成交'
          }
        })
        this.syncDerivedState()
      })
      .catch((error) => {
        showError('加载客户失败', error)
      })
      .finally(() => {
        wx.hideLoading()
      })
  },

  onInput(event) {
    const key = event.currentTarget.dataset.key
    this.setData({
      [`form.${key}`]: event.detail.value
    })
  },

  onStageChange(event) {
    const index = Number(event.detail.value || 0)
    const stage = this.data.stageOptions[index] || '咨询'
    this.setData({
      stageIndex: index,
      'form.stage': stage
    })
    this.syncDerivedState()
  },

  onDealChange(event) {
    const index = Number(event.detail.value || 0)
    const dealStatus = this.data.dealStatusOptions[index] || '未成交'
    this.setData({
      dealStatusIndex: index,
      'form.dealStatus': dealStatus
    })
    this.syncDerivedState()
  },

  syncDerivedState() {
    const stageOptions = this.data.stageOptions || []
    const dealStatusOptions = this.data.dealStatusOptions || []
    const stage = this.data.form.stage || '咨询'
    const dealStatus = this.data.form.dealStatus || '未成交'
    const stageIndex = Math.max(0, stageOptions.indexOf(stage))
    const dealStatusIndex = Math.max(0, dealStatusOptions.indexOf(dealStatus))
    this.setData({
      stageIndex,
      dealStatusIndex,
      flowSteps: this.makeFlowSteps(stage, dealStatus)
    })
  },

  makeFlowSteps(stage, dealStatus) {
    const coreSteps = ['咨询', '已量房', '已报价', '已签单']
    const stageRankMap = {
      '咨询': 0,
      '已到店': 1,
      '已量房': 1,
      '已出图': 2,
      '已报价': 2,
      '准备签单': 2,
      '已签单': 3
    }
    const rank = dealStatus === '已成交' ? 3 : (stageRankMap[stage] || 0)
    return coreSteps.map((item, index) => ({
      name: item,
      active: index <= rank
    }))
  },

  callCustomer() {
    const phone = String(this.data.form.phone || '').trim()
    if (!phone) {
      showError('客户未留电话')
      return
    }
    wx.makePhoneCall({ phoneNumber: phone })
  },

  goCreateProject() {
    const form = this.data.form
    if (!this.data.isEdit) {
      showError('请先保存客户')
      return
    }
    if (form.dealStatus !== '已成交' && form.stage !== '已签单') {
      showError('签单后再创建工地')
      return
    }
    wx.navigateTo({
      url: `/subpackages/internal/pages/project-edit/project-edit?customerId=${this.data.customerId}&customerName=${encodeURIComponent(form.name || '')}&address=${encodeURIComponent(form.address || '')}`
    })
  },

  submit() {
    const form = this.data.form
    if (!form.name.trim()) {
      showError('请填写客户姓名')
      return
    }
    if (form.phone && !/^1\d{10}$/.test(form.phone)) {
      showError('手机号格式不正确')
      return
    }

    this.setData({ submitting: true })
    const action = this.data.isEdit ? 'updateCustomer' : 'createCustomer'
    const payload = this.data.isEdit
      ? Object.assign({}, form, { customerId: this.data.customerId })
      : form

    call(action, payload)
      .then(() => {
        wx.showToast({
          title: this.data.isEdit ? '已更新' : '已保存',
          icon: 'success'
        })
        setTimeout(() => wx.navigateBack(), 700)
      })
      .catch((error) => {
        showError(this.data.isEdit ? '更新失败' : '保存失败', error)
      })
      .finally(() => {
        this.setData({ submitting: false })
      })
  }
})
