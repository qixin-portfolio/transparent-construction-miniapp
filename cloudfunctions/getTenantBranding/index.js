const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'

const FALLBACK_BRANDING = {
  tenantId: DEFAULT_TENANT_ID,
  tenantName: DEFAULT_TENANT_NAME,
  logoUrl: '',
  brandColor: '#1B7A56',
  contactPhone: '13935842860',
  address: '山西省交城县南环路康健装饰广场',
  businessHours: '8:30 - 18:30（周一至周日）',
  slogan: '交城 28 年本土硬核金牌老品牌',
  tags: ['高定全案整装', '私宅空间定制', '全德系工程工艺'],
  subscriptionPlan: 'trial',
  subscriptionStatus: 'active',
  maxUsers: 20,
  maxProjects: 100
}

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  const user = res.data[0] || null
  if (user && !user.tenantId) {
    user.tenantId = DEFAULT_TENANT_ID
    user.tenantName = DEFAULT_TENANT_NAME
  }
  return { openid: OPENID, user }
}

async function getOptionalDoc(collectionName, id) {
  try {
    const res = await db.collection(collectionName).doc(id).get()
    return res.data || null
  } catch (error) {
    return null
  }
}

exports.main = async () => {
  try {
    const { user } = await getCurrentUser()
    const tenantId = (user && user.tenantId) || DEFAULT_TENANT_ID

    const tenant = await getOptionalDoc('tenants', tenantId)
    const branding = await getOptionalDoc('tenant_branding', tenantId)
    const subscription = await getOptionalDoc('subscriptions', tenantId)

    return {
      branding: Object.assign({}, FALLBACK_BRANDING, tenant || {}, branding || {}, subscription || {}, {
        tenantId,
        tenantName: (branding && branding.tenantName) || (tenant && tenant.tenantName) || FALLBACK_BRANDING.tenantName
      })
    }
  } catch (error) {
    return {
      branding: FALLBACK_BRANDING,
      error: {
        message: error.message || '获取品牌配置失败'
      }
    }
  }
}
