const caseAssets = [
  {
    caseAssetId: 'mock_case_asset_001',
    tenantId: 'tenant_shengjing_default',
    projectId: '',
    customerId: 'mock_customer_001',
    title: '万硕花园 148 平意式简约',
    community: '万硕花园',
    area: '148平',
    layout: '四室两厅两卫',
    style: '意式简约',
    projectStatusCode: 'delivered',
    materialIds: ['mock_material_001', 'mock_material_003'],
    authorizationStatus: 'pending',
    authorizationLabel: '待确认授权',
    privacyFlags: ['隐藏业主姓名', '隐藏精确门牌号'],
    contentDrafts: [
      {
        target: 'sales_wechat',
        title: '发给报价后客户',
        body: '这个案例和您家面积接近，可以重点看水电验收、柜体收纳和最后落地效果。',
        status: 'draft'
      },
      {
        target: 'xiaohongshu',
        title: '交城 148 平意式简约，预算透明比低价更重要',
        body: 'mock 文案草案：先讲客户担心，再讲透明报价和工地留痕。',
        status: 'draft'
      }
    ],
    publishTargets: ['sales_wechat', 'xiaohongshu', 'douyin', 'geo_site'],
    createdAt: '2026-06-29T00:00:00+08:00'
  },
  {
    caseAssetId: 'mock_case_asset_002',
    tenantId: 'tenant_shengjing_default',
    projectId: '',
    customerId: 'mock_customer_003',
    title: '公园里 128 平现代简约',
    community: '公园里',
    area: '128平',
    layout: '三室两厅',
    style: '现代简约',
    projectStatusCode: 'completed',
    materialIds: ['mock_material_002', 'mock_material_004'],
    authorizationStatus: 'internal_only',
    authorizationLabel: '仅内部使用',
    privacyFlags: ['隐藏业主姓名', '不展示预算'],
    contentDrafts: [
      {
        target: 'sales_wechat',
        title: '发给关注售后的客户',
        body: '可以重点展示透明日报、质保卡和交付后服务流程。',
        status: 'draft'
      }
    ],
    publishTargets: ['sales_wechat'],
    createdAt: '2026-06-29T00:00:00+08:00'
  }
]

function getCaseAssetById(caseAssetId) {
  return caseAssets.find((item) => item.caseAssetId === caseAssetId) || caseAssets[0]
}

module.exports = {
  caseAssets,
  getCaseAssetById
}
