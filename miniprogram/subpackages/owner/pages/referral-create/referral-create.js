const { call, showError } = require('../../../../services/cloud')

Page({
  data: {
    projectId: '',
    submitting: false,
    form: {
      referrerName: '',
      friendName: '',
      friendPhone: '',
      friendCommunity: '',
      need: '',
      remark: ''
    }
  },

  onLoad(options) {
    this.setData({ projectId: String(options.projectId || '').trim() })
    getApp().ensureLogin()
      .then((user) => {
        this.setData({ 'form.referrerName': user.name || user.nickName || '' })
      })
      .catch(() => {})
  },

  onInput(event) {
    const key = event.currentTarget.dataset.key
    this.setData({ [`form.${key}`]: event.detail.value })
  },

  submit() {
    if (this.data.submitting) return
    if (!this.data.form.friendName || !this.data.form.friendPhone) {
      wx.showToast({ title: '请填写朋友姓名和电话', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    call('createReferralRecord', Object.assign({}, this.data.form, {
      projectId: this.data.projectId
    }))
      .then(() => {
        wx.showModal({
          title: '推荐已提交',
          content: '晟景会根据您填写的信息联系朋友，后续跟进会进入客户库。',
          showCancel: false,
          success: () => wx.navigateBack()
        })
      })
      .catch((error) => showError('提交推荐失败', error))
      .finally(() => this.setData({ submitting: false }))
  }
})
