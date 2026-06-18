const { call, showError } = require('../../services/cloud')

Page({
  data: {
    form: {
      name: '',
      customerName: '',
      customerId: '',
      address: '',
      ownerOpenid: ''
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
      showError('请填写工地名称')
      return
    }

    this.setData({ submitting: true })
    call('createProject', form)
      .then(() => {
        wx.showToast({
          title: '已新建',
          icon: 'success'
        })
        setTimeout(() => wx.navigateBack(), 700)
      })
      .catch((error) => {
        showError('新建失败', error)
      })
      .finally(() => {
        this.setData({ submitting: false })
      })
  }
})
