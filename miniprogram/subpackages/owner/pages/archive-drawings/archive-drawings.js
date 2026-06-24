const { call, showError } = require('../../../../services/cloud')

Page({
  data: {
    loading: false,
    projectId: '',
    drawings: [],
    groupedDrawings: []
  },

  onLoad(options) {
    this.setData({ projectId: String(options.projectId || '').trim() })
  },

  onShow() {
    this.loadDrawings()
  },

  loadDrawings() {
    this.setData({ loading: true })
    getApp().ensureLogin()
      .then(() => call('listDesignDrawings', { projectId: this.data.projectId }))
      .then((res) => {
        const drawings = res.drawings || []
        // 按空间分组
        const groupMap = {}
        drawings.forEach((d) => {
          const space = d.space || '其他'
          if (!groupMap[space]) groupMap[space] = []
          groupMap[space].push(d)
        })
        const groupedDrawings = Object.keys(groupMap).map((space) => ({
          space,
          items: groupMap[space].map((d) => ({
            ...d,
            previewUrls: [d.tempFileURL].filter(Boolean)
          }))
        }))
        this.setData({ drawings, groupedDrawings })
      })
      .catch((error) => showError('图纸加载失败', error))
      .finally(() => this.setData({ loading: false }))
  },

  previewDrawing(e) {
    const { current, urls } = e.currentTarget.dataset
    if (!urls || !urls.length) return
    wx.previewImage({ current: current || urls[0], urls })
  }
})
