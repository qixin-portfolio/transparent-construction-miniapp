const { call, showError } = require('../../services/cloud')
const { DEMO_MODE, demoLogs } = require('../../utils/demo')

Page({
  data: {
    loading: false,
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
        this.setData({ items: res.items || [] })
      })
      .catch((error) => {
        if (DEMO_MODE) {
          this.setData({ items: demoLogs })
          return
        }
        this.setData({ items: [] })
        showError('待审核加载失败', error)
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  review(event) {
    const id = event.currentTarget.dataset.id
    const action = event.currentTarget.dataset.action
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
  }
})
