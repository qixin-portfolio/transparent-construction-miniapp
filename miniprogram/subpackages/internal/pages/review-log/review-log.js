const { call, showError } = require('../../../../services/cloud')
const { DEMO_MODE, demoLogs } = require('../../../../utils/demo')

function normalizeIssueText(value) {
  const text = String(value || '').trim().slice(0, 300)
  const compact = text.replace(/[，。！？；：,.!?;:\s]/g, '')
  const noIssueTexts = [
    '无',
    '无问题',
    '暂无问题',
    '没有问题',
    '无现场问题',
    '暂无现场问题',
    '没有现场问题',
    '无明显现场问题',
    '暂无明显现场问题',
    '没有明显现场问题',
    '暂未发现现场问题',
    '暂未发现明显现场问题',
    '未发现现场问题',
    '未发现明显现场问题',
    '无明显异常',
    '暂无明显异常',
    '没有明显异常',
    '现场验收合格'
  ]
  return noIssueTexts.indexOf(compact) !== -1 ? '' : text
}

Page({
  data: {
    loading: false,
    reviewingId: '',
    userRole: '',
    items: [],
    rejectDialogVisible: false,
    rejectReason: '',
    rejectTargetId: ''
  },

  onShow() {
    const user = getApp().globalData.user
    if (!user) {
      this.setData({ items: [] })
      return
    }
    this.setData({ userRole: user.role || '' })
    this.loadItems()
  },

  loadItems() {
    this.setData({ loading: true })
    call('listPendingStageLogs')
      .then((res) => {
        this.setData({ items: this.prepareItems(res.items || []) })
      })
      .catch((error) => {
        if (DEMO_MODE) {
          this.setData({ items: this.prepareItems(demoLogs) })
          return
        }
        this.setData({ items: [] })
        showError('待审核加载失败', error)
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  prepareItems(items) {
    return (items || []).map((item) => Object.assign({}, item, {
      photoFileIDs: item.photoFileIDs || item.photos || [],
      issue: normalizeIssueText(item.issue),
      dateText: this.formatTime(item.createdAt || item.updatedAt),
      submitterText: item.submittedByName || '内部人员',
      aiGenerated: !!item.aiGenerated || /^ai_/.test(item.sourceType || ''),
      ownerSummary: item.ownerSummary || '',
      ownerSummaryText: item.ownerSummary || '',
      voiceTranscriptText: item.voiceTranscript || '',
      aiSummaryLoading: false
    }))
  },

  formatTime(value) {
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
  },

  previewPhoto(event) {
    const url = event.currentTarget.dataset.url
    const urls = event.currentTarget.dataset.urls || []
    if (!url) return
    wx.previewImage({ current: url, urls })
  },

  review(event) {
    const id = event.currentTarget.dataset.id
    const action = event.currentTarget.dataset.action
    const isApprove = action === 'approve'
    if (!isApprove) {
      this.setData({
        rejectDialogVisible: true,
        rejectReason: '',
        rejectTargetId: id
      })
      return
    }
    wx.showModal({
      title: isApprove ? '确认审核通过？' : '确认退回修改？',
      content: isApprove ? '通过后，这条日报和照片会展示给业主。' : '退回后，业主不会看到这条日报。',
      confirmText: isApprove ? '通过' : '退回',
      confirmColor: isApprove ? '#0F6A4A' : '#C24E45',
      success: (res) => {
        if (res.confirm) {
          this.doReview(id, action)
        }
      }
    })
  },

  onRejectReasonInput(event) {
    this.setData({ rejectReason: String(event.detail.value || '').slice(0, 120) })
  },

  hideRejectDialog() {
    if (this.data.reviewingId) return
    this.setData({ rejectDialogVisible: false, rejectReason: '', rejectTargetId: '' })
  },

  confirmReject() {
    const reason = String(this.data.rejectReason || '').trim()
    if (!reason) {
      showError('请填写退回原因')
      return
    }
    this.doReview(this.data.rejectTargetId, 'reject', reason)
  },

  noop() {},

  onOwnerSummaryInput(event) {
    const id = event.currentTarget.dataset.id
    const value = String(event.detail.value || '').slice(0, 200)
    const items = this.data.items.map(item => {
      if (item._id === id) {
        item.ownerSummary = value
      }
      return item
    })
    this.setData({ items })
  },

  generateAiSummary(event) {
    const id = event.currentTarget.dataset.id
    const item = this.data.items.find(i => i._id === id)
    if (!item) return
    const items = this.data.items.map(i => {
      if (i._id === id) i.aiSummaryLoading = true
      return i
    })
    this.setData({ items })
    call('aiGenerateOwnerSummary', { stageLogId: id })
      .then((result) => {
        if (result && result.summary) {
          const updated = this.data.items.map(i => {
            if (i._id === id) {
              i.ownerSummary = result.summary
              i.aiSummaryLoading = false
            }
            return i
          })
          this.setData({ items: updated })
          wx.showToast({ title: 'AI 摘要已生成，可修改后再通过', icon: 'none' })
        } else {
          throw new Error((result && result.message) || '生成失败')
        }
      })
      .catch((error) => {
        const updated = this.data.items.map(i => {
          if (i._id === id) i.aiSummaryLoading = false
          return i
        })
        this.setData({ items: updated })
        showError('AI 生成失败', error)
      })
  },

  doReview(id, action, rejectReason = '') {
    this.setData({ reviewingId: id })
    const reviewItem = this.data.items.find(i => i._id === id)
    const params = { stageLogId: id, action, rejectReason }
    if (action === 'approve' && reviewItem && reviewItem.ownerSummary) {
      params.ownerSummary = reviewItem.ownerSummary
    }
    call('reviewStageLog', params)
      .then(() => {
        wx.showToast({
          title: action === 'approve' ? '已通过，业主将收到通知' : '已退回',
          icon: 'success'
        })
        this.setData({ rejectDialogVisible: false, rejectReason: '', rejectTargetId: '' })
        this.loadItems()
      })
      .catch((error) => {
        showError('审核失败', error)
      })
      .finally(() => {
        this.setData({ reviewingId: '' })
      })
  }
})
