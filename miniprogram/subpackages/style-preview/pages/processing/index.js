const previewService = require('../../mock/style-preview-service')

function decode(value) {
  try {
    return decodeURIComponent(String(value || ''))
  } catch (error) {
    return String(value || '')
  }
}

Page({
  data: {
    session: null,
    currentStep: 0,
    completed: false,
    steps: [
      { title: '空间分析', copy: '识别采光面、开口与主要空间关系' },
      { title: '风格提取', copy: '整理参考图里的材质、色彩和氛围' },
      { title: '预览生成', copy: '按原图主视角生成沟通用预览' },
      { title: '结果完成', copy: '风格意向卡已经准备好' }
    ]
  },

  onLoad(options = {}) {
    const session = previewService.getSession(
      String(options.id || ''),
      decode(options.customerId),
      decode(options.customerName)
    )
    this.setData({ session })
    this.startProgress()
  },

  onUnload() {
    this.clearProgressTimer()
  },

  startProgress() {
    this.clearProgressTimer()
    this.progressTimer = setInterval(() => {
      const nextStep = this.data.currentStep + 1
      if (nextStep >= this.data.steps.length) {
        this.finishPreview()
        return
      }
      this.setData({ currentStep: nextStep })
    }, 900)
  },

  clearProgressTimer() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer)
      this.progressTimer = null
    }
  },

  finishPreview() {
    this.clearProgressTimer()
    const session = previewService.completeSession(this.data.session.id) || this.data.session
    this.setData({ session, currentStep: this.data.steps.length - 1, completed: true })
    setTimeout(() => {
      wx.redirectTo({
        url: `/subpackages/style-preview/pages/result/index?id=${encodeURIComponent(session.id)}&customerId=${encodeURIComponent(session.customerId)}&customerName=${encodeURIComponent(session.customerName)}`
      })
    }, 650)
  }
})
