const ROLE_LABELS = {
  admin: '管理员',
  owner: '业主',
  worker: '工长',
  project_manager: '项目经理',
  designer: '设计师',
  sales: '销售',
  boss_qi: '老板（老齐）',
  boss_hu: '老板（老胡）'
}

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
      return this.hydrateUser(result.user || null)
    }).finally(() => {
      this.globalData.loginPromise = null
    })

    return this.globalData.loginPromise
  },

  normalizeUser(user) {
    if (!user) return null
    const roleLabel = ROLE_LABELS[user.role] || user.role || ''
    const displayName = user.nickName || user.name || roleLabel || '微信用户'
    const avatarText = displayName ? displayName.slice(0, 1) : '微'
    return Object.assign({}, user, {
      roleLabel,
      displayName,
      avatarText,
      hasWechatProfile: !!(user.nickName || user.avatarFileID || user.avatarUrl)
    })
  },

  hydrateUser(user) {
    const normalized = this.normalizeUser(user)
    if (!normalized) {
      this.globalData.user = null
      return Promise.resolve(null)
    }

    const fileID = normalized.avatarFileID || (String(normalized.avatarUrl || '').indexOf('cloud://') === 0 ? normalized.avatarUrl : '')
    if (!fileID) {
      this.globalData.user = normalized
      return Promise.resolve(normalized)
    }

    return wx.cloud.getTempFileURL({
      fileList: [fileID]
    }).then((res) => {
      const item = res.fileList && res.fileList[0]
      if (item && item.tempFileURL) {
        normalized.avatarUrl = item.tempFileURL
      }
      this.globalData.user = normalized
      return normalized
    }).catch(() => {
      this.globalData.user = normalized
      return normalized
    })
  },

  syncWechatProfile(profile) {
    return wx.cloud.callFunction({
      name: 'updateMyProfile',
      data: profile || {}
    }).then((res) => {
      const result = res.result || {}
      if (result.error) {
        throw new Error(result.error.message || result.error)
      }
      return this.hydrateUser(result.user || null)
    })
  }
})
