const { call, showError } = require('../../../../services/cloud')

function calcDays(startDate, endDate) {
  if (!startDate || !endDate) return 0
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)))
}

function formatDate(dateStr) {
  if (!dateStr) return '暂未填写'
  if (typeof dateStr === 'string') return dateStr.slice(0, 10)
  try { return new Date(dateStr).toISOString().slice(0, 10) } catch (e) { return '暂未填写' }
}

// 按阶段分组施工照片
function groupProcessPhotos(milestones) {
  const STAGE_MAP = {
    '开工交底': '开工前',
    '拆改': '拆改阶段',
    '水电定位': '水电阶段',
    '水电施工': '水电阶段',
    '水电验收': '水电阶段',
    '防水施工': '防水阶段',
    '防水/闭水': '防水阶段',
    '防水验收': '防水阶段',
    '瓦工': '泥瓦阶段',
    '瓦工验收': '泥瓦阶段',
    '美缝': '泥瓦阶段',
    '木工施工': '木工阶段',
    '木工/吊顶': '木工阶段',
    '木工验收': '木工阶段',
    '油工/刮墙': '油工阶段',
    '定制安装': '安装阶段',
    '主材-木门': '安装阶段',
    '主材-衣柜': '安装阶段',
    '主材-橱柜': '安装阶段',
    '主材-石材': '安装阶段',
    '铝扣板吊顶': '安装阶段',
    '开关插座': '安装阶段',
    '灯具': '安装阶段',
    '窗帘': '安装阶段',
    '安装收尾': '安装阶段',
    '竣工验收': '竣工阶段',
    '竣工交付': '竣工阶段'
  }
  const groupMap = {}
  ;(milestones || []).forEach((m) => {
    const groupName = STAGE_MAP[m.stage] || m.stage || '其他'
    if (!groupMap[groupName]) groupMap[groupName] = { name: groupName, photos: [], desc: m.description || '' }
    ;(m.photos || []).forEach((p) => groupMap[groupName].photos.push(p))
  })
  return Object.values(groupMap).filter((g) => g.photos.length > 0)
}

Page({
  data: {
    loading: false,
    projectId: '',
    project: null,
    archive: null,
    // 纪念册专属
    coverUrl: '',
    coverPhotos: [],
    decorateDays: 0,
    processPhotos: [],
    hasData: false,
    albumStatus: 'pending', // pending / needs_photos / generated
    shareMode: false, // 是否为外部访客（简版）
    shareToken: '',
    canSharePublic: false,
    canShowHouseInfo: true
  },

  onLoad(options) {
    const projectId = String(options.projectId || '').trim()
    const shareMode = options.share === '1'
    const shareToken = String(options.shareToken || '').trim()
    this.setData({ projectId, shareMode, shareToken })
  },

  onShow() {
    this.loadAlbum()
  },

  loadAlbum() {
    this.setData({ loading: true })
    const isShareMode = this.data.shareMode
    const ready = isShareMode ? Promise.resolve() : getApp().ensureLogin()
    ready
      .then(() => call('getCompletionAlbum', {
        projectId: this.data.projectId,
        share: isShareMode ? 1 : 0,
        shareToken: this.data.shareToken
      }))
      .then((res) => {
        const project = res.project || null
        const archive = res.archive || null
        const completionPhotos = (archive && archive.completionPhotos) || []
        const milestones = (archive && archive.milestones) || []
        const houseInfo = (archive && archive.houseInfo) || {}
        const permissions = (archive && archive.permissions) || {}
        const authorization = res.authorization || null
        const shareToken = (authorization && authorization.shareToken) || this.data.shareToken || ''

        // 封面轮播图：优先完工实景照片（全部轮播），否则用首个里程碑照片占位
        let coverPhotos = []
        if (completionPhotos.length) {
          coverPhotos = completionPhotos.slice(0, 9)
        } else if (milestones.length && milestones[0].photos && milestones[0].photos.length) {
          coverPhotos = milestones[0].photos.slice(0, 1)
        }
        const coverUrl = coverPhotos[0] || ''

        // 装修天数
        const decorateDays = calcDays(houseInfo.startDate, houseInfo.completedAt || houseInfo.deliveredAt)

        // 过程照片按阶段分组
        const processPhotos = groupProcessPhotos(milestones)

        // 判断纪念册状态
        let albumStatus = 'pending'
        const hasMilestones = milestones.length > 0
        const hasCompletion = completionPhotos.length > 0
        if (hasMilestones && hasCompletion) {
          albumStatus = 'generated'
        } else if (hasMilestones && !hasCompletion) {
          albumStatus = 'needs_photos'
        }

        const hasData = hasMilestones || hasCompletion

        this.setData({
          project,
          archive,
          coverUrl,
          coverPhotos,
          decorateDays,
          processPhotos,
          hasData,
          albumStatus,
          shareToken,
          canSharePublic: !!shareToken,
          canShowHouseInfo: !isShareMode || permissions.houseInfo === true
        })
        if (shareToken) {
          wx.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] })
        } else {
          wx.hideShareMenu({ menus: ['shareTimeline'] })
        }
      })
      .catch((error) => {
        this.setData({
          project: null,
          archive: null,
          coverUrl: '',
          coverPhotos: [],
          decorateDays: 0,
          processPhotos: [],
          hasData: false,
          albumStatus: 'pending'
        })
        showError('纪念册加载失败', error)
      })
      .finally(() => this.setData({ loading: false }))
  },

  previewPhoto(e) {
    const { current, urls } = e.currentTarget.dataset
    if (!urls || !urls.length) return
    wx.previewImage({ current: current || urls[0], urls })
  },

  goArchive() {
    const projectId = this.data.projectId
    if (!projectId) return
    wx.navigateTo({ url: `/subpackages/owner/pages/owner-archive/owner-archive?projectId=${projectId}` })
  },

  goReferral() {
    const projectId = this.data.projectId
    if (!projectId) return
    wx.navigateTo({ url: `/subpackages/owner/pages/referral-create/referral-create?projectId=${projectId}` })
  },

  goAuthorization() {
    const projectId = this.data.projectId
    if (!projectId) return
    wx.navigateTo({ url: `/subpackages/owner/pages/case-authorization/case-authorization?projectId=${projectId}` })
  },

  callService() {
    const archive = this.data.archive || {}
    const phone = (archive.warrantyCard && archive.warrantyCard.servicePhone) || '4000000000'
    wx.makePhoneCall({ phoneNumber: phone, fail: () => {} })
  },

  onShareAppMessage() {
    const project = this.data.project || {}
    const archive = this.data.archive || {}
    const houseInfo = archive.houseInfo || {}
    // 简版分享：不暴露房号
    const title = `我的新家完工啦${houseInfo.style ? '·' + houseInfo.style : ''}，感谢晟景装饰`
    if (!this.data.shareToken) {
      return {
        title: '晟景装饰 · 透明工地',
        path: '/pages/projects/projects'
      }
    }
    return {
      title,
      path: `/subpackages/owner/pages/completion-album/completion-album?projectId=${this.data.projectId}&share=1&shareToken=${this.data.shareToken}`,
      imageUrl: this.data.coverUrl || ''
    }
  },

  onShareTimeline() {
    const project = this.data.project || {}
    return {
      title: `我的新家完工啦，感谢晟景装饰一路守护`,
      query: `projectId=${this.data.projectId}&share=1&shareToken=${this.data.shareToken}`,
      imageUrl: this.data.coverUrl || ''
    }
  },

  generatePoster() {
    wx.showToast({ title: '海报功能即将上线，敬请期待', icon: 'none', duration: 2500 })
  },

  formatDate
})
