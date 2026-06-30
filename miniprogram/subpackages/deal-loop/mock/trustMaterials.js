const materialTypes = [
  { code: 'all', label: '全部' },
  { code: 'stage_log_photo', label: '工地照片' },
  { code: 'daily_report', label: '透明日报' },
  { code: 'design_drawing', label: '设计图纸' },
  { code: 'case', label: '完工案例' },
  { code: 'warranty', label: '质保售后' }
]

const trustMaterials = [
  {
    materialId: 'mock_material_001',
    tenantId: 'tenant_shengjing_default',
    type: 'stage_log_photo',
    typeLabel: '工地照片',
    title: '水电验收现场照片',
    summary: '展示水电走线、打压记录和现场留痕，适合回应客户对隐蔽工程的担心。',
    sourceCollection: 'stage_logs',
    sourceId: '',
    projectId: '',
    stageCode: 'water_electric_acceptance',
    stageName: '水电验收',
    fileIDs: [],
    tags: ['水电', '隐蔽工程', '验收'],
    visibleScope: 'internal_sales',
    authorizationStatus: 'internal_only',
    ownerVisible: true,
    recommendedForConcerns: ['担心施工质量', '担心隐蔽工程'],
    createdAt: '2026-06-29T00:00:00+08:00'
  },
  {
    materialId: 'mock_material_002',
    tenantId: 'tenant_shengjing_default',
    type: 'daily_report',
    typeLabel: '透明日报',
    title: '业主每日进度样例',
    summary: '展示施工日报如何把当天进度、照片、明日计划同步给业主。',
    sourceCollection: 'stage_logs',
    sourceId: '',
    projectId: '',
    stageCode: 'painting',
    stageName: '油工/刮墙',
    fileIDs: [],
    tags: ['日报', '业主可见', '进度透明'],
    visibleScope: 'internal_sales',
    authorizationStatus: 'internal_only',
    ownerVisible: true,
    recommendedForConcerns: ['担心工地没人管', '想看进度'],
    createdAt: '2026-06-29T00:00:00+08:00'
  },
  {
    materialId: 'mock_material_003',
    tenantId: 'tenant_shengjing_default',
    type: 'case',
    typeLabel: '完工案例',
    title: '万硕花园 148 平意式简约',
    summary: '同小区改善型案例，适合报价后解释设计、材料和落地效果。',
    sourceCollection: 'case_authorizations',
    sourceId: '',
    projectId: '',
    stageCode: 'final_acceptance',
    stageName: '竣工验收',
    fileIDs: [],
    tags: ['万硕花园', '意式简约', '改善型'],
    visibleScope: 'internal_sales',
    authorizationStatus: 'authorized_public_mock',
    ownerVisible: true,
    recommendedForConcerns: ['想看同小区案例', '担心效果落地'],
    createdAt: '2026-06-29T00:00:00+08:00'
  },
  {
    materialId: 'mock_material_004',
    tenantId: 'tenant_shengjing_default',
    type: 'warranty',
    typeLabel: '质保售后',
    title: '竣工质保卡说明',
    summary: '说明交付后质保、售后和服务电话，适合签约前消除顾虑。',
    sourceCollection: 'warranty_cards',
    sourceId: '',
    projectId: '',
    stageCode: '',
    stageName: '售后保障',
    fileIDs: [],
    tags: ['质保', '售后', '交付'],
    visibleScope: 'internal_sales',
    authorizationStatus: 'internal_only',
    ownerVisible: false,
    recommendedForConcerns: ['担心售后', '担心没人负责'],
    createdAt: '2026-06-29T00:00:00+08:00'
  },
  {
    materialId: 'mock_material_005',
    tenantId: 'tenant_shengjing_default',
    type: 'design_drawing',
    typeLabel: '设计图纸',
    title: '交底图纸与效果图对照',
    summary: '用于展示设计方案如何落到施工交底和现场管理。',
    sourceCollection: 'design_drawings',
    sourceId: '',
    projectId: '',
    stageCode: 'start_briefing',
    stageName: '开工交底',
    fileIDs: [],
    tags: ['效果图', '施工图', '交底'],
    visibleScope: 'internal_sales',
    authorizationStatus: 'internal_only',
    ownerVisible: false,
    recommendedForConcerns: ['担心设计落不了地', '担心沟通断层'],
    createdAt: '2026-06-29T00:00:00+08:00'
  }
]

function getMaterialById(materialId) {
  return trustMaterials.find((item) => item.materialId === materialId) || null
}

module.exports = {
  materialTypes,
  trustMaterials,
  getMaterialById
}
