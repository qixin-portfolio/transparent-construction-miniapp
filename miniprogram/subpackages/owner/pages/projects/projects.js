const { call, showError } = require('../../../../services/cloud')

const SECTION_CONFIG = [
  { key: 'inProgress', title: '施工中', emptyText: '暂无施工中的项目' },
  { key: 'delivered', title: '已交付', emptyText: '暂无已交付项目' },
  { key: 'afterSales', title: '售后中', emptyText: '暂无售后中的项目' },
  { key: 'others', title: '其他', emptyText: '暂无其他项目' }
]

function toTime(value) {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  if (value.$date && value.$date.$numberLong) return Number(value.$date.$numberLong)
  if (value.$numberLong) return Number(value.$numberLong)
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

Page({
  data: {
    loading: false,
    binding: false,
    bindCode: '',
    loadError: '',
    items: [],
    sections: SECTION_CONFIG.map((item) => Object.assign({}, item, { items: [] })),
    stats: {
      total: 0,
      inProgress: 0,
      delivered: 0,
      afterSales: 0,
      others: 0
    }
  },

  onShow() {
    getApp().ensureLogin({ allowGuestFlow: true })
      .then(() => this.loadProjects())
      .catch((error) => {
        this.setData({
          items: [],
          sections: SECTION_CONFIG.map((item) => Object.assign({}, item, { items: [] })),
          stats: { total: 0, inProgress: 0, delivered: 0, afterSales: 0, others: 0 },
          loadError: error && error.message ? error.message : '项目加载失败，可先输入绑定码'
        })
      })
  },

  onBindCodeInput(event) {
    this.setData({
      bindCode: String(event.detail.value || '').replace(/\D/g, '').slice(0, 6)
    })
  },

  bindProject() {
    const code = String(this.data.bindCode || '').trim()
    if (!/^\d{6}$/.test(code)) {
      wx.showToast({ title: '请输入 6 位绑定码', icon: 'none' })
      return
    }
    if (this.data.binding) return

    this.setData({ binding: true })
    call('bindOwnerProject', { code })
      .then((res) => {
        const app = getApp()
        if (res.user && app.normalizeUser) {
          app.globalData.user = app.normalizeUser(res.user)
        }
        wx.showToast({ title: res.message || '绑定成功', icon: 'success' })
        this.setData({ bindCode: '' })
        this.loadProjects()
      })
      .catch((error) => {
        showError(error && error.message ? error.message : '绑定失败')
      })
      .finally(() => {
        this.setData({ binding: false })
      })
  },

  loadProjects() {
    this.setData({ loading: true, loadError: '' })
    call('listOwnerProjects')
      .then((res) => {
        const groups = res.groups || {}
        const sections = SECTION_CONFIG.map((section) => Object.assign({}, section, {
          items: this.prepareProjects(groups[section.key] || [])
        }))
        const items = this.prepareProjects(res.items || [])
        this.setData({
          items,
          sections,
          stats: Object.assign({}, this.data.stats, res.stats || {})
        })
      })
      .catch((error) => {
        this.setData({
          items: [],
          sections: SECTION_CONFIG.map((item) => Object.assign({}, item, { items: [] })),
          stats: { total: 0, inProgress: 0, delivered: 0, afterSales: 0, others: 0 },
          loadError: error && error.message ? error.message : '项目加载失败，可先输入绑定码'
        })
      })
      .finally(() => {
        this.setData({ loading: false })
      })
  },

  prepareProjects(items) {
    return (items || []).map((item) => {
      const locationParts = [item.community, item.building, item.room].filter(Boolean)
      return Object.assign({}, item, {
        locationText: locationParts.length ? locationParts.join(' / ') : (item.address || '未填写地址'),
        progressText: `${Number(item.progress || 0)}%`,
        foremanText: item.foremanName || item.foremanPhone || '暂未填写',
        deliveredAtText: this.formatDate(item.deliveredAt) || '待补充',
        updatedAtText: this.formatDate(item.updatedAt) || '暂无更新',
        warrantyStatusText: this.makeWarrantyStatusText(item),
        ticketStatusText: this.makeTicketStatusText(item)
      })
    })
  },

  formatDate(value) {
    const time = toTime(value)
    if (!time) return ''
    const date = new Date(time)
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  makeWarrantyStatusText(project) {
    if (!project.warrantyCardId) return '暂无质保卡'
    if (project.warrantyStatus === 'expired') return '已过期'
    return '质保中'
  },

  makeTicketStatusText(project) {
    const count = Number(project.activeAfterSalesTicketCount || 0)
    if (count > 0) return `${count} 个工单处理中`
    return '暂无进行中工单'
  },

  goProgress(event) {
    const projectId = event.currentTarget.dataset.id || ''
    if (!projectId) {
      wx.showToast({ title: '缺少项目信息', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/subpackages/owner/pages/owner/owner?projectId=${projectId}` })
  },

  callForeman(event) {
    const phone = String(event.currentTarget.dataset.phone || '').trim()
    if (!phone) {
      wx.showToast({ title: '暂未填写工长电话', icon: 'none' })
      return
    }
    wx.makePhoneCall({ phoneNumber: phone })
  },

  goWarranty(event) {
    const projectId = event.currentTarget.dataset.id || ''
    if (!projectId) {
      wx.showToast({ title: '缺少项目信息', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/subpackages/owner/pages/warranty-card/warranty-card?projectId=${projectId}` })
  },

  goAfterSaleCreate(event) {
    const projectId = event.currentTarget.dataset.id || ''
    if (!projectId) {
      wx.showToast({ title: '缺少项目信息', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/subpackages/owner/pages/after-sale-create/after-sale-create?projectId=${projectId}` })
  },

  goTickets(event) {
    const projectId = event.currentTarget.dataset.id || ''
    if (!projectId) {
      wx.showToast({ title: '缺少项目信息', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/subpackages/owner/pages/after-sale-list/after-sale-list?projectId=${projectId}` })
  }
})
