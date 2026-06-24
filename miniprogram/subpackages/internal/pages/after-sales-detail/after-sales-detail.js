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

const ACTION_TEXT = {
  created: '提交报修',
  accepted: '已受理',
  processing: '处理中',
  waiting_owner_confirm: '待业主确认',
  closed: '已关闭',
  owner_confirmed: '业主确认完成'
}

Page({
  data: {
    loading: false,
    submitting: false,
    ticketId: '',
    ticket: null,
    logs: []
  },

  onLoad(options) {
    this.setData({ ticketId: String(options.ticketId || '').trim() })
  },

  onShow() {
    this.loadDetail()
  },

  loadDetail() {
    if (!this.data.ticketId) return
    this.setData({ loading: true })
    call('getAfterSalesTicket', { ticketId: this.data.ticketId })
      .then((res) => {
        this.setData({
          ticket: this.formatTicket(res.ticket || null),
          logs: (res.logs || []).map((item) => Object.assign({}, item, {
            actionText: ACTION_TEXT[item.action] || item.action || '处理记录',
            createdAtText: this.formatDate(item.createdAt)
          }))
        })
      })
      .catch((error) => showError('工单加载失败', error))
      .finally(() => this.setData({ loading: false }))
  },

  formatTicket(ticket) {
    if (!ticket) return null
    const images = Array.isArray(ticket.images) ? ticket.images : (ticket.photoFileIDs || [])
    return Object.assign({}, ticket, {
      images,
      issueType: ticket.issueType || ticket.category || '售后报修',
      issueDescription: ticket.issueDescription || ticket.description || '',
      expectedVisitTime: ticket.expectedVisitTime || ticket.preferredTime || '',
      statusText: STATUS_TEXT[ticket.status] || ticket.status || '待受理'
    })
  },

  quickAction(event) {
    const action = event.currentTarget.dataset.action
    this.updateTicket({ action })
  },

  markWaitConfirm() {
    wx.showModal({
      title: '填写处理结果',
      content: this.data.ticket && this.data.ticket.serviceResult ? `当前结果：${this.data.ticket.serviceResult}` : '',
      editable: true,
      placeholderText: '例如：已上门处理，更换五金件，现场确认正常',
      confirmText: '提交',
      success: (res) => {
        if (!res.confirm) return
        const serviceResult = String(res.content || '').trim()
        if (!serviceResult) {
          wx.showToast({ title: '请填写处理结果', icon: 'none' })
          return
        }
        this.updateTicket({ action: 'wait_owner_confirm', serviceResult, remark: serviceResult })
      }
    })
  },

  closeTicket() {
    wx.showModal({
      title: '关闭工单',
      content: '请填写关闭原因',
      editable: true,
      placeholderText: '例如：业主取消报修、重复工单',
      confirmText: '关闭',
      confirmColor: '#D9534F',
      success: (res) => {
        if (!res.confirm) return
        this.updateTicket({ action: 'close', remark: String(res.content || '').trim() || '售后工单已关闭' })
      }
    })
  },

  updateTicket(payload) {
    if (this.data.submitting || !this.data.ticketId) return
    this.setData({ submitting: true })
    call('updateAfterSalesTicket', Object.assign({ ticketId: this.data.ticketId }, payload))
      .then(() => {
        wx.showToast({ title: '已更新', icon: 'success' })
        this.loadDetail()
      })
      .catch((error) => showError('更新失败', error))
      .finally(() => this.setData({ submitting: false }))
  },

  previewPhoto(event) {
    const photos = event.currentTarget.dataset.photos || []
    const index = event.currentTarget.dataset.index || 0
    if (!photos.length) return
    wx.previewImage({ urls: photos, current: photos[index] || photos[0] })
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
