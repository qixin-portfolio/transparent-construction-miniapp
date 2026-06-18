const { call, showError } = require('../../../../services/cloud')

const ROLE_OPTIONS = [
  { code: 'worker', label: '工长' },
  { code: 'designer', label: '设计师' },
  { code: 'sales', label: '销售' },
  { code: 'boss_qi', label: '老板（老齐）' },
  { code: 'boss_hu', label: '老板（老胡）' }
]

const STATUS_LABELS = {
  active: '有效',
  used: '已使用',
  expired: '已过期'
}

Page({
  data: {
    authReady: false,
    canManage: false,
    roleOptions: ROLE_OPTIONS,
    selectedRole: 'worker',
    remark: '',
    generating: false,
    latestCode: null,
    inviteCodes: [],
    members: [],
    teamStats: {
      activeCodes: 0,
      usedCodes: 0,
      expiredCodes: 0,
      memberCount: 0
    },
    loadingCodes: false,
    loadingMembers: false,
    statusLabels: STATUS_LABELS
  },

  onLoad() {
    const app = getApp()
    app.ensureLogin()
      .then((user) => {
        const canManage = user && ['admin', 'boss_qi', 'boss_hu'].indexOf(user.role) !== -1
        this.setData({ authReady: true, canManage })
        if (canManage) {
          this.loadInviteCodes()
          this.loadMembers()
        }
      })
      .catch(() => {
        this.setData({ authReady: true })
      })
  },

  onShow() {
    if (this.data.canManage) {
      this.loadInviteCodes()
      this.loadMembers()
    }
  },

  selectRole(e) {
    this.setData({ selectedRole: e.currentTarget.dataset.role })
  },

  onRemarkInput(e) {
    this.setData({ remark: String(e.detail.value || '').slice(0, 50) })
  },

  generateCode() {
    if (this.data.generating) return
    this.setData({ generating: true })
    call('createStaffInviteCode', { role: this.data.selectedRole, remark: this.data.remark })
      .then((res) => {
        this.setData({ latestCode: res, remark: '' })
        wx.showToast({ title: '邀请码已生成', icon: 'success' })
        this.loadInviteCodes()
      })
      .catch((err) => showError('生成失败', err))
      .finally(() => {
        this.setData({ generating: false })
      })
  },

  copyCode(e) {
    const code = e.currentTarget.dataset.code
    wx.setClipboardData({
      data: String(code || ''),
      success: () => {
        wx.showToast({ title: '已复制邀请码', icon: 'success' })
      }
    })
  },

  loadInviteCodes() {
    this.setData({ loadingCodes: true })
    call('listStaffInviteCodes', {})
      .then((res) => {
        const inviteCodes = res.items || []
        this.setData({
          inviteCodes,
          teamStats: this.makeTeamStats(inviteCodes, this.data.members)
        })
      })
      .catch(() => {
        this.setData({
          inviteCodes: [],
          teamStats: this.makeTeamStats([], this.data.members)
        })
      })
      .finally(() => {
        this.setData({ loadingCodes: false })
      })
  },

  loadMembers() {
    this.setData({ loadingMembers: true })
    call('listStaffMembers', { scope: 'internal' })
      .then((res) => {
        const members = res.items || []
        this.setData({
          members,
          teamStats: this.makeTeamStats(this.data.inviteCodes, members)
        })
      })
      .catch(() => {
        this.setData({
          members: [],
          teamStats: this.makeTeamStats(this.data.inviteCodes, [])
        })
      })
      .finally(() => {
        this.setData({ loadingMembers: false })
      })
  },

  makeTeamStats(inviteCodes, members) {
    return {
      activeCodes: inviteCodes.filter((item) => item.status === 'active').length,
      usedCodes: inviteCodes.filter((item) => item.status === 'used').length,
      expiredCodes: inviteCodes.filter((item) => item.status === 'expired').length,
      memberCount: members.length
    }
  },

  formatDate(value) {
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
  }
})
