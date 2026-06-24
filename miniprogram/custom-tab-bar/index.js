Component({
  data: {
    selected: 0,
    list: []
  },

  attached() {
    this.buildList()
  },

  pageLifetimes: {
    show() {
      this.buildList()
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
    buildList() {
      var app = getApp()
      var user = app.globalData.user
      var isOwner = user && user.role === 'owner'

      var list = isOwner
        ? [
            { pagePath: '/pages/workbench/workbench', text: '工地', icon: 'site' },
            { pagePath: '/pages/projects/projects', text: '晟景', icon: 'brand' },
            { pagePath: '/pages/profile/profile', text: '我的', icon: 'user' }
          ]
        : [
            { pagePath: '/pages/workbench/workbench', text: '首页', icon: 'home' },
            { pagePath: '/pages/projects/projects', text: '工地', icon: 'site' },
            { pagePath: '/pages/profile/profile', text: '我的', icon: 'user' }
          ]

      this.setData({ list: list })
    },

    switchTab(e) {
      var index = e.currentTarget.dataset.index
      var item = this.data.list[index]
      if (!item) return
      wx.switchTab({ url: item.pagePath })
    }
  }
})
