const { call, showError } = require('../../../../services/cloud')

Page({
  data: {
    loading: false,
    projectId: '',
    project: null,
    // 房屋档案补全
    layout: '',
    area: '',
    style: '',
    decorateType: '',
    startDate: '',
    completedAt: '',
    // 完工照片
    completionPhotos: [],
    // 样式选项
    styleOptions: ['现代简约', '北欧', '日式', '新中式', '美式', '轻奢', '工业风', '混搭'],
    styleIndex: -1,
    typeOptions: ['整装', '半包', '全案', '局改'],
    typeIndex: -1
  },

  onLoad(options) {
    this.setData({ projectId: String(options.projectId || '').trim() })
    this.loadProject()
  },

  loadProject() {
    if (!this.data.projectId) return
    call('getProjectDetail', { projectId: this.data.projectId })
      .then((res) => {
        const project = res.project || {}
        this.setData({
          project,
          layout: project.layout || '',
          area: project.area ? String(project.area) : '',
          style: project.style || '',
          decorateType: project.decorateType || '',
          startDate: project.startDate || '',
          completedAt: project.completedAt || '',
          styleIndex: project.style ? this.data.styleOptions.indexOf(project.style) : -1,
          typeIndex: project.decorateType ? this.data.typeOptions.indexOf(project.decorateType) : -1
        })
      })
      .catch((error) => showError('项目信息加载失败', error))
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset
    this.setData({ [field]: e.detail.value })
  },

  onStyleChange(e) {
    const index = Number(e.detail.value)
    this.setData({ styleIndex: index, style: this.data.styleOptions[index] })
  },

  onTypeChange(e) {
    const index = Number(e.detail.value)
    this.setData({ typeIndex: index, decorateType: this.data.typeOptions[index] })
  },

  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value })
  },

  onCompletedAtChange(e) {
    this.setData({ completedAt: e.detail.value })
  },

  chooseCompletionPhoto() {
    const remain = 9 - this.data.completionPhotos.length
    if (remain <= 0) {
      wx.showToast({ title: '最多上传9张完工照片', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFiles = res.tempFiles || []
        this.setData({ completionPhotos: [...this.data.completionPhotos, ...tempFiles.map((f) => f.tempFilePath)] })
      }
    })
  },

  removePhoto(e) {
    const { index } = e.currentTarget.dataset
    const photos = [...this.data.completionPhotos]
    photos.splice(index, 1)
    this.setData({ completionPhotos: photos })
  },

  previewPhoto(e) {
    const { current } = e.currentTarget.dataset
    wx.previewImage({ current, urls: this.data.completionPhotos })
  },

  async submitDeliver() {
    const { projectId, layout, area, style, decorateType, startDate, completedAt, completionPhotos } = this.data
    if (!projectId) {
      showError('缺少工地信息')
      return
    }

    wx.showLoading({ title: '交付中...' })

    try {
      // 上传完工照片到云存储
      const completionPhotoFileIDs = []
      for (const tempPath of completionPhotos) {
        if (tempPath.startsWith('cloud://')) {
          completionPhotoFileIDs.push(tempPath)
          continue
        }
        const cloudPath = `completion-photos/${projectId}/${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`
        const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: tempPath })
        completionPhotoFileIDs.push(uploadRes.fileID)
      }

      const houseInfo = {
        layout: layout || '',
        area: area ? Number(area) : '',
        style: style || '',
        decorateType: decorateType || '',
        startDate: startDate || '',
        completedAt: completedAt || ''
      }

      await call('deliverProject', {
        projectId,
        houseInfo,
        completionPhotoFileIDs
      })

      wx.showToast({ title: '交付成功，已生成电子质保卡', icon: 'none', duration: 2200 })
      setTimeout(() => {
        wx.navigateBack({ fail: () => {
          wx.redirectTo({ url: `/subpackages/internal/pages/project-detail/project-detail?projectId=${projectId}` })
        } })
      }, 1500)
    } catch (error) {
      showError('交付失败', error)
    } finally {
      wx.hideLoading()
    }
  }
})
