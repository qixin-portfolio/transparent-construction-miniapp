const { showError } = require('../../services/cloud')

Page({
  data: {
    user: null,
    loading: false
  },

  onShow() {
    const app = getApp()
    this.setData({ user: app.globalData.user || null })
  },

  login() {
    const app = getApp()
    this.setData({ loading: true })
    app.ensureLogin({ force: true })
      .then((user) => {
        this.setData({ user })
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
      })
      .catch((error) => {
        showError('登录失败', error)
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  }
})
