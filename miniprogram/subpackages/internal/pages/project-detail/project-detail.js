const { call, showError } = require('../../../../services/cloud')
const { DEMO_MODE, demoProjects, demoLogs } = require('../../../../utils/demo')
const { STAGES } = require('../../../../utils/constants')

Page({
  data: {
    projectId: '',
    project: null,
    logs: [],
    loading: false,
    bindCode: null,
    bindCodes: [],
    bindCodeText: '',
    bindCodeSummary: '',
    bindCodeExpiresAtText: '',
    bindOwnerCount: 0,
    bindMaxOwners: 2,
    bindCodeLoading: false,
    ownerList: [],
    workerBindCodeText: '',
    workerBindCodeExpiresAtText: '',
    workerBindCodeSummary: '',
    workerBindCodeLoading: false,
    user: null,
    canUpload: false,
    canManageOwner: false,
    canManageWorkerBind: false,
    canViewManagementDetail: false,
    canDeliverProject: false,
    canDelete: false,
    stats: {
      logCount: 0,
      photoCount: 0,
      latestDateText: '',
      latestStage: ''
    },
    diagnostics: {
      pendingCount: 0,
      issueCount: 0,
      confirmCount: 0,
      rejectedCount: 0
    },
    animatedProgress: 0,
    animatedProgressDeg: 0,
    flowStatus: {
      created: '未建档',
      uploaded: '待上传',
      reviewed: '待审核',
      ownerBound: '待绑定',
      pendingCount: 0,
      approvedCount: 0,
      uploadClass: '',
      reviewClass: '',
      ownerClass: ''
    },
    photoWall: [],
    filteredPhotoWall: [],
    photoStages: [],
    filterStage: '',
    timelineExpanded: false,
    timelineCollapsedCount: 3,
    visibleLogs: []
  },

  onLoad(options) {
    const projectId = options.id || ''
    this.setData({ projectId })
    getApp().ensureLogin()
      .then((user) => {
        this.setAccess(user)
        this.loadDetail()
      })
      .catch((error) => {
        showError('登录失败', error)
      })
  },

  onShow() {
    if (this.data.projectId && this.data.project && !this.data.loading) {
      this.loadDetail()
    }
  },

  setAccess(user) {
    const role = user && user.role
    this.setData({
      user: user || null,
      canUpload: ['admin', 'boss_qi', 'boss_hu', 'designer', 'worker', 'project_manager'].indexOf(role) !== -1,
      canManageOwner: ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales'].indexOf(role) !== -1,
      canManageWorkerBind: ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales', 'project_manager'].indexOf(role) !== -1,
      canViewManagementDetail: ['admin', 'boss_qi', 'boss_hu'].indexOf(role) !== -1,
      canDeliverProject: ['admin', 'boss_qi', 'boss_hu'].indexOf(role) !== -1,
      canDelete: role === 'admin'
    })
  },

  loadDetail() {
    if (!this.data.projectId) {
      showError('缺少工地 ID')
      return
    }

    this.setData({ loading: true })
    call('getProjectDetail', { projectId: this.data.projectId })
      .then((res) => {
        const logs = this.prepareLogs(res.logs || [])
        const photoWall = this.makePhotoWall(logs)
        const stages = this.buildStageList(photoWall)
        const project = res.project || null
        this.setData({
          project,
          animatedProgress: 0,
          animatedProgressDeg: 0,
          logs,
          visibleLogs: logs.slice(0, this.data.timelineCollapsedCount),
          stats: this.makeStats(logs),
          diagnostics: this.makeDiagnostics(logs),
          flowStatus: this.makeFlowStatus(project, logs),
          photoWall,
          filteredPhotoWall: photoWall,
          photoStages: stages,
          filterStage: '',
          timelineExpanded: false,
          bindCode: null,
          bindCodes: [],
          bindCodeText: '',
          bindCodeSummary: '',
          bindCodeExpiresAtText: '',
          workerBindCodeText: '',
          workerBindCodeExpiresAtText: '',
          workerBindCodeSummary: ''
        }, () => {
          this.playProgressMotion((project || {}).progress)
          this.buildOwnerList()
        })
      })
      .catch((error) => {
        if (DEMO_MODE) {
          const logs = this.prepareLogs(demoLogs)
          const photoWall = this.makePhotoWall(logs)
          const project = demoProjects[0]
          this.setData({
            project,
            animatedProgress: 0,
            animatedProgressDeg: 0,
            logs,
            visibleLogs: logs.slice(0, this.data.timelineCollapsedCount),
            stats: this.makeStats(logs),
            diagnostics: this.makeDiagnostics(logs),
            flowStatus: this.makeFlowStatus(project, logs),
            photoWall,
            filteredPhotoWall: photoWall,
            photoStages: this.buildStageList(photoWall),
            filterStage: '',
            timelineExpanded: false
          }, () => {
            this.playProgressMotion((project || {}).progress)
          })
          return
        }
        this.setData({
          project: null,
          logs: [],
          visibleLogs: [],
          stats: this.makeStats([]),
          diagnostics: this.makeDiagnostics([]),
          animatedProgress: 0,
          animatedProgressDeg: 0,
          flowStatus: this.makeFlowStatus(null, []),
          photoWall: [],
          filteredPhotoWall: [],
          photoStages: []
        })
        showError('工地详情加载失败', error)
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  goUpload() {
    if (!this.data.canUpload) {
      showError('当前账号不能上传日报')
      return
    }
    wx.navigateTo({
      url: `/subpackages/internal/pages/upload-log/upload-log?projectId=${this.data.projectId}&projectName=${encodeURIComponent((this.data.project || {}).name || '')}`
    })
  },

  resubmitRejectedLog(event) {
    const logId = event.currentTarget.dataset.id || ''
    const log = (this.data.logs || []).find((item) => item._id === logId)
    if (!log) {
      showError('未找到退回日报')
      return
    }
    const stageIndex = Math.max(0, STAGES.findIndex((stage) => stage.name === log.stage || stage.code === log.stageCode))
    const now = new Date()
    const savedAtText = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    wx.setStorageSync(`stage-log-draft:${this.data.projectId}`, {
      stageIndex,
      quickNote: log.rejectReason ? `退回原因：${log.rejectReason}` : '',
      images: [],
      voiceTempPath: '',
      voiceDuration: 0,
      sourceType: 'resubmit',
      form: {
        workContent: log.workContent || '',
        issue: log.issue || '',
        needConfirm: log.needConfirm || '',
        tomorrowPlan: log.tomorrowPlan || ''
      },
      savedAt: Date.now(),
      savedAtText
    })
    wx.navigateTo({
      url: `/subpackages/internal/pages/upload-log/upload-log?projectId=${this.data.projectId}&projectName=${encodeURIComponent((this.data.project || {}).name || '')}`
    })
  },

  goDesignDrawings() {
    const name = encodeURIComponent((this.data.project || {}).name || '')
    wx.navigateTo({
      url: `/subpackages/internal/pages/design-drawings/design-drawings?projectId=${this.data.projectId}&projectName=${name}`
    })
  },

  isProjectDelivered(project) {
    if (!project) return false
    return project.statusCode === 'delivered' || project.status === '已交付'
  },

  confirmDeliverProject() {
    if (!this.data.canDeliverProject) {
      showError('当前账号没有确认竣工交付的权限')
      return
    }
    const project = this.data.project || {}
    if (!project._id) {
      showError('缺少工地信息')
      return
    }
    if (this.isProjectDelivered(project)) {
      wx.showToast({ title: '该项目已交付', icon: 'none' })
      return
    }
    // 跳转到交付表单页（补全房屋档案 + 上传完工照片）
    wx.navigateTo({ url: `/subpackages/internal/pages/deliver-form/deliver-form?projectId=${project._id}` })
  },

  deleteProject() {
    if (!this.data.canDelete) {
      showError('仅管理员可删除工地')
      return
    }
    const project = this.data.project || {}
    const name = project.name || '该工地'
    wx.showModal({
      title: '删除工地',
      content: `确认删除「${name}」？该工地的日报、照片、绑定码、成员和图纸也会一并清理。`,
      confirmText: '删除',
      confirmColor: '#D9534F',
      success: (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '删除中...' })
        call('deleteProject', { projectId: this.data.projectId })
          .then(() => {
            wx.showToast({ title: '已删除', icon: 'success' })
            setTimeout(() => {
              wx.navigateBack()
            }, 700)
          })
          .catch((error) => {
            showError('删除失败', error)
          })
          .finally(() => {
            wx.hideLoading()
          })
      }
    })
  },

  formatTime(timestamp) {
    if (!timestamp) return ''
    let raw = timestamp
    if (timestamp.$date && timestamp.$date.$numberLong) raw = Number(timestamp.$date.$numberLong)
    if (timestamp.$numberLong) raw = Number(timestamp.$numberLong)
    if (timestamp instanceof Date) raw = timestamp.getTime()
    if (typeof raw === 'object' && raw.toString) raw = raw.toString()
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) return ''
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    const hour = `${date.getHours()}`.padStart(2, '0')
    const minute = `${date.getMinutes()}`.padStart(2, '0')
    return `${month}月${day}日 ${hour}:${minute}`
  },

  prepareLogs(logs) {
    return logs.map((item) => {
      const status = item.reviewStatus || 'pending'
      return Object.assign({}, item, {
        photos: item.photos || [],
        dateText: this.formatTime(item.createdAt || item.updatedAt || item.reviewedAt),
        statusText: this.getStatusText(status),
        statusClass: this.getStatusClass(status)
      })
    })
  },

  getStatusText(status) {
    if (status === 'approved') return '已通过'
    if (status === 'rejected') return '已退回'
    return '待审核'
  },

  getStatusClass(status) {
    if (status === 'approved') return 'approved'
    if (status === 'rejected') return 'rejected'
    return 'pending'
  },

  makeStats(logs) {
    const latest = logs[0] || {}
    const photoCount = logs.reduce((total, item) => total + ((item.photos || []).length), 0)
    return {
      logCount: logs.length,
      photoCount,
      latestDateText: latest.dateText || '',
      latestStage: latest.stage || ''
    }
  },

  makeDiagnostics(logs) {
    return {
      pendingCount: logs.filter((item) => (item.reviewStatus || 'pending') === 'pending').length,
      issueCount: logs.filter((item) => String(item.issue || '').trim()).length,
      confirmCount: logs.filter((item) => String(item.needConfirm || '').trim()).length,
      rejectedCount: logs.filter((item) => item.reviewStatus === 'rejected').length
    }
  },

  makeProgressDeg(progress) {
    const value = Math.max(0, Math.min(100, Number(progress) || 0))
    return value >= 100 ? 360 : Math.round(value * 3.6)
  },

  playProgressMotion(progress) {
    const value = Math.max(0, Math.min(100, Number(progress) || 0))
    setTimeout(() => {
      this.setData({
        animatedProgress: value,
        animatedProgressDeg: this.makeProgressDeg(value)
      })
    }, 80)
  },

  makeFlowStatus(project, logs) {
    const pendingCount = logs.filter((item) => (item.reviewStatus || 'pending') === 'pending').length
    const approvedCount = logs.filter((item) => item.reviewStatus === 'approved').length
    const rejectedCount = logs.filter((item) => item.reviewStatus === 'rejected').length
    const ownerCount = this.getOwnerOpenids(project).length
    let reviewed = '待上传'
    if (pendingCount) {
      reviewed = `${pendingCount} 条待审`
    } else if (approvedCount) {
      reviewed = '已发布'
    } else if (rejectedCount) {
      reviewed = '有退回'
    }

    return {
      created: project ? '已建档' : '未建档',
      uploaded: logs.length ? `${logs.length} 条日报` : '待上传',
      reviewed,
      ownerBound: ownerCount ? `${ownerCount}/2 已绑定` : '待绑定',
      pendingCount,
      approvedCount,
      uploadClass: logs.length ? 'done' : '',
      reviewClass: pendingCount ? 'warning' : (approvedCount ? 'done' : ''),
      ownerClass: ownerCount ? 'done' : ''
    }
  },

  getOwnerOpenids(project) {
    if (!project) return []
    const openids = Array.isArray(project.ownerOpenids)
      ? project.ownerOpenids.filter(Boolean)
      : []
    if (!openids.length && project.ownerOpenid) {
      openids.push(project.ownerOpenid)
    }
    return Array.from(new Set(openids))
  },

  makePhotoWall(logs) {
    return logs.reduce((items, log) => {
      ;(log.photos || []).forEach((photo) => {
        items.push({
          url: photo,
          stage: log.stage || '施工进度',
          dateText: log.dateText || '',
          statusText: log.statusText || ''
        })
      })
      return items
    }, [])
  },

  buildStageList(photoWall) {
    const seen = new Set()
    const stages = []
    photoWall.forEach((item) => {
      const stage = item.stage || '施工进度'
      if (!seen.has(stage)) {
        seen.add(stage)
        stages.push(stage)
      }
    })
    return stages
  },

  filterByStage(event) {
    const stage = event.currentTarget.dataset.stage || ''
    this.setData({
      filterStage: stage,
      filteredPhotoWall: stage
        ? this.data.photoWall.filter((item) => item.stage === stage)
        : this.data.photoWall
    })
  },

  previewPhoto(event) {
    const current = event.currentTarget.dataset.url || ''
    const urls = this.data.photoWall.map((item) => item.url).filter(Boolean)
    if (!current || !urls.length) return
    wx.previewImage({ current, urls })
  },

  onPhotoImageError(event) {
    console.warn('[project-detail] photo image load failed', {
      url: event.currentTarget.dataset.url || '',
      detail: event.detail || {}
    })
  },

  previewTimelinePhoto(event) {
    const photos = event.currentTarget.dataset.photos || []
    const index = event.currentTarget.dataset.index || 0
    if (!photos.length) return
    wx.previewImage({
      urls: photos,
      current: photos[index] || photos[0]
    })
  },

  toggleTimeline() {
    const expanded = !this.data.timelineExpanded
    this.setData({
      timelineExpanded: expanded,
      visibleLogs: expanded ? this.data.logs : this.data.logs.slice(0, this.data.timelineCollapsedCount)
    })
  },

  goTimelineDiagnostic() {
    if (!this.data.logs.length) {
      wx.showToast({ title: '暂无施工日志', icon: 'none' })
      return
    }
    this.setData({
      timelineExpanded: true,
      visibleLogs: this.data.logs
    })
    wx.pageScrollTo({
      selector: '#manager-timeline-section',
      duration: 260
    })
  },

  prepareBindCodes(res) {
    const projectOwners = this.getOwnerOpenids(this.data.project)
    const ownerCount = Number(res.ownerCount != null ? res.ownerCount : projectOwners.length) || 0
    const maxOwners = Number(res.maxOwners || 2)
    const rawCodes = Array.isArray(res.codes) && res.codes.length
      ? res.codes
      : (res.code ? [{ code: res.code, expiresAt: res.expiresAt, usedByOpenid: res.usedByOpenid || '' }] : [])

    const codes = rawCodes
      .filter((item) => item && item.code)
      .map((item, index) => {
        const slot = ownerCount + index + 1
        return {
          code: item.code,
          label: `业主${slot}`,
          slotText: `第 ${slot} 位业主`,
          expiresAt: item.expiresAt || 0,
          expiresAtText: item.expiresAt ? this.formatTime(item.expiresAt) : '',
          statusText: item.usedByOpenid ? '已使用' : '未使用'
        }
      })

    return {
      codes,
      ownerCount,
      maxOwners,
      summary: `已绑定 ${ownerCount}/${maxOwners} 位业主，当前可用 ${codes.length} 个绑定码`
    }
  },

  createBindCode() {
    if (!this.data.canManageOwner) {
      showError('当前账号不能生成绑定码')
      return
    }
    if (!this.data.projectId) {
      showError('缺少工地 ID')
      return
    }

    this.setData({ bindCodeLoading: true })
    call('createOwnerBindCode', { projectId: this.data.projectId })
      .then((res) => {
        const prepared = this.prepareBindCodes(res)
        const firstCode = prepared.codes[0] || {}
        this.setData({
          bindCode: res,
          bindCodes: prepared.codes,
          bindCodeText: firstCode.code || '',
          bindCodeSummary: prepared.summary,
          bindCodeExpiresAtText: firstCode.expiresAtText || '',
          bindOwnerCount: prepared.ownerCount,
          bindMaxOwners: prepared.maxOwners
        })
        wx.showToast({
          title: prepared.codes.length > 1 ? '绑定码已生成' : '绑定码已更新',
          icon: 'success'
        })
      })
      .catch((error) => {
        showError('生成失败', error)
      })
      .finally(() => {
        this.setData({ bindCodeLoading: false })
      })
  },

  copyBindCode() {
    if (!this.data.canManageOwner) {
      showError('当前账号不能复制绑定码')
      return
    }
    if (!this.data.bindCodes.length && !this.data.bindCodeText) {
      showError('请先生成绑定码')
      return
    }
    const projectName = (this.data.project || {}).name || '工地'
    const codeLines = this.data.bindCodes.length
      ? this.data.bindCodes.map((item) => `${item.label}绑定码：${item.code}`).join('\n')
      : `绑定码：${this.data.bindCodeText}`
    const text = `【晟景装饰】${projectName} 施工进度查看邀请\n${codeLines}\n请分别使用各自微信，在小程序「晟景透明工地」的「业主进度」页面输入绑定码。`
    wx.setClipboardData({
      data: text
    })
  },

  copySingleBindCode(event) {
    const code = event.currentTarget.dataset.code || ''
    if (!code) return
    wx.setClipboardData({
      data: code
    })
  },

  createWorkerBindCode() {
    if (!this.data.canManageWorkerBind) {
      showError('当前账号不能生成工长绑定码')
      return
    }
    if (!this.data.projectId) {
      showError('缺少工地 ID')
      return
    }

    this.setData({ workerBindCodeLoading: true })
    call('createWorkerProjectBindCode', { projectId: this.data.projectId })
      .then((res) => {
        this.setData({
          workerBindCodeText: res.code || '',
          workerBindCodeExpiresAtText: res.expiresAt ? this.formatTime(res.expiresAt) : '',
          workerBindCodeSummary: '工长使用该码后会加入本工地；每进入一个新工地，都需要单独发码绑定'
        })
        wx.showToast({ title: '工长码已生成', icon: 'success' })
      })
      .catch((error) => {
        showError('生成失败', error)
      })
      .finally(() => {
        this.setData({ workerBindCodeLoading: false })
      })
  },

  copyWorkerBindCode() {
    if (!this.data.workerBindCodeText) {
      showError('请先生成工长绑定码')
      return
    }
    const projectName = (this.data.project || {}).name || '工地'
    const text = `【晟景装饰】${projectName} 工长工地绑定邀请\n工长绑定码：${this.data.workerBindCodeText}\n请先用员工邀请码激活为工长或项目经理，再在小程序「工地」页输入该码绑定本工地。`
    wx.setClipboardData({ data: text })
  },

  buildOwnerList() {
    const project = this.data.project || {}
    const openids = Array.isArray(project.ownerOpenids) ? project.ownerOpenids : []
    const names   = Array.isArray(project.ownerNames)   ? project.ownerNames   : []
    const list = openids.map((oid, i) => ({
      openid:  oid,
      name:    names[i] || ('业主' + (i + 1)),
      index:   i
    }))
    this.setData({ ownerList: list })
  },

  unbindOwner(event) {
    const ownerOpenid = event.currentTarget.dataset.openid || ''
    const ownerName   = event.currentTarget.dataset.name   || '该业主'
    if (!ownerOpenid) return
    wx.showModal({
      title: '确认解绑',
      content: `解绑「${ownerName}」后，对方将无法查看此工地进度，确认继续？`,
      confirmText: '解绑',
      confirmColor: '#EF4444',
      success: (res) => {
        if (!res.confirm) return
        call('unbindOwner', {
          projectId:   this.data.projectId,
          ownerOpenid
        }).then((result) => {
          if (result.error) {
            showError(result.error.message || '解绑失败')
            return
          }
          wx.showToast({ title: '已解绑', icon: 'success' })
          // 更新本地 project 数据中的 owner 数组
          const project = this.data.project || {}
          const newOpenids = Array.isArray(result.ownerOpenids) ? result.ownerOpenids : []
          const newNames   = Array.isArray(result.ownerNames)   ? result.ownerNames   : []
          const newUserIds = Array.isArray(result.ownerUserIds) ? result.ownerUserIds : []
          this.setData({
            project: Object.assign({}, project, {
              ownerOpenids: newOpenids,
              ownerNames:   newNames,
              ownerUserIds: newUserIds,
              ownerOpenid:  newOpenids[0] || '',
              ownerName:    newNames[0]   || ''
            })
          }, () => {
            this.buildOwnerList()
            // 同步更新 flowStatus
            this.setData({
              flowStatus: this.makeFlowStatus(this.data.project, this.data.logs)
            })
          })
        }).catch((error) => {
          showError('解绑失败', error)
        })
      }
    })
  },

  onShareAppMessage() {
    const project = this.data.project || {}
    const bindCode = this.data.bindCodeText || ''
    return {
      title: `【晟景装饰】${project.name || '工地'} 施工进度查看邀请`,
      path: `/subpackages/owner/pages/owner/owner?bindCode=${bindCode}`,
      imageUrl: ''
    }
  }
})
