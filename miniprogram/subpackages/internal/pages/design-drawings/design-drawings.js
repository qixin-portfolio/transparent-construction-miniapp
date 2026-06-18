const { call, uploadImage, showError } = require('../../../../services/cloud')
const { DRAWING_TYPES, DRAWING_SPACES } = require('../../../../utils/constants')

const TYPE_MAP = DRAWING_TYPES.reduce((m, t) => (m[t.code] = t.name, m), {})
const SPACE_MAP = DRAWING_SPACES.reduce((m, s) => (m[s.code] = s.name, m), {})

Page({
  data: {
    projectId: '',
    projectName: '',
    loading: false,
    drawings: [],
    filteredDrawings: [],
    drawingStats: {
      total: 0,
      renderCount: 0,
      constructionCount: 0,
      ownerVisibleCount: 0,
      unreadConstructionCount: 0
    },
    filterType: '',
    filterSpace: '',
    canUpload: false,
    canManage: false,
    showUploadPanel: false,
    uploading: false,
    uploadForm: {
      type: 'render',
      typeIndex: 0,
      space: 'living_room',
      spaceIndex: 1,
      title: '',
      remark: '',
      ownerVisible: true,
      tempFilePath: ''
    },
    types: DRAWING_TYPES,
    spaces: DRAWING_SPACES
  },

  onLoad(options) {
    this.setData({
      projectId: options.projectId || '',
      projectName: decodeURIComponent(options.projectName || '')
    })
    getApp().ensureLogin()
      .then((user) => {
        const role = user && user.role
        this.setData({
          canUpload: ['admin', 'boss_qi', 'boss_hu', 'designer'].indexOf(role) !== -1,
          canManage: ['admin', 'boss_qi', 'boss_hu', 'designer'].indexOf(role) !== -1
        })
        this.loadDrawings()
      })
      .catch((error) => {
        showError('登录失败', error)
      })
  },

  onShow() {
    if (this.data.projectId) {
      this.loadDrawings()
    }
  },

  loadDrawings() {
    this.setData({ loading: true })
    call('listDesignDrawings', { projectId: this.data.projectId })
      .then((res) => {
        const drawings = (res.drawings || []).map((d) => ({
          ...d,
          typeText: TYPE_MAP[d.type] || d.type,
          spaceText: SPACE_MAP[d.space] || d.space,
          readByText: (d.readBy || []).map((r) => r.name).join('、'),
          readCount: (d.readBy || []).length
        }))
        this.setData({
          drawings,
          drawingStats: this.makeDrawingStats(drawings)
        })
        this.applyFilter()
      })
      .catch((error) => {
        showError('加载图纸失败', error)
      })
      .finally(() => {
      this.setData({ loading: false })
    })
  },

  makeDrawingStats(drawings) {
    const stats = {
      total: drawings.length,
      renderCount: 0,
      constructionCount: 0,
      ownerVisibleCount: 0,
      unreadConstructionCount: 0
    }
    drawings.forEach((item) => {
      if (item.type === 'render') {
        stats.renderCount += 1
        if (item.ownerVisible) stats.ownerVisibleCount += 1
      }
      if (item.type === 'construction') {
        stats.constructionCount += 1
        if (!item.readCount) stats.unreadConstructionCount += 1
      }
    })
    return stats
  },

  applyFilter() {
    let filtered = this.data.drawings
    if (this.data.filterType) {
      filtered = filtered.filter((d) => d.type === this.data.filterType)
    }
    if (this.data.filterSpace) {
      filtered = filtered.filter((d) => d.space === this.data.filterSpace)
    }
    this.setData({ filteredDrawings: filtered })
  },

  onFilterType(e) {
    this.setData({ filterType: e.currentTarget.dataset.type })
    this.applyFilter()
  },

  onFilterSpace(e) {
    this.setData({ filterSpace: e.currentTarget.dataset.space === this.data.filterSpace ? '' : e.currentTarget.dataset.space })
    this.applyFilter()
  },

  // ===== 上传相关 =====
  openUploadPanel() {
    this.setData({ showUploadPanel: true })
  },

  closeUploadPanel() {
    this.setData({ showUploadPanel: false })
  },

  onTypeChange(e) {
    const index = Number(e.detail.value)
    const type = DRAWING_TYPES[index].code
    this.setData({
      'uploadForm.typeIndex': index,
      'uploadForm.type': type,
      'uploadForm.ownerVisible': type === 'render'
    })
  },

  onSpaceChange(e) {
    const index = Number(e.detail.value)
    this.setData({
      'uploadForm.spaceIndex': index,
      'uploadForm.space': DRAWING_SPACES[index].code
    })
  },

  onFormInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`uploadForm.${key}`]: e.detail.value })
  },

  noop() {},

  onOwnerVisibleChange(e) {
    this.setData({ 'uploadForm.ownerVisible': e.detail.value })
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed']
    }).then((res) => {
      const tempFile = (res.tempFiles || [])[0]
      if (tempFile) {
        this.setData({ 'uploadForm.tempFilePath': tempFile.tempFilePath })
      }
    }).catch(() => {})
  },

  removeTempImage() {
    this.setData({ 'uploadForm.tempFilePath': '' })
  },

  previewTempImage() {
    if (this.data.uploadForm.tempFilePath) {
      wx.previewImage({ urls: [this.data.uploadForm.tempFilePath] })
    }
  },

  submitUpload() {
    const form = this.data.uploadForm
    if (!form.title.trim()) {
      showError('请填写图纸标题')
      return
    }
    if (!form.tempFilePath) {
      showError('请选择图纸图片')
      return
    }

    this.setData({ uploading: true })
    // 先上传图片到云存储
    const cloudPath = `design-drawings/${this.data.projectId}/${form.type}/${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`
    wx.cloud.uploadFile({
      cloudPath,
      filePath: form.tempFilePath
    }).then((uploadRes) => {
      return call('uploadDesignDrawing', {
        projectId: this.data.projectId,
        type: form.type,
        space: form.space,
        title: form.title.trim(),
        fileID: uploadRes.fileID,
        remark: form.remark.trim(),
        ownerVisible: form.ownerVisible
      })
    }).then(() => {
      wx.showToast({ title: '上传成功', icon: 'success' })
      this.setData({
        showUploadPanel: false,
        uploading: false,
        uploadForm: {
          type: 'render',
          typeIndex: 0,
          space: 'living_room',
          spaceIndex: 1,
          title: '',
          remark: '',
          ownerVisible: true,
          tempFilePath: ''
        }
      })
      this.loadDrawings()
    }).catch((error) => {
      showError('上传失败', error)
      this.setData({ uploading: false })
    })
  },

  // ===== 图纸操作 =====
  previewImage(e) {
    const url = e.currentTarget.dataset.url
    if (!url) return
    const allUrls = this.data.filteredDrawings
      .map((d) => d.tempFileURL)
      .filter(Boolean)
    wx.previewImage({ current: url, urls: allUrls })
  },

  markRead(e) {
    const id = e.currentTarget.dataset.id
    call('updateDesignDrawing', { drawingId: id, action: 'markRead' })
      .then(() => {
        wx.showToast({ title: '已标记已读', icon: 'success' })
        this.loadDrawings()
      })
      .catch((error) => showError('标记失败', error))
  },

  toggleOwnerVisible(e) {
    const id = e.currentTarget.dataset.id
    const current = e.currentTarget.dataset.visible
    wx.showModal({
      title: current ? '对业主隐藏' : '对业主显示',
      content: `确认${current ? '隐藏' : '显示'}这张效果图给业主？`,
      success: (res) => {
        if (res.confirm) {
          call('updateDesignDrawing', { drawingId: id, action: 'toggleOwnerVisible' })
            .then(() => {
              wx.showToast({ title: '已更新', icon: 'success' })
              this.loadDrawings()
            })
            .catch((error) => showError('操作失败', error))
        }
      }
    })
  },

  deleteDrawing(e) {
    const id = e.currentTarget.dataset.id
    const title = e.currentTarget.dataset.title
    wx.showModal({
      title: '删除图纸',
      content: `确认删除「${title}」？此操作不可撤销，云存储文件也会一并删除。`,
      confirmColor: '#d33',
      success: (res) => {
        if (res.confirm) {
          call('deleteDesignDrawing', { drawingId: id })
            .then(() => {
              wx.showToast({ title: '已删除', icon: 'success' })
              this.loadDrawings()
            })
            .catch((error) => showError('删除失败', error))
        }
      }
    })
  }
})
