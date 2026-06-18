const { call, showError } = require('../../services/cloud')
const { DEMO_MODE, demoProjects } = require('../../utils/demo')

Page({
  data: {
    loading: false,
    projects: [],
    user: null,
    canCreate: false
  },

  onShow() {
    getApp().ensureLogin()
      .then((user) => {
        this.setData({
          user,
          canCreate: user && ['admin', 'boss_qi', 'boss_hu', 'designer'].indexOf(user.role) !== -1
        })
        this.loadProjects()
      })
      .catch((error) => {
        this.setData({ projects: [], user: null, canCreate: false })
        showError('登录失败', error)
      })
  },

  loadProjects() {
    this.setData({ loading: true })
    call('listMyProjects')
      .then((res) => {
        this.setData({ projects: res.items || [] })
      })
      .catch((error) => {
        if (DEMO_MODE) {
          this.setData({ projects: demoProjects })
          return
        }
        this.setData({ projects: [] })
        showError('工地加载失败', error)
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  goDetail(event) {
    const id = event.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/project-detail/project-detail?id=${id}`
    })
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/project-edit/project-edit' })
  }
})
