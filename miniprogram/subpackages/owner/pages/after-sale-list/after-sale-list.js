const { call, showError } = require('../../../../services/cloud')

const STATUS_TEXT = {
  pending: '待受理',
  submitted: '待受理',
  accepted: '已受理',
  assigned: '已派单',
  processing: '处理中',
  waiting_owner_confirm: '待业主确认',
  completed: '已完成',
  done: '已完成',
  closed: '已关闭',
  rejected: '已关闭'
}

Page({
  data: {
    loading: false,
    projectId: '',
    items: []
  },

  onLoad(options) {
    this.setData({ projectId: String(options.projectId || '').trim() })
  },

  onShow() {
    this.loadTickets()
  },

  loadTickets() {
    this.setData({ loading: true })
    call('listAfterSalesTickets', { projectId: this.data.projectId })
      .then((res) => {
        const items = (res.items || []).map((item) => Object.assign({}, item, {
          issueType: item.issueType || item.category || '售后报修',
          statusText: STATUS_TEXT[item.status] || item.status || '待受理',
          createdAtText: this.formatDate(item.createdAt),
          updatedAtText: this.formatDate(item.updatedAt || item.createdAt)
        }))
        this.setData({ items })
      })
      .catch((error) => showError('工单加载失败', error))
      .finally(() => this.setData({ loading: false }))
  },

  goCreate() {
    wx.navigateTo({ url: `/subpackages/owner/pages/after-sale-create/after-sale-create?projectId=${this.data.projectId}` })
  },

  goDetail(event) {
    const ticketId = event.currentTarget.dataset.id
    if (!ticketId) return
    wx.navigateTo({ url: `/subpackages/owner/pages/after-sale-detail/after-sale-detail?ticketId=${ticketId}` })
  },

  formatDate(value) {
    if (!value) return ''
    let raw = value
    if (value.$date && value.$date.$numberLong) raw = Number(value.$date.$numberLong)
    if (value.$numberLong) raw = Number(value.$numberLong)
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return ''
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    const hour = `${date.getHours()}`.padStart(2, '0')
    const minute = `${date.getMinutes()}`.padStart(2, '0')
    return `${month}月${day}日 ${hour}:${minute}`
  }
})
