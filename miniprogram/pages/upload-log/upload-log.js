const { STAGES } = require('../../utils/constants')
const { call, uploadImage, showError } = require('../../services/cloud')

Page({
  data: {
    projectId: '',
    projectName: '',
    stages: STAGES,
    stageIndex: 0,
    images: [],
    form: {
      workContent: '',
      issue: '',
      needConfirm: '',
      tomorrowPlan: ''
    },
    submitting: false
  },

  onLoad(options) {
    this.setData({
      projectId: options.projectId || '',
      projectName: decodeURIComponent(options.projectName || '')
    })
  },

  onStageChange(event) {
    this.setData({ stageIndex: Number(event.detail.value) })
  },

  onInput(event) {
    const key = event.currentTarget.dataset.key
    this.setData({
      [`form.${key}`]: event.detail.value
    })
  },

  chooseImages() {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed']
    }).then((res) => {
      const selected = (res.tempFiles || []).map((item) => item.tempFilePath)
      this.setData({ images: this.data.images.concat(selected).slice(0, 9) })
    }).catch((error) => {
      showError('选择照片失败', error)
    })
  },

  removeImage(event) {
    const index = event.currentTarget.dataset.index
    const images = this.data.images.slice()
    images.splice(index, 1)
    this.setData({ images })
  },

  submit() {
    const stage = this.data.stages[this.data.stageIndex]
    const form = this.data.form

    if (!this.data.projectId) {
      showError('缺少工地 ID')
      return
    }
    if (!form.workContent.trim()) {
      showError('请填写今日完成')
      return
    }

    this.setData({ submitting: true })
    Promise.all(this.data.images.map((filePath) => uploadImage(filePath, this.data.projectId, stage.code)))
      .then((photoFileIDs) => call('submitStageLog', {
        projectId: this.data.projectId,
        projectName: this.data.projectName,
        stage: stage.name,
        stageCode: stage.code,
        progress: stage.progress,
        workContent: form.workContent,
        issue: form.issue,
        needConfirm: form.needConfirm,
        tomorrowPlan: form.tomorrowPlan,
        photoFileIDs
      }))
      .then((res) => {
        wx.showToast({
          title: res.noticeSent ? '已提交并提醒' : '已提交待审核',
          icon: 'success'
        })
        setTimeout(() => wx.navigateBack(), 800)
      })
      .catch((error) => {
        showError('提交失败', error)
      })
      .finally(() => {
        this.setData({ submitting: false })
      })
  }
})
