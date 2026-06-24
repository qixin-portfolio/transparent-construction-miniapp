const { call, showError } = require('../../../../services/cloud')

function safePathText(text) {
  return String(text || 'unknown')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '-')
    .slice(0, 40)
}

Page({
  data: {
    projectId: '',
    submitting: false,
    categoryOptions: ['水电问题', '墙面问题', '木作 / 柜体问题', '五金 / 安装问题', '防水 / 渗漏问题', '其他问题'],
    categoryIndex: 5,
    photos: [],
    form: {
      category: '其他问题',
      description: '',
      contactName: '',
      contactPhone: '',
      preferredTime: ''
    }
  },

  onLoad(options) {
    this.setData({ projectId: String(options.projectId || '').trim() })
    getApp().ensureLogin()
      .then((user) => {
        this.setData({
          'form.contactName': user.name || user.nickName || '',
          'form.contactPhone': user.phone || ''
        })
      })
      .catch(() => {})
  },

  onInput(event) {
    const key = event.currentTarget.dataset.key
    this.setData({ [`form.${key}`]: event.detail.value })
  },

  onCategoryChange(event) {
    const index = Number(event.detail.value) || 0
    this.setData({
      categoryIndex: index,
      'form.category': this.data.categoryOptions[index]
    })
  },

  choosePhotos() {
    const remain = 6 - this.data.photos.length
    if (remain <= 0) {
      wx.showToast({ title: '最多上传 6 张照片', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const items = (res.tempFiles || []).map((item) => item.tempFilePath).filter(Boolean)
        this.setData({ photos: this.data.photos.concat(items).slice(0, 6) })
      }
    })
  },

  removePhoto(event) {
    const index = event.currentTarget.dataset.index
    const photos = this.data.photos.slice()
    photos.splice(index, 1)
    this.setData({ photos })
  },

  uploadPhotos() {
    const projectId = safePathText(this.data.projectId)
    const tasks = this.data.photos.map((filePath, index) => {
      const suffix = filePath.match(/\.[a-zA-Z0-9]+$/)
      const ext = suffix ? suffix[0] : '.jpg'
      return wx.cloud.uploadFile({
        cloudPath: `after-sales/${projectId}/${Date.now()}-${index}${ext}`,
        filePath
      }).then((res) => res.fileID)
    })
    return Promise.all(tasks)
  },

  submit() {
    if (this.data.submitting) return
    const form = this.data.form
    if (!form.description && !this.data.photos.length) {
      wx.showToast({ title: '请填写问题描述或上传照片', icon: 'none' })
      return
    }
    if (!form.contactPhone) {
      wx.showToast({ title: '请填写联系电话', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    this.uploadPhotos()
      .then((photoFileIDs) => call('createAfterSalesTicket', Object.assign({}, form, {
        projectId: this.data.projectId,
        photoFileIDs
      })))
      .then((res) => {
        wx.showToast({ title: '已提交', icon: 'success' })
        setTimeout(() => {
          const ticketId = res.ticketId || res.id || ''
          wx.redirectTo({ url: `/subpackages/owner/pages/after-sale-detail/after-sale-detail?ticketId=${ticketId}` })
        }, 600)
      })
      .catch((error) => showError('提交失败', error))
      .finally(() => this.setData({ submitting: false }))
  }
})
