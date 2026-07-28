const previewService = require('../../mock/style-preview-service')

function decode(value) {
  try {
    return decodeURIComponent(String(value || ''))
  } catch (error) {
    return String(value || '')
  }
}

function decorateSession(session) {
  const styleIntent = session.styleIntent || {}
  return Object.assign({}, session, {
    styleIntent: Object.assign({}, styleIntent, {
      colorPaletteText: (styleIntent.colorPalette || []).join(' · '),
      materialsText: (styleIntent.materials || []).join(' · ')
    })
  })
}

Page({
  data: {
    session: null,
    feedback: '',
    feedbackSaved: false
  },

  onLoad(options = {}) {
    const session = decorateSession(previewService.getSession(
      String(options.id || ''),
      decode(options.customerId),
      decode(options.customerName)
    ))
    this.setData({ session, feedback: session.feedback || '' })
  },

  previewImage(event) {
    const current = event.currentTarget.dataset.src
    const session = this.data.session
    wx.previewImage({
      current,
      urls: [session.sourceImage, session.referenceImage, session.previewImage]
    })
  },

  onFeedbackInput(event) {
    this.setData({ feedback: event.detail.value, feedbackSaved: false })
  },

  saveFeedback() {
    const session = previewService.saveFeedback(this.data.session.id, this.data.feedback)
    if (!session) return
    this.setData({ session: decorateSession(session), feedback: session.feedback, feedbackSaved: true })
    wx.showToast({ title: '反馈已保存在本机', icon: 'success' })
  },

  regenerate() {
    const session = this.data.session
    wx.redirectTo({
      url: `/subpackages/style-preview/pages/start/index?customerId=${encodeURIComponent(session.customerId)}&customerName=${encodeURIComponent(session.customerName)}&mock=1`
    })
  },

  goHistory() {
    const session = this.data.session
    wx.navigateTo({
      url: `/subpackages/style-preview/pages/history/index?customerId=${encodeURIComponent(session.customerId)}&customerName=${encodeURIComponent(session.customerName)}`
    })
  },

  backToCustomer() {
    const session = this.data.session
    wx.redirectTo({
      url: `/subpackages/internal/pages/customer-edit/customer-edit?id=${encodeURIComponent(session.customerId)}&stylePreviewMock=1`
    })
  }
})
