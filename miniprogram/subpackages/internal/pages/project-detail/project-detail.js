const { call, showError } = require('../../../../services/cloud')
const { DEMO_MODE, demoProjects, demoLogs } = require('../../../../utils/demo')

Page({
  data: {
    projectId: '',
    project: null,
    logs: [],
    loading: false,
    bindCode: null,
    bindCodeText: '',
    bindCodeExpiresAtText: '',
    bindCodeLoading: false,
    user: null,
    canUpload: false,
    canManageOwner: false,
    canViewManagementDetail: false,
    canDelete: false,
    stats: {
      logCount: 0,
      photoCount: 0,
      latestDateText: '',
      latestStage: ''
    },
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

  setAccess(user) {
    const role = user && user.role
    this.setData({
      user: user || null,
      canUpload: ['admin', 'boss_qi', 'boss_hu', 'designer', 'worker'].indexOf(role) !== -1,
      canManageOwner: ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales'].indexOf(role) !== -1,
      canViewManagementDetail: ['admin', 'boss_qi', 'boss_hu'].indexOf(role) !== -1,
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
        this.setData({
          project: res.project || null,
          logs,
          visibleLogs: logs.slice(0, this.data.timelineCollapsedCount),
          stats: this.makeStats(logs),
          flowStatus: this.makeFlowStatus(res.project || null, logs),
          photoWall,
          filteredPhotoWall: photoWall,
          photoStages: stages,
          filterStage: '',
          timelineExpanded: false,
          bindCode: null,
          bindCodeText: '',
          bindCodeExpiresAtText: ''
        })
      })
      .catch((error) => {
        if (DEMO_MODE) {
          const logs = this.prepareLogs(demoLogs)
          const photoWall = this.makePhotoWall(logs)
          this.setData({
            project: demoProjects[0],
            logs,
            visibleLogs: logs.slice(0, this.data.timelineCollapsedCount),
            stats: this.makeStats(logs),
            flowStatus: this.makeFlowStatus(demoProjects[0], logs),
            photoWall,
            filteredPhotoWall: photoWall,
            photoStages: this.buildStageList(photoWall),
            filterStage: '',
            timelineExpanded: false
          })
          return
        }
        this.setData({
          project: null,
          logs: [],
          visibleLogs: [],
          stats: this.makeStats([]),
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

  goDesignDrawings() {
    const name = encodeURIComponent((this.data.project || {}).name || '')
    wx.navigateTo({
      url: `/subpackages/internal/pages/design-drawings/design-drawings?projectId=${this.data.projectId}&projectName=${name}`
    })
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

  makeFlowStatus(project, logs) {
    const pendingCount = logs.filter((item) => (item.reviewStatus || 'pending') === 'pending').length
    const approvedCount = logs.filter((item) => item.reviewStatus === 'approved').length
    const rejectedCount = logs.filter((item) => item.reviewStatus === 'rejected').length
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
      ownerBound: project && project.ownerOpenid ? '已绑定' : '待绑定',
      pendingCount,
      approvedCount,
      uploadClass: logs.length ? 'done' : '',
      reviewClass: pendingCount ? 'warning' : (approvedCount ? 'done' : ''),
      ownerClass: project && project.ownerOpenid ? 'done' : ''
    }
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
        this.setData({
          bindCode: res,
          bindCodeText: res.code || '',
          bindCodeExpiresAtText: res.expiresAt ? this.formatTime(res.expiresAt) : ''
        })
        wx.showToast({
          title: '绑定码已生成',
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
    if (!this.data.bindCodeText) {
      showError('请先生成绑定码')
      return
    }
    const projectName = (this.data.project || {}).name || '工地'
    const text = `【晟景装饰】${projectName} 施工进度查看邀请\n绑定码：${this.data.bindCodeText}\n请在微信小程序「晟景透明工地」的「业主进度」页面输入此绑定码。`
    wx.setClipboardData({
      data: text
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
