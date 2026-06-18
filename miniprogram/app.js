App({
  globalData: {
    envId: 'cloud1-d4g7zh8kpca0e26d5',
    user: null,
    loginPromise: null
  },

  onLaunch() {
    if (!wx.cloud) {
      wx.showModal({
        title: '当前微信版本过低',
        content: '请升级微信后再使用晟景透明工地。',
        showCancel: false
      })
      return
    }

    const env = this.globalData.envId
    wx.cloud.init({
      env,
      traceUser: true
    })
  },

  ensureLogin(options = {}) {
    const force = !!options.force
    if (this.globalData.user && !force) {
      return Promise.resolve(this.globalData.user)
    }

    if (this.globalData.loginPromise && !force) {
      return this.globalData.loginPromise
    }

    this.globalData.loginPromise = wx.cloud.callFunction({
      name: 'login'
    }).then((res) => {
      const result = res.result || {}
      if (result.error) {
        throw new Error(result.error.message || result.error)
      }
      this.globalData.user = result.user || null
      return this.globalData.user
    }).finally(() => {
      this.globalData.loginPromise = null
    })

    return this.globalData.loginPromise
  }
})
