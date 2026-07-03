const ENABLE_V2_DEAL_LOOP_ENTRY = false
const BOSS_ROLES = ['admin', 'boss_qi', 'boss_hu']

function getCurrentRole() {
  if (typeof getApp !== 'function') return ''
  const app = getApp()
  const user = app && app.globalData && app.globalData.user
  return (user && user.role) || ''
}

function returnToWorkbench() {
  setTimeout(() => {
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
    if (pages.length > 1) {
      wx.navigateBack({ delta: 1 })
      return
    }
    wx.switchTab({
      url: '/pages/workbench/workbench',
      fail: () => {
        wx.redirectTo({ url: '/pages/workbench/workbench' })
      }
    })
  }, 500)
}

function guardDealLoopPage() {
  const role = getCurrentRole()
  const allowed = ENABLE_V2_DEAL_LOOP_ENTRY && BOSS_ROLES.indexOf(role) !== -1
  if (allowed) return true
  wx.showToast({
    title: '当前功能未开放',
    icon: 'none'
  })
  returnToWorkbench()
  return false
}

module.exports = {
  guardDealLoopPage,
  ENABLE_V2_DEAL_LOOP_ENTRY,
  BOSS_ROLES
}
