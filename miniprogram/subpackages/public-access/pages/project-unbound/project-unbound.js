function applyEntryRoute(page, route) {
  if (!route || route.type === 'public') {
    page.setData({ checking: false, checked: true })
    return
  }
  if (route.type === 'workbench') {
    wx.switchTab({ url: '/pages/workbench/workbench' })
    return
  }
  if (route.type === 'owner_detail') {
    wx.redirectTo({ url: `/subpackages/owner/pages/owner/owner?projectId=${route.projectId}` })
    return
  }
  if (route.type === 'owner_projects') {
    wx.redirectTo({ url: '/subpackages/owner/pages/projects/projects' })
  }
}

Page({
  data: { checking: true, checked: false },

  onShow() {
    this.checkProjectBinding()
  },

  checkProjectBinding() {
    this.setData({ checking: true })
    getApp().resolveExistingEntry()
      .then((route) => applyEntryRoute(this, route))
      .catch(() => this.setData({ checking: false, checked: true }))
  },

  goDemo() {
    wx.navigateTo({ url: '/subpackages/demo-project/pages/home/index' })
  },

  goHome() {
    wx.reLaunch({ url: '/pages/public-home/public-home' })
  }
})
