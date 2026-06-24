const { call, showError } = require('../../../../services/cloud')

Page({
  data: {
    loading: false,
    projectId: '',
    items: []
  },

  onLoad(options) {
    this.setData({ projectId: String(options.projectId || '').trim() })
    this.loadBenefits()
  },

  loadBenefits() {
    this.setData({ loading: true })
    call('listCustomerBenefits', { projectId: this.data.projectId })
      .then((res) => this.setData({ items: res.items || [] }))
      .catch((error) => showError('权益加载失败', error))
      .finally(() => this.setData({ loading: false }))
  }
})
