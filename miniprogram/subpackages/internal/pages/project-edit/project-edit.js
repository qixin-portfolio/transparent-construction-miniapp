const { call, showError } = require('../../../../services/cloud')

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

  onLoad(options) {
    const customerId = options.customerId || ''
    const customerName = decodeURIComponent(options.customerName || '')
    const address = decodeURIComponent(options.address || '')
    if (customerId || customerName || address) {
      this.setData({
        form: Object.assign({}, this.data.form, {
          name: address ? `${address} 透明工地` : (customerName ? `${customerName} 透明工地` : ''),
          customerId,
          customerName,
          address
        })
      })
    }
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
      .then((res) => {
        wx.showToast({
          title: '已新建',
          icon: 'success'
        })
        const projectId = res && res.id
        setTimeout(() => {
          if (projectId) {
            wx.redirectTo({
              url: `/subpackages/internal/pages/project-detail/project-detail?id=${projectId}`
            })
            return
          }
          wx.navigateBack()
        }, 700)
      })
      .catch((error) => {
        showError('新建失败', error)
      })
      .finally(() => {
        this.setData({ submitting: false })
      })
  }
})
