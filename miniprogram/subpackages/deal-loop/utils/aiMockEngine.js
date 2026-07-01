const { aiSuggestions } = require('../mock/aiSuggestions')
const { getMaterialsByIds } = require('./materialMapper')

function safeText(value, fallback = '') {
  const text = String(value || '').trim()
  return text || fallback
}

function deriveConcern(customer) {
  const concern = safeText((customer && customer.concern) || (customer && customer.need), '')
  if (!concern) return '暂无明确顾虑，客户重点仍是装修信任和交付透明。'
  return concern
}

function pickMaterialIds(customer) {
  if (!customer || typeof customer !== 'object') return ['mock_material_002']
  if (customer.actionBucket === 'closing' || customer.pipelineStage === 'hot_follow') {
    return ['mock_material_002', 'mock_material_004']
  }
  if (customer.actionBucket === 'key_push' || customer.pipelineStage === 'quoted' || customer.pipelineStage === 'proposal') {
    return ['mock_material_003']
  }
  if (customer.actionBucket === 'signed_transfer' || customer.pipelineStage === 'signed') {
    return ['mock_material_004']
  }
  if (customer.actionBucket === 'new_lead' || customer.pipelineStage === 'lost') {
    return ['mock_material_001']
  }
  return ['mock_material_002']
}

function buildFallbackSuggestion(customer) {
  const name = safeText((customer && customer.name) || '客户')
  const pipelineStage = safeText((customer && customer.pipelineStage) || 'new_lead')
  const riskLevel = safeText((customer && customer.riskLevel) || '中风险', '中风险')
  const budgetRange = safeText((customer && customer.budgetRange) || '预算待确认')
  const concern = deriveConcern(customer)
  const todayAction = safeText((customer && customer.todayAction) || '待确认下一步跟进动作')
  const recommendedMaterial = safeText((customer && customer.recommendedMaterial) || '透明日报样例')
  const suggestedTalk = safeText((customer && customer.suggestedTalk) || '先确认客户当前最担心的点，再选择对应信任素材。')
  const riskNotes = [
    '示例建议不能替代人工判断',
    '不能承诺获客或成交结果'
  ]
  if (riskLevel === '高风险' || pipelineStage === 'hot_follow') {
    riskNotes.push('高风险客户更需要当天跟进，不要强推合同')
  }
  if (budgetRange.includes('低') || budgetRange.includes('待确认')) {
    riskNotes.push('预算偏好需先确认，避免过度报价')
  }
  return {
    suggestionId: 'mock_ai_real_customer',
    customerId: (customer && customer.customerId) || '',
    triggerStage: pipelineStage,
    customerConcern: concern,
    recommendedApproach: `优先基于 ${recommendedMaterial} 整理证据，引导客户看见工地管理和交付过程。`,
    materialSendPlan: recommendedMaterial,
    recommendedMessage: suggestedTalk,
    recommendedMaterialIds: pickMaterialIds(customer),
    nextAction: todayAction,
    tone: pipelineStage === 'hot_follow' || pipelineStage === 'quoted' ? '成交推进型' : '信任建立型',
    confidenceLabel: 'mock_medium',
    riskNotes,
    generatedBy: 'mock_rule_real_customer',
    createdAt: '2026-06-30T00:00:00+08:00'
  }
}

function generateSuggestion(customer) {
  const matched = aiSuggestions.find((item) => item.customerId === (customer && customer.customerId))
  const suggestion = matched || buildFallbackSuggestion(customer)
  return Object.assign({}, suggestion, { materials: getMaterialsByIds(suggestion.recommendedMaterialIds) })
}

module.exports = { generateSuggestion }
