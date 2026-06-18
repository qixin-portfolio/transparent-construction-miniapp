const { call, showError } = require('../../../../services/cloud')
const { DEMO_MODE, demoLogs } = require('../../../../utils/demo')

Page({
  data: {
    loading: false,
    reviewingId: '',
    items: []
  },

  onShow() {
    const user = getApp().globalData.user
    if (!user) {
      this.setData({ items: [] })
      return
    }
    this.loadItems()
  },

  loadItems() {
    this.setData({ loading: true })
    call('listPendingStageLogs')
      .then((res) => {
        this.setData({ items: this.prepareItems(res.items || []) })
      })
      .catch((error) => {
        if (DEMO_MODE) {
          this.setData({ items: this.prepareItems(demoLogs) })
          return
        }
        this.setData({ items: [] })
        showError('待审核加载失败', error)
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  prepareItems(items) {
    return (items || []).map((item) => Object.assign({}, item, {
      photoFileIDs: item.photoFileIDs || item.photos || [],
      dateText: this.formatTime(item.createdAt || item.updatedAt),
      submitterText: item.submittedByName || '内部人员'
    }))
  },

  formatTime(value) {
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

  previewPhoto(event) {
    const url = event.currentTarget.dataset.url
    const urls = event.currentTarget.dataset.urls || []
    if (!url) return
    wx.previewImage({ current: url, urls })
  },

  review(event) {
    const id = event.currentTarget.dataset.id
    const action = event.currentTarget.dataset.action
    const isApprove = action === 'approve'
    wx.showModal({
      title: isApprove ? '确认审核通过？' : '确认退回修改？',
      content: isApprove ? '通过后，这条日报和照片会展示给业主。' : '退回后，业主不会看到这条日报。',
      confirmText: isApprove ? '通过' : '退回',
      confirmColor: isApprove ? '#0F6A4A' : '#C24E45',
      success: (res) => {
        if (res.confirm) {
          this.doReview(id, action)
        }
      }
    })
  },

  doReview(id, action) {
    this.setData({ reviewingId: id })
    call('reviewStageLog', { stageLogId: id, action })
      .then(() => {
        wx.showToast({
          title: action === 'approve' ? '已通过' : '已退回',
          icon: 'success'
        })
        this.loadItems()
      })
      .catch((error) => {
        showError('审核失败', error)
      })
      .finally(() => {
        this.setData({ reviewingId: '' })
      })
  }
})
