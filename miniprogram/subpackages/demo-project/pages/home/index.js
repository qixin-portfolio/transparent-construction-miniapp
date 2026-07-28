const { demoProject } = require('../../mock/demo-project-data')

Page({
  data: { project: demoProject },
  goPage(event) {
    const page = event.currentTarget.dataset.page
    if (!page) return
    wx.navigateTo({ url: `/subpackages/demo-project/pages/${page}/index` })
  }
})
