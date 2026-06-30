const { getPipelineStage, getPipelineLabel, getRiskClass } = require('./pipelineStatus')

function safeText(value, fallback = '未填写') {
  const text = String(value || '').trim()
  return text || fallback
}

function pickFirst(values, fallback = '') {
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim()
    }
  }
  return fallback
}

function getHouseInfo(customer) {
  const houseInfo = customer && customer.houseInfo
  if (houseInfo && typeof houseInfo === 'object') return houseInfo
  return {}
}

function maskAddress(address) {
  const text = String(address || '').trim()
  if (!text) return ''
  return text
    .replace(/\d+[-栋幢单元楼层室号]+/g, '')
    .replace(/[A-Za-z0-9]{2,}[-A-Za-z0-9]*/g, '')
    .replace(/\s+/g, '')
    .slice(0, 12)
}

function normalizeCommunity(customer) {
  const houseInfo = getHouseInfo(customer)
  return pickFirst([
    customer && customer.community,
    customer && customer.communityName,
    houseInfo.community,
    maskAddress(customer && customer.address)
  ], '小区待确认')
}

function normalizeArea(customer) {
  const houseInfo = getHouseInfo(customer)
  return pickFirst([
    customer && customer.area,
    houseInfo.area
  ], '面积待确认')
}

function normalizeStyle(customer) {
  const houseInfo = getHouseInfo(customer)
  return pickFirst([
    customer && customer.style,
    customer && customer.stylePreference,
    houseInfo.style
  ], '风格待确认')
}

function normalizeBudget(customer) {
  return pickFirst([
    customer && customer.budgetRange,
    customer && customer.budget,
    customer && customer.expectedBudget
  ], '预算待确认')
}

function getActionProfile(customer, pipelineStage) {
  const dealStatus = safeText(customer && customer.dealStatus, '未成交')
  const need = safeText(customer && customer.need, '')

  if (dealStatus === '已流失' || pipelineStage === 'lost') {
    return {
      actionBucket: 'new_lead',
      actionBucketLabel: '复盘线索',
      todayAction: '复盘流失原因，判断是否适合后续唤醒',
      recommendedMaterial: '暂不推荐发送素材',
      suggestedTalk: '先记录客户拒绝点，不做强推。',
      riskLevel: '高风险',
      riskReasons: ['客户已流失或失去响应'],
      isTodayFollow: false,
      isClosingMoment: false,
      actionPriority: 0
    }
  }

  if (dealStatus === '已成交' || pipelineStage === 'signed') {
    return {
      actionBucket: 'signed_transfer',
      actionBucketLabel: '签约转工地',
      todayAction: '核对客户资料，准备工地创建草案',
      recommendedMaterial: '透明工地开工说明',
      suggestedTalk: '告诉客户签约后会进入透明工地，施工进度和照片会持续留痕。',
      riskLevel: '低风险',
      riskReasons: ['已成交，重点是转工地交接'],
      isTodayFollow: true,
      isClosingMoment: false,
      actionPriority: 2
    }
  }

  if (pipelineStage === 'hot_follow') {
    return {
      actionBucket: 'closing',
      actionBucketLabel: '临门一脚',
      todayAction: '确认签约顾虑，发送售后和工地管理证据',
      recommendedMaterial: '透明日报样例 / 质保售后说明',
      suggestedTalk: '先讲清楚售后和工地管理，再推进合同确认。',
      riskLevel: '高风险',
      riskReasons: ['接近签约，决策窗口短'],
      isTodayFollow: true,
      isClosingMoment: true,
      actionPriority: 4
    }
  }

  if (pipelineStage === 'quoted' || pipelineStage === 'proposal') {
    return {
      actionBucket: 'key_push',
      actionBucketLabel: '重点推进',
      todayAction: '解释方案报价差异，补充同类案例和施工证据',
      recommendedMaterial: '同小区案例 / 水电验收照片',
      suggestedTalk: need ? `围绕“${need}”拆解方案价值。` : '先确认客户最在意预算、效果还是工地管理。',
      riskLevel: '中风险',
      riskReasons: ['已进入方案报价阶段，需要及时跟进'],
      isTodayFollow: true,
      isClosingMoment: false,
      actionPriority: 3
    }
  }

  if (pipelineStage === 'measured' || pipelineStage === 'contacted') {
    return {
      actionBucket: 'today',
      actionBucketLabel: '今日跟进',
      todayAction: '推进到店、量房或方案沟通的下一步',
      recommendedMaterial: '同风格案例 / 设计交底说明',
      suggestedTalk: '把下一次沟通能看到什么讲具体，降低客户等待焦虑。',
      riskLevel: '低风险',
      riskReasons: ['需要建立方案信任'],
      isTodayFollow: true,
      isClosingMoment: false,
      actionPriority: 1
    }
  }

  return {
    actionBucket: 'new_lead',
    actionBucketLabel: '新线索',
    todayAction: '首次确认需求、预算和到店/量房时间',
    recommendedMaterial: '透明日报样例',
    suggestedTalk: '先问清楚客户最担心什么，再选择对应信任素材。',
    riskLevel: '低风险',
    riskReasons: ['尚未建立完整信任'],
    isTodayFollow: true,
    isClosingMoment: false,
    actionPriority: 1
  }
}

function mapCustomerToPipelineCard(customer) {
  const source = customer || {}
  const id = String(source._id || source.id || source.customerId || '').trim()
  const stage = safeText(source.stage, '咨询')
  const dealStatus = safeText(source.dealStatus, '未成交')
  const pipelineStage = getPipelineStage({
    stage,
    dealStatus,
    lifecycleStatus: source.lifecycleStatus
  })
  const action = getActionProfile(source, pipelineStage)
  const riskLevel = source.riskLevel || action.riskLevel
  const riskReasons = Array.isArray(source.riskReasons) && source.riskReasons.length
    ? source.riskReasons
    : action.riskReasons

  return Object.assign({}, action, {
    id,
    customerId: id,
    v1CustomerId: id,
    tenantId: source.tenantId || '',
    name: safeText(source.name || source.customerName, '未命名客户'),
    source: safeText(source.source, '来源待确认'),
    community: normalizeCommunity(source),
    area: normalizeArea(source),
    stylePreference: normalizeStyle(source),
    budgetRange: normalizeBudget(source),
    need: safeText(source.need, ''),
    stage,
    dealStatus,
    lifecycleStatus: source.lifecycleStatus || '',
    pipelineStage,
    pipelineLabel: getPipelineLabel(pipelineStage),
    riskLevel,
    riskClass: getRiskClass(riskLevel),
    riskReasons,
    primaryRiskReason: riskReasons[0] || '暂无风险备注',
    recommendedMaterialIds: [],
    linkedProjectId: '',
    ownerUserId: '',
    tags: ['真实客户数据', getPipelineLabel(pipelineStage)],
    createdAt: source.createdAt || '',
    updatedAt: source.updatedAt || ''
  })
}

function mapCustomerListToPipelineCards(customers) {
  if (!Array.isArray(customers)) return []
  return customers
    .filter((customer) => customer && (customer._id || customer.id || customer.customerId))
    .map(mapCustomerToPipelineCard)
}

module.exports = {
  mapCustomerToPipelineCard,
  mapCustomerListToPipelineCards
}
