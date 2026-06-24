const { call, showError } = require('../../../../services/cloud')
const { formatPublicCase } = require('../../../../utils/caseDisplay')
const { getReferenceCaseById, isReferenceCaseId } = require('../../../../utils/reference-cases')

Page({
  data: {
    loading: true,
    caseId: '',
    caseItem: null,    // 原始数据
    display: null      // format 后的展示数据
  },

  onLoad(options) {
    const caseId = String(options.caseId || '').trim()
    if (!caseId) {
      wx.showToast({ title: '案例 ID 缺失', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this.setData({ caseId })
    this.loadCase()
  },

  loadCase() {
    const { caseId } = this.data

    // 优先判断：本地参考案例直接直出，不依赖云函数
    if (isReferenceCaseId(caseId)) {
      const refCase = getReferenceCaseById(caseId)
      const display = formatPublicCase(refCase)
      if (display && display.canShow) {
        this.setData({ caseItem: refCase, display, loading: false })
        return
      }
      // 参考案例 format 失败（理论上不会）
      wx.showToast({ title: '案例数据异常', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      this.setData({ loading: false })
      return
    }

    // 真实授权案例：走云函数
    this.setData({ loading: true })
    call('listPublicCases', { action: 'detail', caseId })
      .then((res) => {
        const caseItem = res.case
        if (!caseItem) {
          wx.showToast({ title: '案例不存在', icon: 'none' })
          setTimeout(() => wx.navigateBack(), 1500)
          return
        }
        const display = formatPublicCase(caseItem)
        if (!display.canShow) {
          wx.showToast({ title: '案例未授权展示', icon: 'none' })
          setTimeout(() => wx.navigateBack(), 1500)
          return
        }
        this.setData({ caseItem, display })
      })
      .catch((error) => showError('案例加载失败', error))
      .finally(() => this.setData({ loading: false }))
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

  goCaseList() {
    wx.navigateBack({ fail: () => {
      wx.redirectTo({ url: '/subpackages/owner/pages/case-list/case-list' })
    } })
  },

  onShareAppMessage() {
    const display = this.data.display
    if (!display) return { title: '晟景装饰 · 真实完工案例' }
    return {
      title: `${display.displayTitle} · 晟景装饰`,
      path: `/subpackages/owner/pages/case-detail/case-detail?caseId=${this.data.caseId}`,
      imageUrl: display.coverImage || ''
    }
  },

  onShareTimeline() {
    const display = this.data.display
    return {
      title: display ? `${display.displayTitle} · 晟景装饰` : '晟景装饰 · 真实完工案例',
      query: `caseId=${this.data.caseId}`
    }
  }
})
