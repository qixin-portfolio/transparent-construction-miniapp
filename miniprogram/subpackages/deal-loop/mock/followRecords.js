const followRecords = [
  {
    followId: 'mock_follow_001',
    customerId: 'mock_customer_001',
    tenantId: 'tenant_shengjing_default',
    type: 'wechat',
    typeLabel: '微信',
    direction: 'outbound',
    content: '已发送报价拆解和水电验收案例。',
    customerFeedback: '客户觉得价格仍然偏高，想再和家人商量。',
    nextAction: '补发同小区案例和环保材料说明',
    nextFollowAt: '2026-07-01 10:00',
    relatedMaterialIds: ['mock_material_001', 'mock_material_003'],
    createdByRole: 'sales',
    createdByName: '胡秀芬',
    createdAt: '2026-06-29T10:30:00+08:00',
    dateText: '06月29日 10:30'
  },
  {
    followId: 'mock_follow_002',
    customerId: 'mock_customer_001',
    tenantId: 'tenant_shengjing_default',
    type: 'phone',
    typeLabel: '电话',
    direction: 'outbound',
    content: '确认客户主要纠结报价，尤其水电和柜子费用。',
    customerFeedback: '客户认可设计效果，但担心后期增项。',
    nextAction: '发送透明工地日报样例',
    nextFollowAt: '2026-06-29 18:00',
    relatedMaterialIds: ['mock_material_002'],
    createdByRole: 'boss_hu',
    createdByName: '王淑辉',
    createdAt: '2026-06-28T16:30:00+08:00',
    dateText: '06月28日 16:30'
  },
  {
    followId: 'mock_follow_003',
    customerId: 'mock_customer_003',
    tenantId: 'tenant_shengjing_default',
    type: 'store_visit',
    typeLabel: '到店',
    direction: 'inbound',
    content: '客户到店复看方案，重点问售后、质保和工期。',
    customerFeedback: '家人认可效果，还想确认签约后如何看到工地进度。',
    nextAction: '演示透明工地和质保卡',
    nextFollowAt: '2026-06-30 19:30',
    relatedMaterialIds: ['mock_material_004', 'mock_material_005'],
    createdByRole: 'boss_qi',
    createdByName: '老齐',
    createdAt: '2026-06-29T19:00:00+08:00',
    dateText: '06月29日 19:00'
  },
  {
    followId: 'mock_follow_004',
    customerId: 'mock_customer_004',
    tenantId: 'tenant_shengjing_default',
    type: 'quote',
    typeLabel: '签约',
    direction: 'outbound',
    content: '客户已确认签约，待录入工地信息。',
    customerFeedback: '希望开工后每天能看到现场进度。',
    nextAction: '生成工地创建草案',
    nextFollowAt: '2026-07-01 09:00',
    relatedMaterialIds: ['mock_material_002'],
    createdByRole: 'sales',
    createdByName: '胡秀芬',
    createdAt: '2026-06-29T17:10:00+08:00',
    dateText: '06月29日 17:10'
  }
]

function getFollowRecordsByCustomer(customerId) {
  return followRecords.filter((item) => item.customerId === customerId)
}

module.exports = {
  followRecords,
  getFollowRecordsByCustomer
}
