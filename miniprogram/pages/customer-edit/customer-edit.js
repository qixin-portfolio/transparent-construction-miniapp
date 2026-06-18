const { call, showError } = require('../../services/cloud')

Page({
  data: {
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

  onInput(event) {
    const key = event.currentTarget.dataset.key
    this.setData({
      [`form.${key}`]: event.detail.value
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
    call('createCustomer', form)
      .then(() => {
        wx.showToast({
          title: '已保存',
          icon: 'success'
        })
        setTimeout(() => wx.navigateBack(), 700)
      })
      .catch((error) => {
        showError('保存失败', error)
      })
      .finally(() => {
        this.setData({ submitting: false })
      })
  }
})
