const previewService = require('../../mock/style-preview-service')

const ROOM_TYPES = ['客厅', '主卧', '次卧', '餐厅', '厨房', '卫生间', '阳台']

function decode(value) {
  try {
    return decodeURIComponent(String(value || ''))
  } catch (error) {
    return String(value || '')
  }
}

Page({
  data: {
    customers: [],
    customerIndex: 0,
    selectedCustomer: null,
    roomTypes: ROOM_TYPES,
    roomIndex: 0,
    sourceImage: '',
    referenceImage: '',
    note: '',
    creating: false,
    mockAccess: false
  },

  onLoad(options = {}) {
    const customers = previewService.listCustomers()
    const customerId = String(options.customerId || '')
    const customerName = decode(options.customerName)
    const matched = customers.findIndex((item) => item.id === customerId)
    const selectedCustomer = matched >= 0
      ? customers[matched]
      : {
          id: customerId || customers[0].id,
          name: customerName || customers[0].name,
          community: customerId ? '当前客户' : customers[0].community,
          tenantId: 'mock-tenant'
        }
    const normalizedCustomers = matched >= 0 ? customers : [selectedCustomer].concat(customers)
    this.setData({
      customers: normalizedCustomers,
      customerIndex: matched >= 0 ? matched : 0,
      selectedCustomer,
      mockAccess: String(options.mock || '') === '1'
    })
  },

  onCustomerChange(event) {
    const customerIndex = Number(event.detail.value || 0)
    this.setData({
      customerIndex,
      selectedCustomer: this.data.customers[customerIndex]
    })
  },

  onRoomChange(event) {
    this.setData({ roomIndex: Number(event.detail.value || 0) })
  },

  onNoteInput(event) {
    this.setData({ note: event.detail.value })
  },

  chooseImage(event) {
    const target = event.currentTarget.dataset.target
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const file = (res.tempFiles || [])[0]
        if (!file || !file.tempFilePath) return
        this.setData({ [target]: file.tempFilePath })
      }
    })
  },

  useFixture(event) {
    const target = event.currentTarget.dataset.target
    const image = target === 'sourceImage'
      ? previewService.FIXTURE_IMAGES.sourceImage
      : previewService.FIXTURE_IMAGES.referenceImage
    this.setData({ [target]: image })
  },

  createPreview() {
    const customer = this.data.selectedCustomer
    if (!customer) {
      wx.showToast({ title: '请选择客户', icon: 'none' })
      return
    }
    if (!this.data.sourceImage || !this.data.referenceImage) {
      wx.showToast({ title: '请准备两张图片', icon: 'none' })
      return
    }
    this.setData({ creating: true })
    const session = previewService.createSession({
      customerId: customer.id,
      customerName: customer.name,
      roomType: this.data.roomTypes[this.data.roomIndex],
      sourceImage: this.data.sourceImage,
      referenceImage: this.data.referenceImage,
      note: this.data.note
    })
    wx.navigateTo({
      url: `/subpackages/style-preview/pages/processing/index?id=${session.id}&customerId=${encodeURIComponent(customer.id)}&customerName=${encodeURIComponent(customer.name)}`,
      complete: () => this.setData({ creating: false })
    })
  },

  goHistory() {
    const customer = this.data.selectedCustomer
    if (!customer) return
    wx.navigateTo({
      url: `/subpackages/style-preview/pages/history/index?customerId=${encodeURIComponent(customer.id)}&customerName=${encodeURIComponent(customer.name)}`
    })
  }
})
