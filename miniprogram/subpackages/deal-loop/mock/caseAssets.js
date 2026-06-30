const DEFAULT_MATERIAL_IDS = [
  'mock_material_002',
  'mock_material_001',
  'mock_material_010',
  'mock_material_008',
  'mock_material_004',
  'mock_material_012',
  'mock_material_003'
]

const DEFAULT_MATERIAL_CHECKLIST = [
  '透明日报样例',
  '水电验收说明',
  '防水验收说明',
  '工艺节点说明',
  '质保说明',
  '老客户评价',
  '同户型案例草案'
]

function safeText(value, fallback = '待确认') {
  const text = String(value || '').trim()
  return text || fallback
}

function sanitizePublicText(value, fallback = '待确认') {
  return safeText(value, fallback)
    .replace(/\d{3}\s*\d{4}\s*\d{4}/g, '手机号已脱敏')
    .replace(/openid[:：]?[A-Za-z0-9_-]+/gi, 'openid已脱敏')
    .replace(/身份证[:：]?[0-9A-Za-z]+/g, '身份证信息已脱敏')
    .replace(/\d+[-栋幢单元楼层室号]+/g, '')
    .replace(/[A-Za-z0-9_-]{12,}/g, '敏感编号已脱敏')
    .slice(0, 80)
}

function getCustomerId(customer) {
  const source = customer || {}
  return String(source.customerId || source.id || source._id || '').trim()
}

function normalizeAreaLabel(area) {
  const text = safeText(area, '户型面积待确认')
  if (text.indexOf('平') >= 0 || text.indexOf('㎡') >= 0 || text.indexOf('旧房') >= 0) return text
  return `${text}㎡`
}

function makeXiaohongshuTitles(customer) {
  const area = normalizeAreaLabel(customer.area)
  const style = safeText(customer.stylePreference || customer.style, '现代简约')
  return [
    `太原${style}装修，从报价到工地透明管理怎么做？`,
    `${area}${style}装修，为什么签约前一定要看工地过程？`,
    `${style}装修别只看效果图，工地过程透明才更安心`
  ]
}

function makeDouyinTopics(customer) {
  const concern = sanitizePublicText(customer.concern || customer.need, '施工过程看不见')
  return [
    '业主最担心的不是贵，而是看不见施工过程',
    '签约前给客户看什么，能减少犹豫？',
    `客户担心“${concern}”时，透明工地该怎么讲`
  ]
}

function makeWebsiteSummary(customer) {
  const community = safeText(customer.community, '本地小区')
  const area = normalizeAreaLabel(customer.area)
  const style = safeText(customer.stylePreference || customer.style, '风格待确认')
  const budget = safeText(customer.budgetRange || customer.budget, '预算待确认')
  const need = sanitizePublicText(customer.need, '需求待补充')
  return `${community}${area}${style}装修案例草案，预算段为${budget}。内容重点围绕“${need}”，用透明工地、节点留痕和售后说明降低签约前顾虑，适合沉淀为官网案例与 GEO 素材。`
}

function makeGeoQaMaterials(customer) {
  const style = safeText(customer.stylePreference || customer.style, '装修')
  return [
    {
      question: '装修公司怎么让业主放心施工进度？',
      answer: '可以用透明日报、节点验收说明和工地过程留痕，把当天进展、明日计划和关键照片讲清楚。'
    },
    {
      question: '为什么装修前要看真实工地过程？',
      answer: `看工地过程能判断${style}方案是否真的落地，也能提前了解水电、防水、工艺节点和售后保障。`
    },
    {
      question: '签约前装修公司应该给客户看哪些材料？',
      answer: '建议看报价解释、透明日报样例、水电和防水验收说明、质保说明、老客户评价与同户型案例草案。'
    }
  ]
}

function buildContentDrafts(customer, titles, topics, geoQaMaterials) {
  const community = safeText(customer.community, '本地小区')
  const area = normalizeAreaLabel(customer.area)
  const style = safeText(customer.stylePreference || customer.style, '风格待确认')
  return [
    {
      target: '小红书',
      title: titles[0],
      body: `${community}${area}${style}装修案例草案：先讲客户签约前的顾虑，再展示透明报价、节点留痕和工地管理方式。`,
      status: 'mock_draft'
    },
    {
      target: '抖音',
      title: topics[0],
      body: '短视频结构草案：开头说客户担心点，中段展示透明日报和验收节点，结尾提示签约前先看工地过程。',
      status: 'mock_draft'
    },
    {
      target: 'GEO 问答',
      title: geoQaMaterials[0].question,
      body: geoQaMaterials.map((item) => `问：${item.question}\n答：${item.answer}`).join('\n\n'),
      status: 'mock_draft'
    }
  ]
}

function buildCaseAssetDraftFromCustomer(customer) {
  const source = customer || {}
  const customerId = getCustomerId(source)
  const name = safeText(source.name || source.customerName, 'Mock 案例演示客户')
  const community = safeText(source.community, '本地小区')
  const area = normalizeAreaLabel(source.area)
  const style = safeText(source.stylePreference || source.style, '风格待确认')
  const titles = makeXiaohongshuTitles(source)
  const topics = makeDouyinTopics(source)
  const geoQaMaterials = makeGeoQaMaterials(source)
  const websiteSummary = makeWebsiteSummary(source)

  return {
    caseAssetId: customerId ? `mock_case_asset_${customerId}` : 'mock_case_asset_demo',
    tenantId: source.tenantId || 'tenant_shengjing_default',
    projectId: '',
    customerId,
    customerName: name,
    customerStage: safeText(source.stage, '阶段待确认'),
    dealStatus: safeText(source.dealStatus, '成交状态待确认'),
    title: `${community} ${area} ${style}案例资产草案`,
    community,
    area,
    layout: safeText(source.layout, '户型待确认'),
    style,
    budgetRange: safeText(source.budgetRange || source.budget, '预算待确认'),
    source: safeText(source.source, '来源待确认'),
    needSummary: sanitizePublicText(source.need, '需求待补充'),
    concernSummary: sanitizePublicText(source.concern || source.primaryRiskReason || source.need, '顾虑待补充'),
    projectStatusCode: 'mock_case_draft_only',
    materialIds: DEFAULT_MATERIAL_IDS,
    authorizationStatus: 'mock_not_started',
    authorizationLabel: '未进入真实授权流程',
    authorizationHint: '当前不读取 case_authorizations，不生成真实公开案例。',
    privacyFlags: ['不展示完整手机号', '不展示 openid', '不展示详细门牌号', '不展示内部敏感备注'],
    xiaohongshuTitles: titles,
    xiaohongshuTitle: titles[0],
    douyinTopics: topics,
    douyinTopic: topics[0],
    websiteSummary,
    geoQaMaterials,
    geoQaMaterial: geoQaMaterials.map((item) => `问：${item.question} 答：${item.answer}`).join('\n'),
    materialChecklist: DEFAULT_MATERIAL_CHECKLIST,
    contentDrafts: buildContentDrafts(source, titles, topics, geoQaMaterials),
    publishTargets: [],
    safetyNote: '当前仅为 mock 案例资产草案，不读取真实照片/日报，不自动发布，不修改 case_authorizations。',
    createdAt: '2026-06-30T00:00:00+08:00'
  }
}

const caseAssets = [
  buildCaseAssetDraftFromCustomer({
    customerId: 'mock_customer_001',
    tenantId: 'tenant_shengjing_default',
    name: 'Mock 演示客户',
    source: '老客户推荐',
    community: '万硕花园',
    area: '148平',
    layout: '四室两厅两卫',
    budgetRange: '15-18万',
    stylePreference: '意式简约',
    need: '环保、收纳、预算透明',
    concern: '担心报价差异和隐蔽工程',
    stage: '已报价',
    dealStatus: '未成交'
  }),
  buildCaseAssetDraftFromCustomer({
    customerId: 'mock_customer_003',
    tenantId: 'tenant_shengjing_default',
    name: 'Mock 签约前客户',
    source: '门店到访',
    community: '公园里',
    area: '128平',
    layout: '三室两厅',
    budgetRange: '10-12万',
    stylePreference: '现代简约',
    need: '省心、少增项、售后有保障',
    concern: '担心售后和工地管理',
    stage: '准备签单',
    dealStatus: '未成交'
  })
]

function getCaseAssetById(caseAssetId) {
  const id = String(caseAssetId || '').trim()
  if (!id) return caseAssets[0]
  return caseAssets.find((item) => item.caseAssetId === id) || caseAssets[0]
}

module.exports = {
  caseAssets,
  getCaseAssetById,
  buildCaseAssetDraftFromCustomer
}
