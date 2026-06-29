const { call, showError } = require('../../../../services/cloud')

const ROLE_OPTIONS = [
  { code: 'worker', label: '工长' },
  { code: 'project_manager', label: '项目经理' },
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
    canAdmin: false,
    roleOptions: ROLE_OPTIONS,
    selectedRole: 'worker',
    remark: '',
    generating: false,
    latestCode: null,
    inviteCodesCollapsed: false,
    membersCollapsed: false,
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
        const canAdmin = user && user.role === 'admin'
        this.setData({ authReady: true, canManage, canAdmin })
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

  editMemberRemark(e) {
    const memberId = e.currentTarget.dataset.id
    const currentRemark = e.currentTarget.dataset.remark || ''
    if (!memberId || !this.data.canAdmin) return

    wx.showModal({
      title: '修改员工备注',
      content: currentRemark ? `当前备注：${currentRemark}` : '给员工加一个好认的备注',
      editable: true,
      placeholderText: '例如：张工长、老胡、王设计',
      confirmText: '保存',
      success: (res) => {
        if (!res.confirm) return
        const staffRemark = String(res.content || '').trim().slice(0, 50)
        call('updateStaffMember', { memberId, staffRemark })
          .then(() => {
            wx.showToast({ title: '备注已更新', icon: 'success' })
            this.loadMembers()
          })
          .catch((err) => showError('修改失败', err))
      }
    })
  },

  deleteMember(e) {
    const memberId = e.currentTarget.dataset.id
    const name = e.currentTarget.dataset.name || '该员工'
    if (!memberId || !this.data.canAdmin) return

    wx.showModal({
      title: '移除内部员工',
      content: `确定把「${name}」从内部员工列表移除吗？移除后该账号会变为普通业主账号。`,
      confirmText: '移除',
      confirmColor: '#D9534F',
      success: (res) => {
        if (!res.confirm) return
        call('deleteStaffMember', { memberId })
          .then(() => {
            wx.showToast({ title: '已移除', icon: 'success' })
            this.loadMembers()
          })
          .catch((err) => showError('移除失败', err))
      }
    })
  },

  toggleInviteCodes() {
    this.setData({ inviteCodesCollapsed: !this.data.inviteCodesCollapsed })
  },

  toggleMembers() {
    this.setData({ membersCollapsed: !this.data.membersCollapsed })
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
