const previewService = require('../../mock/style-preview-service')

function decode(value) {
  try {
    return decodeURIComponent(String(value || ''))
  } catch (error) {
    return String(value || '')
  }
}

function formatDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '刚刚创建'
  const pad = (number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

Page({
  data: {
    customerId: '',
    customerName: '',
    sessions: []
  },

  onLoad(options = {}) {
    const customerId = decode(options.customerId)
    const customerName = decode(options.customerName)
    this.setData({ customerId, customerName })
    this.loadSessions()
  },

  onShow() {
    if (this.data.customerId) this.loadSessions()
  },

  loadSessions() {
    const sessions = previewService.listSessions(this.data.customerId, this.data.customerName).map((item) => Object.assign({}, item, {
      createdAtText: formatDate(item.createdAt),
      statusText: item.status === 'completed' ? '已生成' : '处理中'
    }))
    this.setData({ sessions })
  },

  viewResult(event) {
    const id = event.currentTarget.dataset.id
    wx.navigateTo({
      url: `/subpackages/style-preview/pages/result/index?id=${encodeURIComponent(id)}&customerId=${encodeURIComponent(this.data.customerId)}&customerName=${encodeURIComponent(this.data.customerName)}`
    })
  },

  createNew() {
    wx.redirectTo({
      url: `/subpackages/style-preview/pages/start/index?customerId=${encodeURIComponent(this.data.customerId)}&customerName=${encodeURIComponent(this.data.customerName)}&mock=1`
    })
  }
})
