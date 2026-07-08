const { call, showError } = require('../../../../services/cloud')

const ENABLE_FREE_TRIAL_USAGE = true

const PLANS = [
  {
    id: 'free',
    name: '试运行免费版',
    subtitle: '上线初期开放使用',
    price: '免费开放',
    color: '#6B7280',
    badge: 'free',
    maxProjects: 9999,
    maxStaff: 9999,
    features: [
      { icon: '✓', text: '试运行期暂不限制项目数', ok: true },
      { icon: '✓', text: '试运行期暂不限制员工数', ok: true },
      { icon: '✓', text: '工地日报 & 照片', ok: true },
      { icon: '✓', text: '业主扫码查看进度', ok: true },
      { icon: '✗', text: 'AI 业主摘要', ok: false },
      { icon: '✗', text: '售后工单', ok: false }
    ]
  },
  {
    id: 'starter',
    name: '入门版',
    subtitle: '适合小型装修队',
    price: '联系升级',
    color: '#1B7A56',
    badge: 'starter',
    maxProjects: 10,
    maxStaff: 10,
    features: [
      { icon: '✓', text: '最多 10 个项目', ok: true },
      { icon: '✓', text: '最多 10 名员工', ok: true },
      { icon: '✓', text: '工地日报 & 照片', ok: true },
      { icon: '✓', text: '业主扫码查看进度', ok: true },
      { icon: '✓', text: 'AI 业主摘要', ok: true },
      { icon: '✓', text: '售后工单', ok: true }
    ]
  },
  {
    id: 'pro',
    name: '专业版',
    subtitle: '中型公司首选',
    price: '联系升级',
    color: '#7C3AED',
    badge: 'pro',
    maxProjects: 50,
    maxStaff: 50,
    features: [
      { icon: '✓', text: '最多 50 个项目', ok: true },
      { icon: '✓', text: '最多 50 名员工', ok: true },
      { icon: '✓', text: '工地日报 & 照片', ok: true },
      { icon: '✓', text: '业主扫码查看进度', ok: true },
      { icon: '✓', text: 'AI 业主摘要', ok: true },
      { icon: '✓', text: '售后工单', ok: true }
    ]
  },
  {
    id: 'enterprise',
    name: '企业版',
    subtitle: '大型装修公司',
    price: '联系升级',
    color: '#B45309',
    badge: 'enterprise',
    maxProjects: 9999,
    maxStaff: 9999,
    features: [
      { icon: '✓', text: '不限项目数', ok: true },
      { icon: '✓', text: '不限员工数', ok: true },
      { icon: '✓', text: '工地日报 & 照片', ok: true },
      { icon: '✓', text: '业主扫码查看进度', ok: true },
      { icon: '✓', text: 'AI 业主摘要', ok: true },
      { icon: '✓', text: '售后工单', ok: true }
    ]
  }
]

Page({
  data: {
    loading: true,
    plans: PLANS,
    currentPlan: null,
    currentPlanId: 'free',
    freeUsageMode: ENABLE_FREE_TRIAL_USAGE,
    upgrading: false,
    selectedPlanId: ''
  },

  onShow() {
    this.loadCurrentPlan()
  },

  loadCurrentPlan() {
    this.setData({ loading: true })
    call('getCurrentTenantPlan')
      .then((res) => {
        const plan = (res && res.success) ? res : {}
        const planId = (plan.plan || 'free').toLowerCase()
        this.setData({
          currentPlan: plan,
          currentPlanId: planId,
          loading: false
        })
      })
      .catch(() => {
        this.setData({ loading: false })
        showError('加载套餐信息失败')
      })
  },

  selectPlan(e) {
    const planId = e.currentTarget.dataset.plan
    if (!planId) return
    this.setData({ selectedPlanId: planId })
    const plan = PLANS.find(p => p.id === planId)
    if (!plan) return
    if (this.data.freeUsageMode) {
      wx.showModal({
        title: '试运行期免费开放',
        content: '当前阶段暂不强制升级套餐，工地、员工、业主绑定和施工日报主链路可继续使用。后续如推出高级版本，会提前通知。',
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#1B7A56'
      })
      return
    }
    if (planId === this.data.currentPlanId) {
      wx.showToast({ title: '当前已是该套餐', icon: 'none' })
      return
    }
    wx.showModal({
      title: '确认升级',
      content: `将套餐升级为「${plan.name}」，升级后额度将立即生效。`,
      confirmText: '确认升级',
      confirmColor: '#1B7A56',
      success: (res) => {
        if (res.confirm) {
          this.doUpgrade(plan)
        }
      }
    })
  },

  doUpgrade(plan) {
    this.setData({ upgrading: true })
    call('adminUpdateTenantPlan', {
      plan: plan.id,
      maxProjects: plan.maxProjects,
      maxStaff: plan.maxStaff
    })
      .then((res) => {
        if (res && res.success) {
          wx.showToast({ title: '套餐升级成功', icon: 'success' })
          this.loadCurrentPlan()
        } else {
          throw new Error((res && res.message) || '升级失败')
        }
      })
      .catch((error) => {
        showError('套餐升级失败', error)
      })
      .finally(() => {
        this.setData({ upgrading: false })
      })
  },

  goBack() {
    wx.navigateBack()
  }
})
