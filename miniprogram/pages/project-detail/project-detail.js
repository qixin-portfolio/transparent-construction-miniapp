const { call, showError } = require('../../services/cloud')
const { DEMO_MODE, demoProjects, demoLogs } = require('../../utils/demo')

Page({
  data: {
    projectId: '',
    project: null,
    logs: [],
    loading: false,
    bindCode: null,
    bindCodeText: '',
    bindCodeExpiresAtText: '',
    bindCodeLoading: false
  },

  onLoad(options) {
    const projectId = options.id || ''
    this.setData({ projectId })
    this.loadDetail()
  },

  loadDetail() {
    if (!this.data.projectId) {
      showError('缺少工地 ID')
      return
    }

    this.setData({ loading: true })
    call('getProjectDetail', { projectId: this.data.projectId })
      .then((res) => {
        this.setData({
          project: res.project || null,
          logs: res.logs || [],
          bindCode: null,
          bindCodeText: '',
          bindCodeExpiresAtText: ''
        })
      })
      .catch((error) => {
        if (DEMO_MODE) {
          this.setData({ project: demoProjects[0], logs: demoLogs })
          return
        }
        this.setData({ project: null, logs: [] })
        showError('工地详情加载失败', error)
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  goUpload() {
    wx.navigateTo({
      url: `/pages/upload-log/upload-log?projectId=${this.data.projectId}&projectName=${encodeURIComponent((this.data.project || {}).name || '')}`
    })
  },

  formatTime(timestamp) {
    const date = new Date(timestamp)
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    const hour = `${date.getHours()}`.padStart(2, '0')
    const minute = `${date.getMinutes()}`.padStart(2, '0')
    return `${month}月${day}日 ${hour}:${minute}`
  },

  createBindCode() {
    if (!this.data.projectId) {
      showError('缺少工地 ID')
      return
    }

    this.setData({ bindCodeLoading: true })
    call('createOwnerBindCode', { projectId: this.data.projectId })
      .then((res) => {
        this.setData({
          bindCode: res,
          bindCodeText: res.code || '',
          bindCodeExpiresAtText: res.expiresAt ? this.formatTime(res.expiresAt) : ''
        })
        wx.showToast({
          title: '绑定码已生成',
          icon: 'success'
        })
      })
      .catch((error) => {
        showError('生成失败', error)
      })
      .finally(() => {
        this.setData({ bindCodeLoading: false })
      })
  },

  copyBindCode() {
    if (!this.data.bindCodeText) {
      showError('请先生成绑定码')
      return
    }
    wx.setClipboardData({
      data: this.data.bindCodeText
    })
  }
})
