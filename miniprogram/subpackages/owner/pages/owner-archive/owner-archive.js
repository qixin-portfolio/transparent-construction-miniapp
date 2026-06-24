const { call, showError } = require('../../../../services/cloud')

function formatDate(dateStr) {
  if (!dateStr) return '暂未填写'
  if (typeof dateStr === 'string') return dateStr.slice(0, 10)
  if (dateStr && dateStr.$date) return new Date(dateStr.$date).toISOString().slice(0, 10)
  if (dateStr && dateStr.$numberLong) return new Date(Number(dateStr.$numberLong)).toISOString().slice(0, 10)
  try { return new Date(dateStr).toISOString().slice(0, 10) } catch (e) { return '暂未填写' }
}

function formatDateTime(dateStr) {
  if (!dateStr) return ''
  if (typeof dateStr === 'string' && dateStr.length >= 16) return dateStr.slice(5, 16).replace('T', ' ')
  try {
    const d = new Date(dateStr)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${mm}月${dd}日 ${hh}:${mi}`
  } catch (e) { return '' }
}

Page({
  data: {
    loading: false,
    projectId: '',
    project: null,
    archive: null,
    sectionsList: [],
    showEmpty: false
  },

  onLoad(options) {
    this.setData({ projectId: String(options.projectId || '').trim() })
  },

  onShow() {
    this.loadArchive()
  },

  loadArchive() {
    this.setData({ loading: true })
    getApp().ensureLogin()
      .then(() => call('getOwnerArchive', { projectId: this.data.projectId }))
      .then((res) => {
        const archive = res.archive || null
        const project = res.project || null
        const supplementStats = (archive && archive.supplementStats) || { hydro: 0, material: 0, completion: 0 }

        let sectionsList = []
        if (archive) {
          const s = archive.sections || {}
          const hydroCount = supplementStats.hydro || 0
          const materialCount = supplementStats.material || 0
          const completionOwnerCount = supplementStats.completion || 0
          const completionTotalCount = (archive.completionPhotos || []).length + completionOwnerCount
          sectionsList = [
            { key: 'designFiles', icon: '图', title: '设计图纸', desc: '效果图、平面图、施工图', count: archive.drawingCount || 0, countText: archive.drawingCount ? `${archive.drawingCount} 份` : '暂无资料', hasData: !!s.designFiles, emptyText: '暂无资料', canSupplement: false },
            { key: 'hydroFiles', icon: '水', title: '水电资料', desc: '水电走向、隐蔽工程照片', count: hydroCount, countText: s.hydroFiles ? (hydroCount ? `${hydroCount} 份` : '已归档') : (hydroCount ? `${hydroCount} 份` : '点此补充 ›'), hasData: !!s.hydroFiles, emptyText: '点此补充 ›', canSupplement: true },
            { key: 'materialList', icon: '材', title: '材料清单', desc: '主材、辅材、选品记录', count: materialCount, countText: materialCount ? `${materialCount} 份` : '点此补充 ›', hasData: !!s.materialList, emptyText: '点此补充 ›', canSupplement: true },
            { key: 'acceptanceRecords', icon: '验', title: '验收记录', desc: '节点验收、确认记录', count: 0, countText: s.acceptanceRecords ? '已归档' : '暂无记录', hasData: !!s.acceptanceRecords, emptyText: '暂无记录', canSupplement: false },
            { key: 'constructionPhotos', icon: '工', title: '施工照片', desc: '施工过程照片归档', count: archive.photoCount || 0, countText: archive.photoCount ? `${archive.photoCount} 张` : '暂无照片', hasData: !!s.constructionPhotos, emptyText: '暂无照片', canSupplement: false },
            { key: 'completionPhotos', icon: '工', title: '完工资料', desc: '竣工照片、交付记录', count: completionTotalCount, countText: completionTotalCount ? `${completionTotalCount} 张` : '点此补充 ›', hasData: !!s.completionPhotos, emptyText: '点此补充 ›', canSupplement: true }
          ]
        }

        this.setData({
          project,
          archive,
          sectionsList,
          showEmpty: !archive || archive.archivedCount === 0
        })
      })
      .catch((error) => showError('档案加载失败', error))
      .finally(() => this.setData({ loading: false }))
  },

  previewPhoto(e) {
    const { urls, current } = e.currentTarget.dataset
    if (!urls || !urls.length) return
    wx.previewImage({ current: current || urls[0], urls })
  },

  goDrawings() {
    const projectId = this.data.projectId
    if (!projectId) return
    wx.navigateTo({ url: `/subpackages/owner/pages/archive-drawings/archive-drawings?projectId=${projectId}` })
  },

  goSection(e) {
    const { key } = e.currentTarget.dataset
    if (key === 'designFiles') {
      this.goDrawings()
      return
    }
    // 水电/材料/完工 三类允许业主自己上传补充
    const supplementMap = {
      hydroFiles: 'hydro',
      materialList: 'material',
      completionPhotos: 'completion'
    }
    if (supplementMap[key]) {
      const projectId = this.data.projectId
      if (!projectId) return
      wx.navigateTo({
        url: `/subpackages/owner/pages/supplement-upload/supplement-upload?projectId=${projectId}&category=${supplementMap[key]}`
      })
      return
    }
    // 其他资料暂无独立子页，提示
    wx.showToast({ title: '资料暂未整理，晟景工作人员整理后会在这里展示', icon: 'none', duration: 2500 })
  },

  goTimeline() {
    const projectId = this.data.projectId
    if (!projectId) return
    wx.navigateTo({ url: `/subpackages/owner/pages/owner/owner?projectId=${projectId}` })
  },

  callService() {
    const archive = this.data.archive || {}
    const phone = (archive.warrantyCard && archive.warrantyCard.servicePhone) || '4000000000'
    wx.makePhoneCall({ phoneNumber: phone, fail: () => {} })
  },

  goBack() {
    wx.navigateBack({ fail: () => {
      wx.redirectTo({ url: `/subpackages/owner/pages/completed-home/completed-home?projectId=${this.data.projectId}` })
    } })
  },

  formatDate,
  formatDateTime
})
