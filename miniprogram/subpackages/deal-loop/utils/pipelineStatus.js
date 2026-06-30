const PIPELINE_STAGE_LABELS = {
  new_lead: '新线索',
  contacted: '已沟通',
  measured: '已量房',
  proposal: '已出方案',
  quoted: '已报价',
  hot_follow: '重点跟进',
  signed: '已签约',
  lost: '已流失'
}

const ACTION_FILTERS = [
  { code: 'today_follow', label: '今日跟进', desc: '今天需要老板盯住的客户' },
  { code: 'high_risk', label: '高风险', desc: '有流失风险，需要优先处理' },
  { code: 'closing', label: '临门一脚', desc: '接近签约或需要最后一推' }
]

const RISK_SORT = {
  '高风险': 4,
  '中风险': 2,
  '低风险': 1,
  high: 4,
  medium: 2,
  low: 1
}

const ACTION_SORT = {
  key_push: 3,
  closing: 2,
  signed_transfer: 2,
  today: 1,
  new_lead: 1
}

function getPipelineStage(customer) {
  const explicitStage = customer && customer.pipelineStage
  if (PIPELINE_STAGE_LABELS[explicitStage]) return explicitStage

  const dealStatus = String((customer && customer.dealStatus) || '')
  const stage = String((customer && customer.stage) || '')
  const lifecycleStatus = String((customer && customer.lifecycleStatus) || '')

  if (dealStatus === '已流失' || lifecycleStatus === 'lost') return 'lost'
  if (dealStatus === '已成交' || stage === '已签单' || lifecycleStatus === 'signed') return 'signed'
  if (stage === '准备签单') return 'hot_follow'
  if (stage === '已报价' || lifecycleStatus === 'quoted') return 'quoted'
  if (stage === '已出图') return 'proposal'
  if (stage === '已量房' || lifecycleStatus === 'measured') return 'measured'
  if (stage === '已到店') return 'contacted'
  return 'new_lead'
}

function getPipelineLabel(stage) {
  return PIPELINE_STAGE_LABELS[stage] || '新线索'
}

function getRiskClass(riskLevel) {
  if (riskLevel === '高风险' || riskLevel === 'high') return 'risk-high'
  if (riskLevel === '中风险' || riskLevel === 'medium') return 'risk-medium'
  return 'risk-low'
}

function getActionScore(customer) {
  const riskScore = (RISK_SORT[customer && customer.riskLevel] || 0) * 100
  const actionScore = (ACTION_SORT[customer && customer.actionBucket] || 0) * 10
  const priorityScore = Number((customer && customer.actionPriority) || 0)
  const todayScore = customer && customer.isTodayFollow ? 5 : 0
  return riskScore + actionScore + priorityScore + todayScore
}

function sortCustomersForAction(customers) {
  return (customers || []).slice().sort((a, b) => getActionScore(b) - getActionScore(a))
}

function filterCustomersForAction(customers, filterCode) {
  const list = customers || []
  if (filterCode === 'today_follow') return list.filter((item) => item.isTodayFollow)
  if (filterCode === 'high_risk') return list.filter((item) => item.riskLevel === '高风险' || item.riskLevel === 'high')
  if (filterCode === 'closing') return list.filter((item) => item.isClosingMoment || item.actionBucket === 'closing')
  if (!filterCode || filterCode === 'all') return list
  return list.filter((customer) => customer.pipelineStage === filterCode)
}

function groupCustomersByStage(customers, stages) {
  const map = {}
  ;(stages || []).forEach((stage) => {
    map[stage.code] = []
  })
  ;(customers || []).forEach((customer) => {
    const code = getPipelineStage(customer)
    if (!map[code]) map[code] = []
    map[code].push(Object.assign({}, customer, {
      pipelineStage: code,
      pipelineLabel: getPipelineLabel(code)
    }))
  })
  return map
}

function makePipelineStats(customers) {
  const list = customers || []
  return {
    todayFollow: list.filter((item) => item.isTodayFollow).length,
    keyPush: list.filter((item) => item.actionBucket === 'key_push' || getPipelineStage(item) === 'hot_follow').length,
    closing: list.filter((item) => item.isClosingMoment || item.actionBucket === 'closing').length,
    highRisk: list.filter((item) => item.riskLevel === '高风险' || item.riskLevel === 'high').length
  }
}

module.exports = {
  ACTION_FILTERS,
  PIPELINE_STAGE_LABELS,
  getPipelineStage,
  getPipelineLabel,
  getRiskClass,
  sortCustomersForAction,
  filterCustomersForAction,
  groupCustomersByStage,
  makePipelineStats
}
