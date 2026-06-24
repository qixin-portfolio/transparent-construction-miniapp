const { call, showError } = require('../../../../services/cloud')

Page({
  data: {
    loading: false,
    projectId: '',
    project: null,
    archive: null,
    archiveText: '待晟景整理',
    warrantyCard: null,
    ticketStats: { total: 0, open: 0 },
    latestTickets: [],
    benefits: [],
    authorization: null,
    authorizationText: '管理公开范围'
  },

  onLoad(options) {
    this.setData({ projectId: String(options.projectId || '').trim() })
  },

  onShow() {
    this.loadHome()
  },

  loadHome() {
    this.setData({ loading: true })
    getApp().ensureLogin()
      .then(() => call('getCompletedOwnerHome', { projectId: this.data.projectId }))
      .then((res) => {
        const project = res.project || null
        const archive = res.archive || null
        // 动态生成档案入口文案
        let archiveText = '待晟景整理'
        if (archive) {
          const archivedCount = archive.archivedCount || 0
          const missingCount = archive.missingCount || 0
          if (archive.archiveStatus === 'completed') {
            archiveText = '资料已整理完成'
          } else if (archivedCount > 0 && missingCount > 0) {
            archiveText = `已归档 ${archivedCount} 项，还有 ${missingCount} 项待补充`
          } else if (archivedCount > 0) {
            archiveText = `已归档 ${archivedCount} 项资料`
          }
        }
        // 动态生成纪念册入口文案
        let albumText = '待生成'
        if (archive) {
          const hasStages = (archive.stageLogCount || 0) > 0
          const hasPhotos = (archive.photoCount || 0) > 0
          if (hasStages && hasPhotos) {
            albumText = '保存家的变化'
          } else if (hasStages && !hasPhotos) {
            albumText = '待补充完工照片'
          } else if (archive.archiveStatus === 'organizing') {
            albumText = '正在整理照片'
          }
        }
        this.setData({
          projectId: project ? project._id : this.data.projectId,
          project,
          archive,
          archiveText,
          albumText,
          warrantyCard: res.warrantyCard || null,
          ticketStats: res.ticketStats || { total: 0, open: 0 },
          latestTickets: res.latestTickets || [],
          benefits: res.benefits || [],
          authorization: res.authorization || null,
          authorizationText: res.authorization && res.authorization.status === 'approved' ? '已授权' : '管理公开范围'
        })
      })
      .catch((error) => showError('完工服务加载失败', error))
      .finally(() => this.setData({ loading: false }))
  },

  goPage(event) {
    const page = event.currentTarget.dataset.page
    const projectId = this.data.projectId || ''
    if (!projectId) {
      wx.showToast({ title: '缺少工地信息', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/subpackages/owner/pages/${page}/${page}?projectId=${projectId}` })
  },

  goAfterSaleCreate() {
    this.goPage({ currentTarget: { dataset: { page: 'after-sale-create' } } })
  }
})
