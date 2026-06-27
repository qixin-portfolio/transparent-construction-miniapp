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

const OWNER_ENTRY_ROUTES = [
  'subpackages/owner/pages/owner/owner',
  'subpackages/owner/pages/projects/projects'
]

const PUBLIC_ENTRY_ROUTES = [
  'subpackages/owner/pages/case-list/case-list',
  'subpackages/owner/pages/case-detail/case-detail',
  'subpackages/owner/pages/completed-home/completed-home',
  'subpackages/owner/pages/completion-album/completion-album',
  'subpackages/owner/pages/owner-archive/owner-archive'
]

const WORKBENCH_JOIN_OPTION_KEYS = ['inviteCode', 'staffInviteCode', 'workerBindCode']
const PROJECT_PUBLIC_OPTION_KEYS = ['bindCode', 'ownerBindCode', 'scene']

function hasAnyOption(options, keys) {
  return keys.some((key) => {
    const value = options && options[key]
    return value !== undefined && value !== null && String(value) !== ''
  })
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

  getCurrentPageInfo() {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    const current = pages[pages.length - 1] || {}
    return {
      route: current.route || '',
      options: current.options || {}
    }
  },

  getCurrentRoute() {
    return this.getCurrentPageInfo().route
  },

  isOwnerEntryRoute(route) {
    return OWNER_ENTRY_ROUTES.indexOf(route) !== -1
  },

  isStaffJoinEntryRoute(route, pageOptions = {}) {
    if (route !== 'pages/workbench/workbench') return false

    const entry = String(pageOptions.entry || '')
    const inviteFlow = !!wx.getStorageSync('saasInviteFlow')
    if (inviteFlow) {
      wx.removeStorageSync('saasInviteFlow')
      return true
    }

    return entry === 'staff_join' ||
      entry === 'worker_bind' ||
      hasAnyOption(pageOptions, WORKBENCH_JOIN_OPTION_KEYS)
  },

  isPublicEntryRoute(route, pageOptions = {}) {
    if (PUBLIC_ENTRY_ROUTES.indexOf(route) !== -1) return true

    if (route !== 'pages/projects/projects') return false

    const entry = String(pageOptions.entry || '')
    const from = String(pageOptions.from || '')
    return entry === 'public' ||
      entry === 'owner_bind' ||
      from === 'share' ||
      hasAnyOption(pageOptions, PROJECT_PUBLIC_OPTION_KEYS)
  },

  shouldAllowGuestFlow(options = {}) {
    if (options.allowGuestFlow) return true

    const pageInfo = this.getCurrentPageInfo()
    const route = pageInfo.route
    const pageOptions = pageInfo.options || {}

    return this.isOwnerEntryRoute(route) ||
      this.isStaffJoinEntryRoute(route, pageOptions) ||
      this.isPublicEntryRoute(route, pageOptions)
  },

  redirectToRegister() {
    const route = this.getCurrentRoute()
    if (route === 'pages/register/register') return
    wx.redirectTo({
      url: '/pages/register/register?entry=boss_register'
    })
  },

  makeNeedRegisterError() {
    const error = new Error('need_register')
    error.needRegister = true
    error.silent = true
    return error
  },

  ensureLogin(options = {}) {
    const force = !!options.force
    const allowGuestFlow = this.shouldAllowGuestFlow(options)

    if (this.globalData.user && !force) {
      if (!this.globalData.user.tenantId && !allowGuestFlow) {
        if (!options.skipRegisterRedirect) {
          this.redirectToRegister()
        }
        return Promise.reject(this.makeNeedRegisterError())
      }
      return Promise.resolve(this.globalData.user)
    }

    if (this.globalData.loginPromise && !force) {
      return this.globalData.loginPromise
    }

    this.globalData.loginPromise = wx.cloud.callFunction({
      name: 'login',
      data: {
        allowGuestFlow
      }
    }).then((res) => {
      const result = res.result || {}
      if (result.error) {
        throw new Error(result.error.message || result.error)
      }
      if (result.needRegister) {
        this.globalData.user = null
        if (!allowGuestFlow && !options.skipRegisterRedirect) {
          this.redirectToRegister()
        }
        throw this.makeNeedRegisterError()
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
