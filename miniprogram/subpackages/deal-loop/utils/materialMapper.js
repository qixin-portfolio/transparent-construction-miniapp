const { trustMaterials } = require('../mock/trustMaterials')

function safeText(value, fallback = '') {
  const text = String(value || '').trim()
  return text || fallback
}

function includesAny(text, keywords) {
  const source = String(text || '')
  return keywords.some((keyword) => source.indexOf(keyword) !== -1)
}

function filterMaterials(type) {
  if (!type || type === 'all') return trustMaterials
  return trustMaterials.filter((item) => item.type === type)
}

function getMaterialsByIds(ids) {
  const idSet = new Set(ids || [])
  return trustMaterials.filter((item) => idSet.has(item.materialId))
}

function getMaterialSummary(material) {
  if (!material) return ''
  const tags = (material.tags || []).join(' / ')
  return [
    material.typeLabel,
    tags,
    material.concernSolved,
    material.recommendationReason,
    material.sendScene
  ].filter(Boolean).join(' · ')
}

function makeMaterialProfile(customer) {
  const source = customer || {}
  const riskReasons = Array.isArray(source.riskReasons) ? source.riskReasons.join(' ') : ''
  const concern = safeText(source.concern || source.need || source.primaryRiskReason || riskReasons, '暂无明确顾虑')
  const stage = safeText(source.stage, '咨询')
  const dealStatus = safeText(source.dealStatus, '未成交')
  const pipelineStage = safeText(source.pipelineStage, '')
  const actionBucket = safeText(source.actionBucket, '')
  const riskLevel = safeText(source.riskLevel, '低风险')
  const joinedText = [
    stage,
    dealStatus,
    pipelineStage,
    actionBucket,
    riskLevel,
    source.budgetRange,
    source.budget,
    source.expectedBudget,
    source.stylePreference,
    source.style,
    source.area,
    source.source,
    source.need,
    source.concern,
    source.primaryRiskReason,
    riskReasons
  ].map((item) => safeText(item)).join(' ')

  const isSigned = dealStatus === '已成交' || stage === '已签单' || pipelineStage === 'signed'
  const isClosing = pipelineStage === 'hot_follow' || stage === '准备签单' || actionBucket === 'closing'
  const isQuoted = pipelineStage === 'quoted' || stage === '已报价' || actionBucket === 'key_push'
  const isProposal = pipelineStage === 'proposal' || stage === '已出图'
  const isMeasured = pipelineStage === 'measured' || stage === '已量房'
  const isContacted = pipelineStage === 'contacted' || stage === '已到店'
  const isNewLead = pipelineStage === 'new_lead' || stage === '咨询'
  const isHighRisk = riskLevel === '高风险' || includesAny(joinedText, ['高风险', '流失', '犹豫', '比价', '担心'])

  return {
    stage,
    dealStatus,
    pipelineStage,
    actionBucket,
    riskLevel,
    concern,
    joinedText,
    isSigned,
    isClosing,
    isQuoted,
    isProposal,
    isMeasured,
    isContacted,
    isNewLead,
    isHighRisk
  }
}

function getPreferredMaterialIds(profile) {
  const ids = []
  if (profile.isNewLead || profile.isContacted) {
    ids.push('mock_material_006', 'mock_material_002', 'mock_material_007')
  }
  if (profile.isMeasured || profile.isProposal) {
    ids.push('mock_material_003', 'mock_material_005', 'mock_material_008')
  }
  if (profile.isQuoted) {
    ids.push('mock_material_009', 'mock_material_001', 'mock_material_010', 'mock_material_004')
  }
  if (profile.isClosing) {
    ids.push('mock_material_011', 'mock_material_004', 'mock_material_002', 'mock_material_012')
  }
  if (profile.isSigned) {
    ids.push('mock_material_002', 'mock_material_004', 'mock_material_011')
  }
  if (profile.isHighRisk) {
    ids.push('mock_material_013', 'mock_material_001', 'mock_material_012')
  }
  if (!ids.length) {
    ids.push('mock_material_006', 'mock_material_002', 'mock_material_007')
  }
  return ids.filter((id, index) => ids.indexOf(id) === index)
}

function getMaterialStageScore(material, profile) {
  const stages = material.suitableStages || []
  let score = 0
  if (stages.indexOf(profile.stage) !== -1) score += 16
  if (profile.isNewLead && stages.indexOf('新线索') !== -1) score += 12
  if (profile.isContacted && stages.indexOf('已沟通') !== -1) score += 12
  if (profile.isMeasured && stages.indexOf('已量房') !== -1) score += 12
  if (profile.isProposal && stages.indexOf('已出方案') !== -1) score += 12
  if (profile.isQuoted && stages.indexOf('已报价') !== -1) score += 12
  if (profile.isClosing && (stages.indexOf('准备签单') !== -1 || stages.indexOf('重点跟进') !== -1)) score += 12
  if (profile.isSigned && stages.indexOf('已签约') !== -1) score += 12
  return score
}

function getConcernScore(material, profile) {
  const concernText = [
    material.concernSolved,
    material.sendScene,
    material.summary,
    (material.recommendedForConcerns || []).join(' '),
    (material.tags || []).join(' ')
  ].join(' ')
  const customerText = profile.joinedText
  let score = 0
  if (includesAny(customerText, ['报价', '价格', '预算', '贵', '比价', '增项']) &&
      includesAny(concernText, ['报价', '价格', '预算', '比价', '增项'])) score += 18
  if (includesAny(customerText, ['质量', '水电', '防水', '隐蔽', '施工']) &&
      includesAny(concernText, ['质量', '水电', '防水', '隐蔽', '施工'])) score += 18
  if (includesAny(customerText, ['售后', '质保', '负责']) &&
      includesAny(concernText, ['售后', '质保', '负责'])) score += 18
  if (includesAny(customerText, ['效果', '风格', '案例', '同小区', '落地']) &&
      includesAny(concernText, ['效果', '风格', '案例', '同小区', '落地'])) score += 18
  if (includesAny(customerText, ['进度', '透明', '没人管', '省心']) &&
      includesAny(concernText, ['进度', '透明', '没人管', '省心'])) score += 18
  return score
}

function getMaterialScore(material, profile, preferredIds) {
  const preferredIndex = preferredIds.indexOf(material.materialId)
  let score = preferredIndex === -1 ? 0 : 80 - preferredIndex * 4
  score += getMaterialStageScore(material, profile)
  score += getConcernScore(material, profile)
  if (profile.isHighRisk && includesAny([material.concernSolved, material.tags && material.tags.join(' ')].join(' '), ['风险', '增项', '口碑', '验收', '质量'])) {
    score += 12
  }
  return score
}

function getMatchPurpose(profile) {
  if (profile.isClosing) return '促成签约前最后确认'
  if (profile.isQuoted) return '解释价格差异，降低成交阻力'
  if (profile.isMeasured || profile.isProposal) return '强化专业度和方案信任'
  if (profile.isHighRisk) return '先解决顾虑，不强推成交'
  return '建立初始信任'
}

function buildRecommendationReason(material, profile) {
  const purpose = getMatchPurpose(profile)
  return `客户处于「${profile.stage}」阶段，当前重点是${purpose}，所以推荐发送「${material.title}」。`
}

function buildMatchedConcern(material, profile) {
  return safeText(material.concernSolved || profile.concern, profile.concern)
}

function buildMockSendText(material, profile) {
  const purpose = getMatchPurpose(profile)
  return `示例内容：已准备「${material.title}」，建议围绕“${purpose}”参考，不包含客户隐私信息。`
}

function enrichMaterialForCustomer(material, profile, score) {
  return Object.assign({}, material, {
    matchScore: score,
    recommendationReason: buildRecommendationReason(material, profile),
    recommendedSendScene: material.sendScene,
    matchedConcern: buildMatchedConcern(material, profile),
    mockSendText: buildMockSendText(material, profile)
  })
}

function recommendMaterialsForCustomer(customer, options = {}) {
  const profile = makeMaterialProfile(customer)
  const preferredIds = getPreferredMaterialIds(profile)
  const limit = Number(options.limit || 6)
  return trustMaterials
    .map((material) => enrichMaterialForCustomer(
      material,
      profile,
      getMaterialScore(material, profile, preferredIds)
    ))
    .filter((material) => material.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit)
}

function filterRecommendedMaterials(materials, type) {
  if (!type || type === 'all') return materials || []
  return (materials || []).filter((item) => item.type === type)
}

module.exports = {
  filterMaterials,
  filterRecommendedMaterials,
  getMaterialsByIds,
  getMaterialSummary,
  makeMaterialProfile,
  recommendMaterialsForCustomer
}
