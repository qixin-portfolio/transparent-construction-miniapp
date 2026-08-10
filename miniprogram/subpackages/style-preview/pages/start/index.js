const mockService = require('../../mock/style-preview-service')
const realService = require('../../services/real-preview-service')
const { mockModeEnabled } = require('../../../../utils/style-preview-mock-mode')
const ROOM_TYPES = ['客厅', '主卧', '次卧', '餐厅', '厨房', '卫生间', '阳台']

Page({
  data: { customers: [], customerIndex: 0, selectedCustomer: null, roomTypes: ROOM_TYPES, roomIndex: 0, sourceImage: '', referenceImage: '', note: '', creating: false, mockAccess: false, loading: true },
  onLoad(options = {}) {
    this.isMock = mockModeEnabled(options)
    if (this.isMock) {
      const customers = mockService.listCustomers()
      const selectedCustomer = customers.find((item) => item.id === String(options.customerId || '')) || customers[0]
      this.setData({ customers, selectedCustomer, customerIndex: customers.indexOf(selectedCustomer), mockAccess: true, loading: false })
      return
    }
    realService.checkAccess().then(() => realService.listCustomers()).then((customers) => {
      const selectedCustomer = customers.find((item) => item._id === String(options.customerId || '')) || customers[0] || null
      this.setData({ customers, selectedCustomer, customerIndex: Math.max(0, customers.indexOf(selectedCustomer)), loading: false })
    }).catch(() => this.deny())
  },
  deny() { wx.showToast({ title: '该功能暂未开放', icon: 'none' }); setTimeout(() => wx.navigateBack(), 600) },
  onCustomerChange(event) { const index = Number(event.detail.value || 0); this.setData({ customerIndex: index, selectedCustomer: this.data.customers[index] }) },
  onRoomChange(event) { this.setData({ roomIndex: Number(event.detail.value || 0) }) },
  onNoteInput(event) { this.setData({ note: event.detail.value }) },
  chooseImage(event) { const target = event.currentTarget.dataset.target; wx.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed'], success: (res) => { const file = (res.tempFiles || [])[0]; if (file && file.tempFilePath) this.setData({ [target]: file.tempFilePath }) } }) },
  useFixture(event) { if (!this.isMock) return; const target = event.currentTarget.dataset.target; this.setData({ [target]: target === 'sourceImage' ? mockService.FIXTURE_IMAGES.sourceImage : mockService.FIXTURE_IMAGES.referenceImage }) },
  async createPreview() {
    const customer = this.data.selectedCustomer
    if (!customer || !this.data.sourceImage || !this.data.referenceImage) { wx.showToast({ title: '请选择客户并准备两张图片', icon: 'none' }); return }
    this.setData({ creating: true })
    try {
      if (this.isMock) {
        const session = mockService.createSession({ customerId: customer.id, customerName: customer.name, roomType: ROOM_TYPES[this.data.roomIndex], sourceImage: this.data.sourceImage, referenceImage: this.data.referenceImage, note: this.data.note })
        wx.navigateTo({ url: `/subpackages/style-preview/pages/processing/index?id=${session.id}&mock=1` })
      } else {
        const task = await realService.createPreview({ customerId: customer._id, roomType: ROOM_TYPES[this.data.roomIndex], sourceImage: this.data.sourceImage, referenceImage: this.data.referenceImage, note: this.data.note })
        wx.navigateTo({ url: `/subpackages/style-preview/pages/processing/index?id=${task.sessionId}&taskId=${task.taskId}` })
      }
    } catch (error) { wx.showToast({ title: error.message || '创建失败，请稍后重试', icon: 'none' }) } finally { this.setData({ creating: false }) }
  },
  goHistory() { const customer = this.data.selectedCustomer; if (!customer) return; wx.navigateTo({ url: `/subpackages/style-preview/pages/history/index?customerId=${customer._id || customer.id}${this.isMock ? '&mock=1' : ''}` }) }
})
