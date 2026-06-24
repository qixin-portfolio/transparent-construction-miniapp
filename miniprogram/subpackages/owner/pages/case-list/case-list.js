const { call, showError } = require('../../../../services/cloud')
const { formatPublicCases } = require('../../../../utils/caseDisplay')
const { getReferenceCases } = require('../../../../utils/reference-cases')

Page({
  data: {
    loading: false,
    cases: [],          // format 后的展示数据
    source: '',         // 'real' or 'reference'
    realCount: 0
  },

  onLoad() {
    this.loadCases()
  },

  onPullDownRefresh() {
    this.loadCases().then(() => wx.stopPullDownRefresh())
  },

  loadCases() {
    this.setData({ loading: true })
    return call('listPublicCases', { action: 'list' })
      .then((res) => {
        const rawCases = res.cases || []
        // 过滤掉云函数返回的参考案例（旧版本可能 coverImage 为空）
        // 参考案例永远用本地版本，保证图片路径一致
        const realCases = rawCases.filter((c) => !c.isReference)
        const realCount = realCases.length
        // 本地参考案例（品牌门面）排前面，真实授权案例排后面
        const allRaw = getReferenceCases().concat(realCases)
        const cases = formatPublicCases(allRaw)
        this.setData({
          cases,
          source: realCount > 0 ? 'mixed' : 'reference',
          realCount
        })
      })
      .catch(() => {
        // 云函数未部署或调用失败：全部用本地参考案例（带图片）
        const cases = formatPublicCases(getReferenceCases())
        this.setData({ cases, source: 'reference', realCount: 0 })
      })
      .finally(() => this.setData({ loading: false }))
  },

  goDetail(e) {
    const { id } = e.currentTarget.dataset
    if (!id) return
    wx.navigateTo({ url: `/subpackages/owner/pages/case-detail/case-detail?caseId=${id}` })
  },

  previewPhoto(e) {
    const { current, urls } = e.currentTarget.dataset
    if (!urls || !urls.length) return
    wx.previewImage({ current: current || urls[0], urls })
  },

  callStore() {
    wx.makePhoneCall({ phoneNumber: '13935842860', fail: () => {} })
  },

  showAppointment() {
    const app = getApp()
    if (app && typeof app.showAppointment === 'function') {
      app.showAppointment()
    } else {
      wx.showToast({ title: '请前往门店页预约', icon: 'none' })
    }
  },

  onShareAppMessage() {
    return {
      title: '晟景装饰 · 交城本地真实完工案例',
      path: '/subpackages/owner/pages/case-list/case-list'
    }
  },

  onShareTimeline() {
    return {
      title: '晟景装饰 · 交城本地真实完工案例',
      query: ''
    }
  }
})
