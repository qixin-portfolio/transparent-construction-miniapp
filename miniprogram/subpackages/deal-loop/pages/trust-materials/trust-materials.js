const { materialTypes } = require('../../mock/trustMaterials')
const { filterMaterials, getMaterialSummary } = require('../../utils/materialMapper')

Page({
  data: {
    materialTypes,
    activeType: 'all',
    materials: []
  },

  onLoad() {
    this.applyFilter()
  },

  switchType(event) {
    const type = event.currentTarget.dataset.type || 'all'
    this.setData({ activeType: type }, () => this.applyFilter())
  },

  applyFilter() {
    this.setData({ materials: filterMaterials(this.data.activeType) })
  },

  mockSendMaterial(event) {
    const id = event.currentTarget.dataset.id
    const material = this.data.materials.find((item) => item.materialId === id)
    wx.showModal({
      title: 'Mock 发送',
      content: material ? getMaterialSummary(material) : '当前仅为 mock 提示，不调用分享或接口。',
      showCancel: false
    })
  }
})
