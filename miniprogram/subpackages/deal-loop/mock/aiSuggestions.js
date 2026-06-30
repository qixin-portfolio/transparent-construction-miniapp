const aiSuggestions = [
  {
    suggestionId: 'mock_ai_001',
    customerId: 'mock_customer_001',
    triggerStage: 'quoted',
    customerConcern: '觉得报价高',
    recommendedMessage: '王姐，您对比价格很正常。我先把水电和环保材料这两块拆开给您看，哪些钱是必须花在隐蔽工程上的，您心里会更清楚。',
    recommendedMaterialIds: ['mock_material_001', 'mock_material_003'],
    nextAction: '发送报价拆解和水电验收素材',
    tone: '老板娘温柔',
    confidenceLabel: 'mock_high',
    riskNotes: ['不能承诺最低价', '不能承诺绝对无增项'],
    generatedBy: 'mock_rule',
    createdAt: '2026-06-29T00:00:00+08:00'
  },
  {
    suggestionId: 'mock_ai_002',
    customerId: 'mock_customer_003',
    triggerStage: 'hot_follow',
    customerConcern: '担心售后和工地管理',
    recommendedMessage: '张姐，签约前把售后和工地管理问清楚是对的。我们可以先给您看透明工地日报和竣工质保卡，开工后每天的进度、照片、问题都会留痕。',
    recommendedMaterialIds: ['mock_material_002', 'mock_material_004'],
    nextAction: '演示透明日报和质保卡',
    tone: '稳妥正式',
    confidenceLabel: 'mock_high',
    riskNotes: ['不能承诺每天必定大量照片', '质保以合同约定为准'],
    generatedBy: 'mock_rule',
    createdAt: '2026-06-29T00:00:00+08:00'
  },
  {
    suggestionId: 'mock_ai_003',
    customerId: 'mock_customer_002',
    triggerStage: 'measured',
    customerConcern: '还没形成方案信任',
    recommendedMessage: '李先生，量房后最关键的是把您家户型限制、预算和喜欢的效果放到一起看。我先准备一套同风格案例，方案沟通时我们逐项对齐。',
    recommendedMaterialIds: ['mock_material_003', 'mock_material_005'],
    nextAction: '准备同风格案例和交底图纸说明',
    tone: '设计师专业',
    confidenceLabel: 'mock_medium',
    riskNotes: ['不能提前承诺最终效果', '报价需以正式方案为准'],
    generatedBy: 'mock_rule',
    createdAt: '2026-06-29T00:00:00+08:00'
  }
]

function getSuggestionsByCustomer(customerId) {
  return aiSuggestions.filter((item) => item.customerId === customerId)
}

module.exports = {
  aiSuggestions,
  getSuggestionsByCustomer
}
