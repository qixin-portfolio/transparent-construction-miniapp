const { call, showError } = require('../../../../services/cloud')

function text(value) {
  return String(value || '').trim()
}

function formatDate(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return typeof value === 'string' ? text(value).slice(0, 10) : ''
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function inferCommunity(project) {
  const explicit = text(project.community || project.communityName || project.address)
  if (explicit) return explicit
  return text(project.name).replace(/透明工地/g, '').replace(/工地/g, '').trim()
}

Page({
  data: {
    loading: false,
    projectId: '',
    project: null,
    isDelivered: false,
    // 房屋档案补全
    community: '',
    building: '',
    room: '',
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
        const isDelivered = project.statusCode === 'delivered' || project.status === '已交付'
        this.setData({
          project,
          isDelivered,
          community: inferCommunity(project),
          building: text(project.building || project.buildingNo || project.unit),
          room: text(project.room || project.houseNo || project.roomNo),
          layout: project.layout || '',
          area: project.area ? String(project.area) : '',
          style: project.style || '',
          decorateType: project.decorateType || '',
          startDate: formatDate(project.startDate),
          completedAt: formatDate(project.completedAt),
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
    const { projectId, community, building, room, layout, area, style, decorateType, startDate, completedAt, completionPhotos, isDelivered } = this.data
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
        community: community || '',
        building: building || '',
        room: room || '',
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

      wx.showToast({ title: isDelivered ? '交付资料已保存' : '交付成功，已生成电子质保卡', icon: 'none', duration: 2200 })
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
