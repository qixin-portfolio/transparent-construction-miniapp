const { aiSuggestions } = require('../mock/aiSuggestions')
const { getMaterialsByIds } = require('./materialMapper')

function buildFallbackSuggestion(customer) {
  const name = (customer && customer.name) || '客户'
  return {
    suggestionId: 'mock_ai_fallback',
    customerId: (customer && customer.customerId) || '',
    triggerStage: (customer && customer.pipelineStage) || 'new_lead',
    customerConcern: '待补充客户顾虑',
    recommendedMessage: `${name}，我先把您最关心的预算、效果和工地管理拆开讲清楚，再给您看对应案例和透明工地记录。`,
    recommendedMaterialIds: ['mock_material_002'],
    nextAction: '补充客户顾虑后重新生成 mock 建议',
    tone: '稳妥正式',
    confidenceLabel: 'mock_low',
    riskNotes: ['mock 建议不能替代人工判断', '不能承诺获客或成交结果'],
    generatedBy: 'mock_rule',
    createdAt: '2026-06-29T00:00:00+08:00'
  }
}

function generateSuggestion(customer) {
  const matched = aiSuggestions.find((item) => item.customerId === (customer && customer.customerId))
  const suggestion = matched || buildFallbackSuggestion(customer)
  return Object.assign({}, suggestion, {
    materials: getMaterialsByIds(suggestion.recommendedMaterialIds)
  })
}

module.exports = {
  generateSuggestion
}
