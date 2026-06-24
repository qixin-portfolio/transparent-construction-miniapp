const { call, showError } = require('../../../../services/cloud')

Page({
  data: {
    loading: false,
    projectId: '',
    project: null,
    warrantyCard: null
  },

  onLoad(options) {
    this.setData({ projectId: String(options.projectId || '').trim() })
    this.loadCard()
  },

  loadCard() {
    this.setData({ loading: true })
    call('getWarrantyCard', { projectId: this.data.projectId })
      .then((res) => {
        const warrantyCard = res.warrantyCard
          ? this.prepareWarrantyCard(res.warrantyCard, res.project || null)
          : null
        this.setData({
          project: res.project || null,
          warrantyCard
        })
      })
      .catch((error) => showError('质保卡加载失败', error))
      .finally(() => this.setData({ loading: false }))
  },

  prepareWarrantyCard(card, project) {
    const items = Array.isArray(card.items) && card.items.length
      ? card.items
      : (Array.isArray(card.warrantyScope) ? card.warrantyScope.map((name) => ({
        name,
        period: '以合同约定为准',
        description: ''
      })) : [])
    return Object.assign({ items }, card, {
      ownerNameText: card.ownerName || '业主',
      projectAddressText: card.projectAddress || (project && project.address) || '未填写地址',
      deliveredAtText: this.formatDate(card.deliveredAt || (project && project.deliveredAt)) || '-',
      warrantyStartText: this.formatDate(card.warrantyStartAt) || card.startDate || '以交付日期为准',
      warrantyEndText: this.formatDate(card.warrantyEndAt) || card.endDate || '以合同约定为准',
      servicePhoneText: card.servicePhone || card.contactPhone || '13935842860',
      termsText: card.warrantyTerms || '具体质保期限与范围以合同约定为准。'
    })
  },

  formatDate(value) {
    if (!value) return ''
    let raw = value
    if (value.$date && value.$date.$numberLong) raw = Number(value.$date.$numberLong)
    if (value.$numberLong) raw = Number(value.$numberLong)
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return ''
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  goAfterSaleCreate() {
    const projectId = this.data.projectId || (this.data.project && this.data.project._id) || ''
    if (!projectId) {
      wx.showToast({ title: '缺少项目信息', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/subpackages/owner/pages/after-sale-create/after-sale-create?projectId=${projectId}` })
  }
})
