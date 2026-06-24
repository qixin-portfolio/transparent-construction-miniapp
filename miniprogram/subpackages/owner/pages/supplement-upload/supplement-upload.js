const { call, showError } = require('../../../../services/cloud')

const CATEGORY_MAP = {
  hydro: { title: '水电隐蔽工程', desc: '水管电线走向、隐蔽工程照片，方便后期维修' },
  material: { title: '材料清单/票据', desc: '主材、辅材收据和清单照片' },
  completion: { title: '完工实景', desc: '入住后拍摄的家装实景照片' }
}

Page({
  data: {
    loading: false,
    submitting: false,
    projectId: '',
    category: '',
    categoryInfo: null,
    supplements: [],     // 业主已上传的记录列表
    newPhotos: [],       // 本次选择的临时照片
    remark: ''
  },

  onLoad(options) {
    const category = String(options.category || '').trim()
    const projectId = String(options.projectId || '').trim()
    const categoryInfo = CATEGORY_MAP[category]
    if (!categoryInfo) {
      wx.showToast({ title: '资料类型无效', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this.setData({ category, projectId, categoryInfo })
    wx.setNavigationBarTitle({ title: `补充${categoryInfo.title}` })
  },

  onShow() {
    this.loadSupplements()
  },

  loadSupplements() {
    const { projectId, category } = this.data
    if (!projectId || !category) return
    this.setData({ loading: true })
    getApp().ensureLogin()
      .then(() => call('submitOwnerSupplement', { action: 'list', projectId, category }))
      .then((res) => {
        console.log('[supplement] 列表加载', (res.supplements || []).length, '条')
        this.setData({ supplements: res.supplements || [] })
      })
      .catch((error) => {
        console.error('[supplement] 列表加载失败', error)
        showError('加载失败', error)
      })
      .finally(() => this.setData({ loading: false }))
  },

  choosePhoto() {
    const remain = 9 - this.data.newPhotos.length
    if (remain <= 0) {
      wx.showToast({ title: '单次最多上传 9 张', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFiles = res.tempFiles || []
        this.setData({ newPhotos: [...this.data.newPhotos, ...tempFiles.map((f) => f.tempFilePath)] })
      }
    })
  },

  removeNewPhoto(e) {
    const { index } = e.currentTarget.dataset
    const photos = [...this.data.newPhotos]
    photos.splice(index, 1)
    this.setData({ newPhotos: photos })
  },

  previewNewPhoto(e) {
    const { current } = e.currentTarget.dataset
    wx.previewImage({ current, urls: this.data.newPhotos })
  },

  previewExisting(e) {
    const { current, urls } = e.currentTarget.dataset
    if (!urls || !urls.length) return
    wx.previewImage({ current: current || urls[0], urls })
  },

  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  async submit() {
    const { projectId, category, newPhotos, remark } = this.data
    if (!newPhotos.length) {
      wx.showToast({ title: '请先选择照片', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '上传中...', mask: true })

    try {
      // 1. 上传照片到云存储
      const fileIDs = []
      for (const tempPath of newPhotos) {
        const cloudPath = `owner-supplements/${projectId}/${category}/${Date.now()}-${Math.random().toString(16).slice(2)}.jpg`
        const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: tempPath })
        fileIDs.push(uploadRes.fileID)
      }
      console.log('[supplement] 文件上传完成', fileIDs.length, '张')

      // 2. 调用云函数保存记录
      const res = await call('submitOwnerSupplement', {
        action: 'submit',
        projectId,
        category,
        fileIDs,
        remark
      })
      console.log('[supplement] 云函数返回', res)

      // 3. 刷新列表（云函数已返回 supplements，但保险起见再查一次）
      const fresh = await call('submitOwnerSupplement', { action: 'list', projectId, category })
      const supplements = fresh.supplements || []
      console.log('[supplement] 重新查询列表', supplements.length, '条')

      this.setData({
        supplements,
        newPhotos: [],
        remark: ''
      })

      wx.showToast({ title: '已保存', icon: 'success', duration: 1500 })
    } catch (error) {
      console.error('[supplement] 上传失败', error)
      wx.showModal({
        title: '保存失败',
        content: error && error.message ? error.message : '请稍后再试',
        showCancel: false,
        confirmText: '知道了'
      })
    } finally {
      this.setData({ submitting: false })
      wx.hideLoading()
    }
  },

  async deleteSupplement(e) {
    const { id } = e.currentTarget.dataset
    const { projectId, category } = this.data
    wx.showModal({
      title: '删除确认',
      content: '确定删除这条资料吗？删除后不可恢复。',
      confirmColor: '#dc2626',
      success: async (res) => {
        if (!res.confirm) return
        try {
          const result = await call('submitOwnerSupplement', {
            action: 'delete',
            projectId,
            category,
            supplementId: id
          })
          this.setData({ supplements: result.supplements || [] })
          wx.showToast({ title: '已删除', icon: 'none' })
        } catch (error) {
          showError('删除失败', error)
        }
      }
    })
  }
})
