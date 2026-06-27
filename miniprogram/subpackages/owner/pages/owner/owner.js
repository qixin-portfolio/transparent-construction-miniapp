const { call, showError } = require('../../../../services/cloud')
const { DEMO_MODE, demoProjects, demoLogs } = require('../../../../utils/demo')

// ⚠️ 替换为你在 mp 后台创建的订阅消息模板 ID
const SUBSCRIBE_TMPL_IDS = ['CSnZXzPW_Qe9Nor3NR7__Z0dHlQaItFPpb6X1-Sd4bY']

const SPACE_NAMES = {
  whole_house: '全屋', living_room: '客厅', master_bedroom: '主卧',
  second_bedroom: '次卧', kitchen: '厨房', bathroom: '卫生间',
  entrance: '玄关', balcony: '阳台', study: '书房'
}

function getBindCodeFromOptions(options = {}) {
  const directCode = String(options.bindCode || options.ownerBindCode || '').replace(/\s/g, '')
  if (/^\d{6}$/.test(directCode)) return directCode

  const scene = decodeURIComponent(String(options.scene || '').trim())
  if (/^\d{6}$/.test(scene)) return scene
  const sceneParts = scene.split('&').reduce((query, part) => {
    const pieces = part.split('=')
    const key = decodeURIComponent(pieces[0] || '').trim()
    const value = decodeURIComponent(pieces.slice(1).join('=') || '').trim()
    if (key) query[key] = value
    return query
  }, {})
  return String(sceneParts.bindCode || sceneParts.ownerBindCode || '').replace(/\s/g, '')
}

Page({
  data: {
    loading: false,
    authLoading: false,
    binding: false,
    bindCode: '',
    project: null,
    logs: [],
    visibleLogs: [],
    stats: {
      logCount: 0,
      photoCount: 0,
      latestDateText: '',
      latestStage: ''
    },
    projectProgressDeg: 0,
    animatedProgress: 0,
    animatedProgressDeg: 0,
    heroPhotos: [],
    photoWall: [],
    filteredPhotoWall: [],
    photoStages: [],
    filterStage: '',
    timelineExpanded: false,
    timelineCollapsedCount: 3,
    autoFilled: false,
    subscribed: false,
    renderDrawings: []
  },

  onLoad(options) {
    this.setData({ projectId: String(options.projectId || '').trim() })
    const bindCode = getBindCodeFromOptions(options)
    if (bindCode && /^\d{6}$/.test(bindCode)) {
      this.setData({
        bindCode,
        autoFilled: true
      })
      wx.showToast({
        title: '已自动填入绑定码',
        icon: 'none',
        duration: 2000
      })
    }
  },

  onShow() {
    this.setData({
      authLoading: true,
      subscribed: !!wx.getStorageSync('ownerSubscribed')
    })
    getApp().ensureLogin({ allowGuestFlow: true })
      .then(() => {
        this.loadOwnerProject()
      })
      .catch((error) => {
        this.setData({
          project: null, logs: [], visibleLogs: [], photoWall: [],
          projectProgressDeg: 0,
          animatedProgress: 0,
          animatedProgressDeg: 0,
          heroPhotos: [],
          filteredPhotoWall: [], photoStages: [], renderDrawings: []
        })
        showError('登录失败', error)
      })
      .finally(() => {
        this.setData({ authLoading: false })
      })
  },

  loadOwnerProject() {
    this.setData({ loading: true })
    call('getOwnerProject', { projectId: this.data.projectId })
      .then((res) => {
        const logs = this.prepareLogs(res.logs || [])
        const photoWall = this.makePhotoWall(logs)
        const stages = this.buildStageList(photoWall)
        const project = res.project || null
        this.setData({
          project,
          projectProgressDeg: this.makeProgressDeg((project || {}).progress),
          animatedProgress: 0,
          animatedProgressDeg: 0,
          logs,
          visibleLogs: logs.slice(0, this.data.timelineCollapsedCount),
          stats: this.makeStats(logs),
          photoWall,
          heroPhotos: photoWall.slice(0, 3),
          filteredPhotoWall: photoWall,
          photoStages: stages,
          filterStage: '',
          timelineExpanded: false,
          renderDrawings: []
        }, () => {
          this.playProgressMotion((project || {}).progress)
        })
        // 加载设计效果图
        if (project) {
          this.loadRenderDrawings(project._id)
        }
      })
      .catch((error) => {
        if (DEMO_MODE) {
          const logs = this.prepareLogs(demoLogs)
          const photoWall = this.makePhotoWall(logs)
          const project = demoProjects[0]
          this.setData({
            project,
            projectProgressDeg: this.makeProgressDeg((project || {}).progress),
            animatedProgress: 0,
            animatedProgressDeg: 0,
            logs,
            visibleLogs: logs.slice(0, this.data.timelineCollapsedCount),
            stats: this.makeStats(logs),
            photoWall,
            heroPhotos: photoWall.slice(0, 3),
            filteredPhotoWall: photoWall,
            photoStages: this.buildStageList(photoWall),
            filterStage: '',
            timelineExpanded: false,
            renderDrawings: []
          }, () => {
            this.playProgressMotion((project || {}).progress)
          })
          return
        }
        this.setData({
          project: null, logs: [], visibleLogs: [], photoWall: [],
          projectProgressDeg: 0,
          animatedProgress: 0,
          animatedProgressDeg: 0,
          heroPhotos: [],
          filteredPhotoWall: [], photoStages: [], renderDrawings: []
        })
        showError('业主进度加载失败', error)
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  /* ========================
     照片大图预览
     ======================== */
  previewPhoto(event) {
    const urls = this.data.photoWall.map((item) => item.url)
    const current = event.currentTarget.dataset.url || ''
    wx.previewImage({
      urls,
      current
    })
  },

  previewTimelinePhoto(event) {
    const { photos, index } = event.currentTarget.dataset
    wx.previewImage({
      urls: photos || [],
      current: (photos || [])[index || 0] || ''
    })
  },

  /* ========================
     照片按阶段筛选
     ======================== */
  buildStageList(photoWall) {
    const seen = new Set()
    const stages = []
    photoWall.forEach((item) => {
      const s = item.stage || '施工中'
      if (!seen.has(s)) {
        seen.add(s)
        stages.push(s)
      }
    })
    return stages
  },

  filterByStage(event) {
    const stage = event.currentTarget.dataset.stage || ''
    this.setData({
      filterStage: stage,
      filteredPhotoWall: stage
        ? this.data.photoWall.filter((p) => p.stage === stage)
        : this.data.photoWall
    })
  },

  /* ========================
     时间线展开/收起
     ======================== */
  toggleTimeline() {
    const expanded = !this.data.timelineExpanded
    this.setData({
      timelineExpanded: expanded,
      visibleLogs: expanded ? this.data.logs : this.data.logs.slice(0, this.data.timelineCollapsedCount)
    })
  },

  /* ========================
     工具方法
     ======================== */
  onBindCodeInput(event) {
    this.setData({
      bindCode: String(event.detail.value || '').replace(/\D/g, '').slice(0, 6)
    })
  },

  formatDate(value) {
    if (!value) return ''
    let raw = value
    if (value.$date && value.$date.$numberLong) raw = Number(value.$date.$numberLong)
    if (value.$numberLong) raw = Number(value.$numberLong)

    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return ''

    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    const hour = `${date.getHours()}`.padStart(2, '0')
    const minute = `${date.getMinutes()}`.padStart(2, '0')
    return `${month}月${day}日 ${hour}:${minute}`
  },

  prepareLogs(logs) {
    return logs.map((item) => Object.assign({}, item, {
      dateText: this.formatDate(item.createdAt || item.updatedAt || item.reviewedAt),
      photos: item.photos || [],
      ownerText: item.ownerSummary || item.workContent || ''
    }))
  },

  makePhotoWall(logs) {
    return logs.reduce((items, log) => {
      ;(log.photos || []).forEach((photo) => {
        items.push({
          url: photo,
          stage: log.stage || '施工进度',
          dateText: log.dateText || ''
        })
      })
      return items
    }, [])
  },

  makeStats(logs) {
    const latest = logs[0] || {}
    const photoCount = logs.reduce((total, log) => total + ((log.photos || []).length), 0)
    return {
      logCount: logs.length,
      photoCount,
      latestDateText: latest.dateText || '',
      latestStage: latest.stage || ''
    }
  },

  makeProgressDeg(progress) {
    const value = Math.max(0, Math.min(100, Number(progress) || 0))
    return value >= 100 ? 360 : Math.round(value * 3.6)
  },

  playProgressMotion(progress) {
    const value = Math.max(0, Math.min(100, Number(progress) || 0))
    const deg = this.makeProgressDeg(value)
    setTimeout(() => {
      this.setData({
        animatedProgress: value,
        animatedProgressDeg: deg
      })
    }, 80)
  },

  doBindProject(code) {
    this.setData({ binding: true })
    getApp().ensureLogin({ allowGuestFlow: true })
      .then(() => call('bindOwnerProject', { code }))
      .then((res) => {
        const app = getApp()
        const syncUser = res && res.user && app.hydrateUser
          ? app.hydrateUser(res.user)
          : Promise.resolve()
        return syncUser.then(() => res)
      })
      .then(() => {
        wx.showToast({
          title: '绑定成功',
          icon: 'success'
        })
        // 强制重置订阅状态，确保横幅可见让用户手动开启通知
        wx.setStorageSync('ownerSubscribed', false)
        this.setData({
          bindCode: '',
          subscribed: false
        })
        this.loadOwnerProject()
        // 绑定后引导手动开启通知
        const that = this
        setTimeout(() => {
          if (!that.data.subscribed) {
            wx.showToast({ title: '点🔔开启微信通知', icon: 'none' })
          }
        }, 2000)
      })
      .catch((error) => {
        showError('绑定失败', error)
      })
      .finally(() => {
        this.setData({ binding: false })
      })
  },

  bindProject() {
    const code = String(this.data.bindCode || '').replace(/\s/g, '')
    if (!code) {
      showError('请输入绑定码')
      return
    }

    // 先请求订阅授权（在用户手势上下文中同步调用）
    wx.requestSubscribeMessage({
      tmplIds: SUBSCRIBE_TMPL_IDS,
      success: (res) => {
        const accepted = SUBSCRIBE_TMPL_IDS.some((id) => res[id] === 'accept')
        if (accepted) {
          wx.setStorageSync('ownerSubscribed', true)
          this.setData({ subscribed: true })
        }
      },
      fail: () => {},
      complete: () => {
        // 无论用户点允许还是拒绝，都继续绑定
        this.doBindProject(code)
      }
    })
  },

  goRenderSection() {
    if (!this.data.renderDrawings.length) {
      wx.showToast({ title: '暂无已开放图纸', icon: 'none' })
      return
    }
    wx.pageScrollTo({
      selector: '#render-section',
      duration: 260
    })
  },

  goTimelineSection() {
    if (!this.data.logs.length) {
      wx.showToast({ title: '暂无已审核日报', icon: 'none' })
      return
    }
    this.setData({
      timelineExpanded: true,
      visibleLogs: this.data.logs
    })
    wx.pageScrollTo({
      selector: '#timeline-section',
      duration: 260
    })
  },

  /* ========================
     订阅消息授权
     ======================== */
  requestSubscribe() {
    if (!SUBSCRIBE_TMPL_IDS.length || SUBSCRIBE_TMPL_IDS[0] === 'YOUR_TEMPLATE_ID_HERE') {
      return // 模板 ID 未配置，跳过
    }
    wx.requestSubscribeMessage({
      tmplIds: SUBSCRIBE_TMPL_IDS,
      success: (res) => {
        const accepted = SUBSCRIBE_TMPL_IDS.some((id) => res[id] === 'accept')
        if (accepted) {
          wx.setStorageSync('ownerSubscribed', true)
          this.setData({ subscribed: true })
        }
      },
      fail: () => {
        // 用户拒绝或出错，静默处理
      }
    })
  },

  /* ========================
     设计效果图
     ======================== */
  loadRenderDrawings(projectId) {
    call('listDesignDrawings', { projectId })
      .then((res) => {
        const drawings = (res.drawings || []).map((d) => ({
          ...d,
          spaceText: SPACE_NAMES[d.space] || d.space
        }))
        this.setData({ renderDrawings: drawings })
      })
      .catch(() => {
        // 图纸加载失败不影响主流程
      })
  },

  previewDrawing(event) {
    const url = event.currentTarget.dataset.url
    if (!url) return
    const urls = this.data.renderDrawings
      .map((d) => d.tempFileURL)
      .filter(Boolean)
    wx.previewImage({ current: url, urls })
  },

  confirmDrawing(event) {
    const id = event.currentTarget.dataset.id
    const title = event.currentTarget.dataset.title
    wx.showModal({
      title: '确认效果图',
      content: `确认「${title}」这张效果图符合预期？确认后设计师会收到通知。`,
      success: (res) => {
        if (res.confirm) {
          call('updateDesignDrawing', { drawingId: id, action: 'ownerConfirm' })
            .then(() => {
              wx.showToast({ title: '已确认', icon: 'success' })
              if (this.data.project) {
                this.loadRenderDrawings(this.data.project._id)
              }
            })
            .catch((error) => showError('确认失败', error))
        }
      }
    })
  },

  onShareAppMessage() {
    const project = this.data.project
    return {
      title: project ? `${project.name}施工进度更新` : '晟景透明工地',
      path: '/subpackages/owner/pages/owner/owner'
    }
  }
})
