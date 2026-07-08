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

const WORKBENCH_JOIN_OPTION_KEYS = ['saasInviteFlow', 'inviteCode', 'staffInviteCode', 'workerBindCode']
const PROJECT_PUBLIC_OPTION_KEYS = ['bindCode', 'ownerBindCode', 'scene', 'q']
const ENTRY_CONTEXT_KEY = 'saasEntryContext'
const ENTRY_CONTEXT_TTL = 3 * 60 * 1000

function hasAnyOption(options, keys) {
  return keys.some((key) => {
    const value = options && options[key]
    return value !== undefined && value !== null && String(value) !== ''
  })
}

function safeDecode(value) {
  try {
    return decodeURIComponent(String(value || '').trim())
  } catch (error) {
    return String(value || '').trim()
  }
}

function parseQueryPairs(text) {
  return String(text || '').split('&').reduce((query, part) => {
    const pieces = part.split('=')
    const key = safeDecode(pieces[0] || '').trim()
    const value = safeDecode(pieces.slice(1).join('=') || '').trim()
    if (key) query[key] = value
    return query
  }, {})
}

function parseScene(scene) {
  const decoded = safeDecode(scene)
  if (!decoded) return {}
  if (/^\d{6}$/.test(decoded)) return { bindCode: decoded }
  return parseQueryPairs(decoded)
}

function parseQ(q) {
  const decoded = safeDecode(q)
  if (!decoded) return {}
  if (/^\d{6}$/.test(decoded)) return { bindCode: decoded }
  const queryText = decoded.indexOf('?') !== -1
    ? decoded.slice(decoded.indexOf('?') + 1)
    : decoded
  return parseQueryPairs(queryText.split('#')[0])
}

function cleanQuery(rawQuery = {}) {
  const query = Object.assign({}, rawQuery)
  if (query.q) {
    Object.assign(query, parseQ(query.q))
  }
  if (query.scene) {
    Object.assign(query, parseScene(query.scene))
  }
  return query
}

function firstCode(query, keys) {
  for (let i = 0; i < keys.length; i += 1) {
    const value = String((query || {})[keys[i]] || '').replace(/\s/g, '')
    if (/^\d{6}$/.test(value)) return value
  }
  return ''
}

App({
  globalData: {
    envId: 'cloud1-d4g7zh8kpca0e26d5',
    user: null,
    loginPromise: null,
    loginPromiseAllowGuestFlow: false,
    entryContext: null
  },

  onLaunch(options = {}) {
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
    this.captureEntryContext(options)
  },

  onShow(options = {}) {
    const context = this.captureEntryContext(options)
    this.routeEntryContextIfNeeded(context)
  },

  makeEntryContext(path = '', rawQuery = {}) {
    const query = cleanQuery(rawQuery)
    const bindCode = firstCode(query, ['bindCode', 'ownerBindCode'])
    const staffInviteCode = firstCode(query, ['staffInviteCode', 'inviteCode'])
    const workerBindCode = firstCode(query, ['workerBindCode'])
    const entry = String(query.entry || '')
    const from = String(query.from || '')
    const saasInviteFlow = ['1', 'true', 'staff_join'].indexOf(String(query.saasInviteFlow || '')) !== -1

    if (bindCode) {
      return { type: 'owner_bind', bindCode, createdAt: Date.now() }
    }
    if (staffInviteCode || entry === 'staff_join' || saasInviteFlow) {
      return { type: 'staff_join', staffInviteCode, createdAt: Date.now() }
    }
    if (workerBindCode || entry === 'worker_bind') {
      return { type: 'worker_bind', workerBindCode, createdAt: Date.now() }
    }
    if (
      PUBLIC_ENTRY_ROUTES.indexOf(path) !== -1 ||
      (path === 'pages/projects/projects' && (entry === 'public' || entry === 'owner_bind' || from === 'share' || hasAnyOption(query, PROJECT_PUBLIC_OPTION_KEYS)))
    ) {
      return { type: 'public', createdAt: Date.now() }
    }
    return null
  },

  captureEntryContext(options = {}) {
    const path = options.path || ''
    const query = options.query || options || {}
    const context = this.makeEntryContext(path, query)
    if (!context) return null
    this.globalData.entryContext = context
    wx.setStorageSync(ENTRY_CONTEXT_KEY, context)
    return context
  },

  routeEntryContextIfNeeded(context) {
    if (!context) return
    setTimeout(() => {
      const pageInfo = this.getCurrentPageInfo()
      const route = pageInfo.route
      if (route !== 'pages/register/register') return
      if (String((pageInfo.options || {}).entry || '') === 'boss_register') {
        this.clearEntryContext()
        return
      }

      if (context.type === 'owner_bind') {
        const query = context.bindCode ? `?bindCode=${context.bindCode}` : ''
        this.clearEntryContext()
        wx.redirectTo({
          url: `/subpackages/owner/pages/owner/owner${query}`
        })
        return
      }

      if (context.type === 'staff_join' || context.type === 'worker_bind') {
        wx.switchTab({
          url: '/pages/workbench/workbench'
        })
        return
      }

      if (context.type === 'public') {
        this.clearEntryContext()
        wx.reLaunch({
          url: '/pages/projects/projects?entry=public'
        })
      }
    }, 0)
  },

  getEntryContext() {
    const context = this.globalData.entryContext || wx.getStorageSync(ENTRY_CONTEXT_KEY) || null
    if (!context || !context.createdAt || Date.now() - context.createdAt > ENTRY_CONTEXT_TTL) {
      this.clearEntryContext()
      return null
    }
    return context
  },

  clearEntryContext() {
    this.globalData.entryContext = null
    wx.removeStorageSync(ENTRY_CONTEXT_KEY)
  },

  consumeEntryContext() {
    const context = this.getEntryContext()
    this.clearEntryContext()
    return context
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
    if (inviteFlow) return true

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
    const entryContext = this.getEntryContext()
    if (entryContext && ['owner_bind', 'staff_join', 'worker_bind', 'public'].indexOf(entryContext.type) !== -1) {
      return true
    }

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
    if (this.shouldAllowGuestFlow()) return
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
      if (allowGuestFlow && !this.globalData.loginPromiseAllowGuestFlow) {
        this.globalData.loginPromise = null
      } else {
        return this.globalData.loginPromise
      }
    }

    this.globalData.loginPromiseAllowGuestFlow = allowGuestFlow
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
        if (!this.shouldAllowGuestFlow(options) && !options.skipRegisterRedirect) {
          this.redirectToRegister()
        }
        throw this.makeNeedRegisterError()
      }
      return this.hydrateUser(result.user || null)
    }).finally(() => {
      this.globalData.loginPromise = null
      this.globalData.loginPromiseAllowGuestFlow = false
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
