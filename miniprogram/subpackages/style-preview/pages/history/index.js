const mockService = require('../../mock/style-preview-service')
const realService = require('../../services/real-preview-service')
function formatDate(value) { const d = new Date(value); return Number.isNaN(d.getTime()) ? '刚刚创建' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
Page({
  data: { customerId: '', customerName: '', sessions: [], mock: false },
  onLoad(options = {}) { this.isMock = String(options.mock || '') === '1'; const customerId = String(options.customerId || ''); this.setData({ customerId, mock: this.isMock }); if (this.isMock) this.load(); else realService.checkAccess().then(() => this.load()).catch(() => this.deny()) },
  onShow() { if (this.data.customerId) this.load() }, deny() { wx.showToast({ title: '该功能暂未开放', icon: 'none' }); wx.navigateBack() },
  async load() { try { const items = this.isMock ? mockService.listSessions(this.data.customerId) : await realService.listSessions(this.data.customerId); this.setData({ sessions: items.map((item) => Object.assign({}, item, { id: item._id || item.id, createdAtText: formatDate(item.createdAt), statusText: item.status === 'succeeded' || item.status === 'completed' ? '已生成' : (item.status === 'failed' ? '生成失败' : '处理中') })) }) } catch (_) { if (!this.isMock) this.deny() } },
  viewResult(event) { wx.navigateTo({ url: `/subpackages/style-preview/pages/result/index?id=${event.currentTarget.dataset.id}${this.isMock ? '&mock=1' : ''}` }) }, createNew() { wx.redirectTo({ url: `/subpackages/style-preview/pages/start/index?customerId=${this.data.customerId}${this.isMock ? '&mock=1' : ''}` }) }
})
