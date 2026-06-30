const { caseAssets } = require('../../mock/caseAssets')
const { getMaterialsByIds } = require('../../utils/materialMapper')
const { toCaseDraft } = require('../../utils/v1Adapters')

Page({
  data: {
    caseAssets,
    selectedIndex: 0,
    caseAsset: null,
    materials: [],
    caseDraft: null
  },

  onLoad() {
    this.useCaseAsset(caseAssets[0])
  },

  onCaseChange(event) {
    const selectedIndex = Number(event.detail.value || 0)
    this.setData({ selectedIndex }, () => this.useCaseAsset(this.data.caseAssets[selectedIndex]))
  },

  useCaseAsset(caseAsset) {
    this.setData({
      caseAsset,
      materials: getMaterialsByIds(caseAsset.materialIds),
      caseDraft: toCaseDraft(caseAsset)
    })
  },

  copyDraft(event) {
    const index = Number(event.currentTarget.dataset.index || 0)
    const draft = (this.data.caseAsset.contentDrafts || [])[index]
    wx.setClipboardData({
      data: draft ? `${draft.title}\n${draft.body}` : JSON.stringify(this.data.caseDraft, null, 2)
    })
  }
})
