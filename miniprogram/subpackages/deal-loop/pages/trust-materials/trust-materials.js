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

  copyMaterial(event) {
    const id = event.currentTarget.dataset.id
    const material = this.data.materials.find((item) => item.materialId === id)
    wx.setClipboardData({
      data: getMaterialSummary(material)
    })
  }
})
