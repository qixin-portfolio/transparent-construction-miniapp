const PHASE2_GUARDS = [
  '仅使用本地 mock 数据',
  '不调用云函数',
  '不读写真实数据库',
  '不接真实 AI API',
  '不修改 V1 页面',
  '不修改 V1 云函数',
  '不修改工作台入口和 tabBar',
  '不部署，不上传体验版'
]

function getPhase2Guards() {
  return PHASE2_GUARDS.slice()
}

function makeHumanGateMessage(action) {
  return `${action} 属于 Phase 2 之后的高风险动作，需要 Human Gate 确认。`
}

module.exports = {
  getPhase2Guards,
  makeHumanGateMessage
}
