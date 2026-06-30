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
    total: list.length,
    hot: list.filter((item) => getPipelineStage(item) === 'hot_follow').length,
    signed: list.filter((item) => getPipelineStage(item) === 'signed').length,
    highRisk: list.filter((item) => item.riskLevel === 'high').length
  }
}

module.exports = {
  PIPELINE_STAGE_LABELS,
  getPipelineStage,
  getPipelineLabel,
  groupCustomersByStage,
  makePipelineStats
}
