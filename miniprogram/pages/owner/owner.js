const { call, showError } = require('../../services/cloud')
const { DEMO_MODE, demoProjects, demoLogs } = require('../../utils/demo')

Page({
  data: {
    loading: false,
    authLoading: false,
    binding: false,
    bindCode: '',
    project: null,
    logs: [],
    stats: {
      logCount: 0,
      photoCount: 0,
      latestDateText: '',
      latestStage: ''
    },
    photoWall: []
  },

  onShow() {
    this.setData({ authLoading: true })
    getApp().ensureLogin()
      .then(() => {
        this.loadOwnerProject()
      })
      .catch((error) => {
        this.setData({ project: null, logs: [], photoWall: [] })
        showError('登录失败', error)
      })
      .finally(() => {
        this.setData({ authLoading: false })
      })
  },

  loadOwnerProject() {
    this.setData({ loading: true })
    call('getOwnerProject')
      .then((res) => {
        const logs = this.prepareLogs(res.logs || [])
        this.setData({
          project: res.project || null,
          logs,
          stats: this.makeStats(logs),
          photoWall: this.makePhotoWall(logs)
        })
      })
      .catch((error) => {
        if (DEMO_MODE) {
          const logs = this.prepareLogs(demoLogs)
          this.setData({
            project: demoProjects[0],
            logs,
            stats: this.makeStats(logs),
            photoWall: this.makePhotoWall(logs)
          })
          return
        }
        this.setData({ project: null, logs: [], photoWall: [] })
        showError('业主进度加载失败', error)
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  onBindCodeInput(event) {
    this.setData({
      bindCode: event.detail.value
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
      photos: item.photos || []
    }))
  },

  makePhotoWall(logs) {
    return logs.reduce((items, log) => {
      ;(log.photos || []).forEach((photo) => {
        if (items.length < 6) {
          items.push({
            url: photo,
            stage: log.stage || '施工进度',
            dateText: log.dateText || ''
          })
        }
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

  bindProject() {
    const code = String(this.data.bindCode || '').replace(/\s/g, '')
    if (!code) {
      showError('请输入绑定码')
      return
    }

    this.setData({ binding: true })
    getApp().ensureLogin()
      .then(() => call('bindOwnerProject', { code }))
      .then(() => {
        wx.showToast({
          title: '已绑定',
          icon: 'success'
        })
        this.setData({ bindCode: '' })
        this.loadOwnerProject()
      })
      .catch((error) => {
        showError('绑定失败', error)
      })
      .finally(() => {
        this.setData({ binding: false })
      })
  },

  onShareAppMessage() {
    const project = this.data.project
    return {
      title: project ? `${project.name}施工进度更新` : '晟景透明工地',
      path: '/pages/owner/owner'
    }
  }
})
