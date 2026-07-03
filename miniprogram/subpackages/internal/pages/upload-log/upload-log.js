const { STAGES } = require('../../../../utils/constants')
const { call, uploadImage, showError } = require('../../../../services/cloud')

Page({
  data: {
    projectId: '',
    projectName: '',
    allStages: STAGES,
    stages: STAGES,
    stageIndex: 0,
    selectedStageCode: STAGES[0].code,
    currentUserId: '',
    currentUserOpenid: '',
    submittedStageStats: [],
    todaySubmittedStageCodes: [],
    stageLoading: false,
    quickNote: '',
    images: [],
    draftLoaded: false,
    draftSavedAtText: '',
    recording: false,
    voiceTempPath: '',
    voiceDuration: 0,
    voiceFileID: '',
    voiceUploaded: false,
    voiceUploading: false,
    aiGenerating: false,
    aiWarning: '',
    voiceTranscript: '',
    manualNoteFocus: false,
    ownerSummary: '',
    reviewFocus: '',
    aiDraft: null,
    sourceType: 'manual',
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
    this.initRecorder()
    this.loadDraft()
    getApp().ensureLogin()
      .then((user) => {
        this.setData({
          currentUserId: (user && user._id) || '',
          currentUserOpenid: (user && user.openid) || ''
        })
        this.loadProjectStages()
      })
      .catch(() => {
        this.loadProjectStages()
      })
  },

  onUnload() {
    if (this.data.recording && this.recorderMode === 'wechat_si' && this.recognitionManager) {
      this.recognitionManager.stop()
      return
    }
    if (this.data.recording && this.recorderManager) {
      this.recorderManager.stop()
    }
  },

  initRecorder() {
    this.recorderMode = 'native'
    this.recognizingText = ''
    this.pendingRecognitionStart = false
    try {
      const plugin = requirePlugin('WechatSI')
      if (plugin && plugin.getRecordRecognitionManager) {
        this.recognitionManager = plugin.getRecordRecognitionManager()
        this.recorderMode = 'wechat_si'
        this.bindRecognitionManager()
      }
    } catch (error) {
      this.recognitionManager = null
    }

    this.initNativeRecorder()
  },

  initNativeRecorder() {
    if (!wx.getRecorderManager) return
    this.recorderManager = wx.getRecorderManager()
    this.recorderManager.onStart(() => {
      this.setData({ recording: true })
    })
    this.recorderManager.onStop((res) => {
      this.setData({
        recording: false,
        voiceTempPath: res.tempFilePath || '',
        voiceDuration: Math.round((res.duration || 0) / 1000),
        voiceFileID: '',
        voiceUploaded: false,
        voiceTranscript: '',
        aiWarning: this.recorderMode === 'native'
          ? '普通录音已保存；如需 AI 整理，请补一句现场情况。'
          : ''
      })
      this.saveDraft({ silent: true })
    })
    this.recorderManager.onError((error) => {
      this.setData({ recording: false })
      showError('录音失败', error)
    })
  },

  bindRecognitionManager() {
    const manager = this.recognitionManager
    if (!manager) return

    manager.onStart = () => {
      this.pendingRecognitionStart = false
      this.recognizingText = ''
      this.setData({
        recording: true,
        aiWarning: '正在识别语音，讲完后点“停止录制”。'
      })
    }

    manager.onRecognize = (res) => {
      const text = String((res && res.result) || '').trim()
      if (!text) return
      this.recognizingText = text
      this.setData({
        voiceTranscript: text,
        quickNote: this.data.quickNote || text,
        aiWarning: ''
      })
      this.saveDraft({ silent: true })
    }

    manager.onStop = (res) => {
      this.pendingRecognitionStart = false
      const text = String((res && res.result) || this.recognizingText || '').trim()
      this.setData({
        recording: false,
        voiceTempPath: (res && res.tempFilePath) || '',
        voiceDuration: Math.round(((res && res.duration) || 0) / 1000),
        voiceFileID: '',
        voiceUploaded: false,
        voiceTranscript: text,
        quickNote: this.data.quickNote || text,
        aiWarning: text ? '' : '没有识别到文字，可重录或手动补一句现场情况。'
      })
      this.saveDraft({ silent: true })
    }

    manager.onError = (error) => {
      console.warn('[upload-log] WechatSI recognition failed', error)
      const canFallbackToNative = (this.data.recording || this.pendingRecognitionStart) && this.recorderManager
      this.pendingRecognitionStart = false
      this.recognizingText = ''
      if (canFallbackToNative) {
        this.recorderMode = 'native'
        this.setData({
          recording: false,
          aiWarning: '语音识别暂不可用，已切换为普通录音；录完后可手动补一句现场情况。'
        }, () => this.startNativeRecording())
        return
      }
      this.setData({
        recording: false,
        aiWarning: '语音识别暂不可用，可手动补一句现场情况。'
      })
      showError('语音识别暂不可用')
    }
  },

  makeDraftKey() {
    return `stage-log-draft:${this.data.projectId || 'new'}`
  },

  formatDraftTime(date) {
    const hour = `${date.getHours()}`.padStart(2, '0')
    const minute = `${date.getMinutes()}`.padStart(2, '0')
    return `${hour}:${minute}`
  },

  loadDraft() {
    const draft = wx.getStorageSync(this.makeDraftKey())
    if (!draft) return
    const draftStage = STAGES[Number(draft.stageIndex || 0)] || STAGES[0]
    this.setData({
      stageIndex: Number(draft.stageIndex || 0),
      selectedStageCode: draft.stageCode || draft.selectedStageCode || draftStage.code,
      quickNote: draft.quickNote || '',
      images: Array.isArray(draft.images) ? draft.images : [],
      voiceTempPath: draft.voiceTempPath || '',
      voiceDuration: Number(draft.voiceDuration || 0),
      voiceFileID: draft.voiceFileID || '',
      voiceUploaded: !!draft.voiceFileID,
      voiceTranscript: draft.voiceTranscript || '',
      ownerSummary: draft.ownerSummary || '',
      reviewFocus: draft.reviewFocus || '',
      aiWarning: draft.aiWarning || '',
      aiDraft: draft.aiDraft || null,
      sourceType: draft.sourceType || 'manual',
      form: Object.assign({}, this.data.form, draft.form || {}),
      draftLoaded: true,
      draftSavedAtText: draft.savedAtText || ''
    })
  },

  loadProjectStages() {
    if (!this.data.projectId) {
      this.refreshSelectableStages()
      return
    }
    this.setData({ stageLoading: true })
    call('getProjectDetail', { projectId: this.data.projectId })
      .then((res) => {
        const summary = this.extractStageSummary(res.logs || [])
        this.setData({
          submittedStageStats: summary.stats,
          todaySubmittedStageCodes: summary.todayCodes
        }, () => this.refreshSelectableStages())
      })
      .catch(() => {
        this.refreshSelectableStages()
      })
      .finally(() => {
        this.setData({ stageLoading: false })
      })
  },

  isSameLocalDay(value, nowValue = Date.now()) {
    const time = this.toTime(value)
    if (!time) return false
    const date = new Date(time)
    const now = new Date(nowValue)
    return date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
  },

  toTime(value) {
    if (!value) return 0
    if (value instanceof Date) return value.getTime()
    if (value.$date && value.$date.$numberLong) return Number(value.$date.$numberLong)
    if (value.$numberLong) return Number(value.$numberLong)
    const time = new Date(value).getTime()
    return Number.isNaN(time) ? 0 : time
  },

  isMineLog(log) {
    const userId = this.data.currentUserId
    const openid = this.data.currentUserOpenid
    return (userId && (log.submittedBy === userId || log.createdBy === userId)) ||
      (openid && (log.submittedByOpenid === openid || log.createdByOpenid === openid))
  },

  extractStageSummary(logs) {
    const countMap = {}
    const todayCodes = new Set()
    ;(logs || []).forEach((log) => {
      if ((log.reviewStatus || 'pending') === 'rejected') return
      const stageCode = String(log.stageCode || '').trim()
      const stageName = String(log.stage || '').trim()
      const matchedStage = stageCode
        ? STAGES.find((item) => item.code === stageCode)
        : STAGES.find((item) => item.name === stageName)
      if (!matchedStage) return
      countMap[matchedStage.code] = (countMap[matchedStage.code] || 0) + 1
      if (this.isMineLog(log) && this.isSameLocalDay(log.createdAt || log.submittedAt || log.updatedAt)) {
        todayCodes.add(matchedStage.code)
      }
    })
    const stats = STAGES
      .filter((stage) => countMap[stage.code] > 0)
      .map((stage) => `${stage.name} ${countMap[stage.code]}条`)
    return {
      stats,
      todayCodes: Array.from(todayCodes)
    }
  },

  refreshSelectableStages() {
    const todaySubmitted = this.data.todaySubmittedStageCodes || []
    const selectable = STAGES.filter((stage) => todaySubmitted.indexOf(stage.code) === -1)
    const selectedCode = this.data.selectedStageCode || (selectable[0] && selectable[0].code) || ''
    let nextIndex = selectable.findIndex((stage) => stage.code === selectedCode)
    if (nextIndex < 0) nextIndex = 0
    this.setData({
      stages: selectable,
      stageIndex: nextIndex,
      selectedStageCode: selectable[nextIndex] ? selectable[nextIndex].code : ''
    })
  },

  getCurrentStage() {
    const stage = this.data.stages[this.data.stageIndex]
    if (!stage) {
      showError('你今天的所有工序节点已提交，请明天再补充')
      return null
    }
    return stage
  },

  makeDraftPayload() {
    return {
      stageIndex: this.data.stageIndex,
      stageCode: this.data.selectedStageCode,
      quickNote: this.data.quickNote,
      images: this.data.images,
      voiceTempPath: this.data.voiceTempPath,
      voiceDuration: this.data.voiceDuration,
      voiceFileID: this.data.voiceFileID,
      voiceTranscript: this.data.voiceTranscript,
      ownerSummary: this.data.ownerSummary,
      reviewFocus: this.data.reviewFocus,
      aiWarning: this.data.aiWarning,
      aiDraft: this.data.aiDraft,
      sourceType: this.data.sourceType,
      form: this.data.form,
      savedAt: Date.now(),
      savedAtText: this.formatDraftTime(new Date())
    }
  },

  onStageChange(event) {
    const stageIndex = Number(event.detail.value)
    const stage = this.data.stages[stageIndex]
    if (!stage) {
      showError('该节点不可选择')
      return
    }
    this.setData({
      stageIndex,
      selectedStageCode: stage.code
    })
    this.saveDraft({ silent: true })
  },

  onInput(event) {
    const key = event.currentTarget.dataset.key
    this.setData({
      [`form.${key}`]: event.detail.value
    })
    this.saveDraft({ silent: true })
  },

  onQuickNoteInput(event) {
    this.setData({
      quickNote: event.detail.value || '',
      manualNoteFocus: false
    })
    this.saveDraft({ silent: true })
  },

  focusManualNote(options = {}) {
    this.setData({ manualNoteFocus: false }, () => {
      this.setData({ manualNoteFocus: true })
    })
    if (!options.silent) {
      wx.showToast({
        title: '请在输入框补一句现场情况',
        icon: 'none'
      })
    }
  },

  saveDraft(options = {}) {
    const draft = this.makeDraftPayload()
    wx.setStorageSync(this.makeDraftKey(), draft)
    this.setData({
      draftLoaded: true,
      draftSavedAtText: draft.savedAtText
    })
    if (!options.silent) {
      wx.showToast({ title: '草稿已保存', icon: 'success' })
    }
  },

  clearDraft(options = {}) {
    wx.removeStorageSync(this.makeDraftKey())
    this.setData({
      draftLoaded: false,
      draftSavedAtText: '',
      quickNote: '',
      images: [],
      voiceTempPath: '',
      voiceDuration: 0,
      voiceFileID: '',
      voiceUploaded: false,
      aiGenerating: false,
      aiWarning: '',
      voiceTranscript: '',
      manualNoteFocus: false,
      ownerSummary: '',
      reviewFocus: '',
      aiDraft: null,
      sourceType: 'manual',
      form: {
        workContent: '',
        issue: '',
        needConfirm: '',
        tomorrowPlan: ''
      }
    })
    if (!options.silent) {
      wx.showToast({ title: '草稿已清空', icon: 'success' })
    }
  },

  generateAiReport(options = {}) {
    const stage = this.getCurrentStage()
    if (!stage) return Promise.reject(new Error('你今天的所有工序节点已提交'))
    const note = String(this.data.quickNote || this.data.voiceTranscript || this.data.form.workContent || '').trim()
    const manualText = String(this.data.quickNote || this.data.form.workContent || '').trim()
    const hasVoice = !!(this.data.voiceTempPath || this.data.voiceFileID)
    if (hasVoice && !this.data.voiceTranscript && !manualText) {
      this.setData({
        aiWarning: '这段语音已保存，但没有拿到识别文字；请先手写补一句现场情况，再点 AI 识别并整理。'
      })
      this.focusManualNote({ silent: true })
      showError('请先补一句现场情况')
      return Promise.reject(new Error('请先补一句现场情况'))
    }
    if (!note && !hasVoice) {
      showError('请先录音或写一句现场情况')
      return Promise.reject(new Error('请先录音或写一句现场情况'))
    }
    if (this.data.aiGenerating) return Promise.resolve(this.data.aiDraft)

    this.setData({ aiGenerating: true, aiWarning: '' })
    const voiceTask = hasVoice && !this.data.voiceTranscript
      ? this.uploadVoice()
      : Promise.resolve(this.data.voiceFileID || '')
    return voiceTask
      .then((voiceFileID) => call('generateStageLogDraft', {
        projectId: this.data.projectId,
        projectName: this.data.projectName,
        stage: stage.name,
        stageCode: stage.code,
        progress: stage.progress,
        quickNote: note,
        photoCount: this.data.images.length,
        voiceFileID,
        voiceDuration: this.data.voiceDuration,
        voiceTranscript: this.data.voiceTranscript,
        tomorrowPlan: this.data.form.tomorrowPlan
      }))
      .then((res) => {
        const draft = res.draft || {}
        const nextForm = Object.assign({}, this.data.form, {
          workContent: draft.workContent || this.data.form.workContent,
          issue: draft.issue || this.data.form.issue,
          needConfirm: draft.needConfirm !== undefined ? draft.needConfirm : this.data.form.needConfirm,
          tomorrowPlan: draft.tomorrowPlan || this.data.form.tomorrowPlan
        })
        const transcript = draft.rawTranscript || this.data.voiceTranscript || ''
        this.setData({
          sourceType: draft.sourceType || (this.data.voiceTranscript ? 'ai_wechat_si' : 'ai_local'),
          quickNote: this.data.quickNote || transcript,
          form: nextForm,
          voiceTranscript: transcript,
          ownerSummary: draft.ownerSummary || '',
          reviewFocus: draft.reviewFocus || '',
          aiWarning: res.warning || draft.warning || '',
          aiDraft: draft
        })
        this.saveDraft({ silent: true })
        if (!options.silent) {
          wx.showToast({ title: '已回填，可修改', icon: 'success' })
        }
        return draft
      })
      .catch((error) => {
        if (!options.silent) {
          const message = error && error.message ? error.message : 'AI 整理失败'
          if (/语音|识别|现场情况|补一句/.test(message)) {
            this.focusManualNote({ silent: true })
          }
          showError(message)
        }
        throw error
      })
      .finally(() => {
        this.setData({ aiGenerating: false })
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
      this.saveDraft({ silent: true })
    }).catch((error) => {
      showError('选择照片失败', error)
    })
  },

  removeImage(event) {
    const index = event.currentTarget.dataset.index
    const images = this.data.images.slice()
    images.splice(index, 1)
    this.setData({ images })
    this.saveDraft({ silent: true })
  },

  toggleRecording() {
    if (!this.recorderManager && !this.recognitionManager) {
      showError('当前微信版本不支持录音')
      return
    }
    if (this.data.recording) {
      if (this.recognitionManager) {
        this.recognitionManager.stop()
      } else {
        this.recorderManager.stop()
      }
      return
    }
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        if (this.recognitionManager && this.recorderMode !== 'native') {
          this.recorderMode = 'wechat_si'
          this.pendingRecognitionStart = true
          try {
            this.recognitionManager.start({
              duration: 60000,
              lang: 'zh_CN'
            })
          } catch (error) {
            console.warn('[upload-log] WechatSI recognition start failed', error)
            this.pendingRecognitionStart = false
            this.recorderMode = 'native'
            this.setData({
              aiWarning: '语音识别启动失败，已切换为普通录音；录完后可手动补一句现场情况。'
            }, () => this.startNativeRecording())
          }
          return
        }
        this.recorderMode = 'native'
        this.startNativeRecording()
      },
      fail: () => {
        showError('请先授权麦克风权限')
      }
    })
  },

  startNativeRecording() {
    if (!this.recorderManager) {
      showError('当前微信版本不支持普通录音')
      return
    }
    this.recorderManager.start({
      duration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3'
    })
  },

  startRecording() {
    if (this.data.recording) return
    this.toggleRecording()
  },

  stopRecording() {
    if (!this.data.recording) return
    this.toggleRecording()
  },

  removeVoice() {
    this.setData({
      voiceTempPath: '',
      voiceDuration: 0,
      voiceFileID: '',
      voiceUploaded: false,
      voiceTranscript: '',
      aiWarning: ''
    })
    this.saveDraft({ silent: true })
  },

  uploadVoice() {
    if (this.data.voiceFileID) return Promise.resolve(this.data.voiceFileID)
    if (!this.data.voiceTempPath) return Promise.resolve('')
    this.setData({ voiceUploading: true })
    const cloudPath = [
      'stage-voices',
      this.data.projectId || 'unknown',
      `${Date.now()}-${Math.random().toString(16).slice(2)}.mp3`
    ].join('/')
    return wx.cloud.uploadFile({
      cloudPath,
      filePath: this.data.voiceTempPath
    }).then((res) => {
      this.setData({
        voiceFileID: res.fileID,
        voiceUploaded: true
      })
      this.saveDraft({ silent: true })
      return res.fileID
    }).finally(() => {
      this.setData({ voiceUploading: false })
    })
  },

  submit() {
    const stage = this.getCurrentStage()
    if (!stage) return

    if (!this.data.projectId) {
      showError('缺少工地 ID')
      return
    }
    if ((this.data.todaySubmittedStageCodes || []).indexOf(stage.code) !== -1) {
      showError('该工序节点今天已提交，请勿重复操作')
      this.loadProjectStages()
      return
    }

    this.setData({ submitting: true })
    const note = String(this.data.quickNote || this.data.voiceTranscript || '').trim()
    const needsAiFill = !String(this.data.form.workContent || '').trim() &&
      (note || this.data.voiceTempPath || this.data.voiceFileID)
    const prepareTask = needsAiFill
      ? this.generateAiReport({ silent: true })
      : Promise.resolve()

    prepareTask
      .then(() => {
        const form = this.data.form
        if (!String(form.workContent || '').trim()) {
          throw new Error('请先录音并整理，或填写今日完成')
        }
        return Promise.all([
          Promise.all(this.data.images.map((filePath) => uploadImage(filePath, this.data.projectId, stage.code))),
          this.uploadVoice()
        ])
      })
      .then(([photoFileIDs, voiceFileID]) => call('submitStageLog', {
        projectId: this.data.projectId,
        projectName: this.data.projectName,
        stage: stage.name,
        stageCode: stage.code,
        progress: stage.progress,
        workContent: this.data.form.workContent,
        issue: this.data.form.issue,
        needConfirm: this.data.form.needConfirm,
        tomorrowPlan: this.data.form.tomorrowPlan,
        photoFileIDs,
        voiceFileID,
        voiceDuration: this.data.voiceDuration,
        voiceTranscript: this.data.voiceTranscript,
        ownerSummary: this.data.ownerSummary,
        reviewFocus: this.data.reviewFocus,
        aiDraft: this.data.aiDraft,
        sourceType: this.data.sourceType
      }))
      .then((res) => {
        this.clearDraft({ silent: true })
        wx.showModal({
          title: res.noticeSent ? '已提交并提醒审核' : '已提交待审核',
          content: '管理员审核通过后，业主才能看到这条日报和现场照片。',
          showCancel: false,
          confirmText: '知道了',
          success: () => wx.navigateBack()
        })
      })
      .catch((error) => {
        showError(error && error.message ? error.message : '提交失败')
      })
      .finally(() => {
        this.setData({ submitting: false })
      })
  }
})
