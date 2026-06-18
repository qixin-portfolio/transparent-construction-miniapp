Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/workbench/workbench', text: '首页', icon: 'home' },
      { pagePath: '/pages/projects/projects', text: '工地', icon: 'site' },
      { pagePath: '/pages/profile/profile', text: '我的', icon: 'user' }
    ]
  },

  pageLifetimes: {
    show() {
      const pages = getCurrentPages()
      const current = pages[pages.length - 1]
      if (!current) return
      const route = '/' + current.route
      const index = this.data.list.findIndex(function (item) {
        return item.pagePath === route
      })
      if (index >= 0 && index !== this.data.selected) {
        this.setData({ selected: index })
      }
    }
  },

  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index
      const item = this.data.list[index]
      if (!item) return
      wx.switchTab({ url: item.pagePath })
    }
  }
})
