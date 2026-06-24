const DEFAULT_TENANT_ID = 'tenant_shengjing_default'

const defaultTenant = {
  tenantId: DEFAULT_TENANT_ID,
  tenantName: '晟景装饰',
  logoUrl: '',
  brandColor: '#1B7A56',
  contactPhone: '13935842860',
  address: '山西省交城县南环路康健装饰广场',
  businessHours: '8:30 - 18:30（周一至周日）',
  subscriptionPlan: 'trial',
  subscriptionStatus: 'active',
  maxUsers: 20,
  maxProjects: 100,
  storageLimit: 1024 * 1024 * 1024 * 5
}

module.exports = {
  DEFAULT_TENANT_ID,
  defaultTenant
}
