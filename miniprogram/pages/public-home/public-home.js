function applyEntryRoute(page, route) {
  if (!route || route.type === 'public') {
    page.setData({ checking: false })
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
  data: {
    checking: true
  },

  onShow() {
    const app = getApp()
    const context = app.getEntryContext ? app.getEntryContext() : null
    if (context && context.type !== 'public' && app.routeEntryContextIfNeeded) {
      app.routeEntryContextIfNeeded(context)
      return
    }
    if (context && context.type === 'public' && app.clearEntryContext) app.clearEntryContext()
    this.restoreExistingEntry()
  },

  restoreExistingEntry() {
    const app = getApp()
    this.setData({ checking: true })
    app.resolveExistingEntry()
      .then((route) => applyEntryRoute(this, route))
      .catch(() => this.setData({ checking: false }))
  },

  goMyProject() {
    wx.navigateTo({ url: '/subpackages/public-access/pages/project-unbound/project-unbound' })
  },

  goDemo() {
    wx.navigateTo({ url: '/subpackages/demo-project/pages/home/index' })
  },

  goStaff() {
    wx.switchTab({ url: '/pages/workbench/workbench' })
  }
})
