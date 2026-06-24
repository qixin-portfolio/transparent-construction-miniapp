const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'
const ADMIN_ROLES = ['admin', 'boss_qi', 'boss_hu']

const DEFAULT_BRANDING = {
  tenantId: DEFAULT_TENANT_ID,
  tenantName: DEFAULT_TENANT_NAME,
  logoUrl: '',
  brandColor: '#1B7A56',
  contactPhone: '13935842860',
  address: '山西省交城县南环路康健装饰广场',
  businessHours: '8:30 - 18:30（周一至周日）',
  slogan: '交城 28 年本土硬核金牌老品牌',
  tags: ['高定全案整装', '私宅空间定制', '全德系工程工艺'],
  updatedAt: null
}

const DEFAULT_LIMITS = {
  tenantId: DEFAULT_TENANT_ID,
  subscriptionPlan: 'trial',
  subscriptionStatus: 'active',
  maxUsers: 20,
  maxProjects: 100,
  storageLimit: 1024 * 1024 * 1024 * 5,
  aiQuota: 300,
  expiredAt: null
}

const ROLE_SEEDS = [
  { code: 'tenant_owner', label: '装修公司老板', legacyRoles: ['boss_qi', 'boss_hu'] },
  { code: 'company_admin', label: '公司管理员', legacyRoles: ['admin'] },
  { code: 'sales', label: '销售', legacyRoles: ['sales'] },
  { code: 'designer', label: '设计师', legacyRoles: ['designer'] },
  { code: 'project_manager', label: '项目经理', legacyRoles: ['project_manager'] },
  { code: 'foreman', label: '工长', legacyRoles: ['worker'] },
  { code: 'owner', label: '业主', legacyRoles: ['owner'] }
]

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

async function upsertById(collectionName, id, data) {
  const ref = db.collection(collectionName).doc(id)
  try {
    await ref.get()
    await ref.update({ data })
    return 'updated'
  } catch (error) {
    await ref.set({ data })
    return 'created'
  }
}

async function seedRole(role, now) {
  const id = `${DEFAULT_TENANT_ID}_${role.code}`
  return upsertById('roles', id, Object.assign({}, role, {
    tenantId: DEFAULT_TENANT_ID,
    status: 'active',
    updatedAt: now
  }))
}

exports.main = async () => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    if (ADMIN_ROLES.indexOf(user.role) === -1) {
      throw new Error('仅管理员可初始化 SaaS 配置')
    }

    const now = db.serverDate()
    const results = {}

    results.tenant = await upsertById('tenants', DEFAULT_TENANT_ID, {
      tenantId: DEFAULT_TENANT_ID,
      tenantName: DEFAULT_TENANT_NAME,
      status: 'active',
      createdByOpenid: openid,
      updatedAt: now
    })

    results.branding = await upsertById('tenant_branding', DEFAULT_TENANT_ID, Object.assign({}, DEFAULT_BRANDING, {
      updatedAt: now
    }))

    results.settings = await upsertById('tenant_settings', DEFAULT_TENANT_ID, {
      tenantId: DEFAULT_TENANT_ID,
      tenantName: DEFAULT_TENANT_NAME,
      defaultStageTemplate: 'shengjing_default',
      ownerMaxBindings: 2,
      updatedAt: now
    })

    results.subscription = await upsertById('subscriptions', DEFAULT_TENANT_ID, Object.assign({}, DEFAULT_LIMITS, {
      updatedAt: now
    }))

    const existingTenantUser = await db.collection('tenant_users')
      .where({ tenantId: DEFAULT_TENANT_ID, userId: user._id })
      .limit(1)
      .get()
    if (!existingTenantUser.data.length) {
      await db.collection('tenant_users').add({
        data: {
          tenantId: DEFAULT_TENANT_ID,
          tenantName: DEFAULT_TENANT_NAME,
          userId: user._id,
          openid,
          role: user.role,
          status: 'active',
          createdAt: now,
          updatedAt: now
        }
      })
      results.tenantUser = 'created'
    } else {
      await db.collection('tenant_users').doc(existingTenantUser.data[0]._id).update({
        data: { role: user.role, status: 'active', updatedAt: now }
      })
      results.tenantUser = 'updated'
    }

    await db.collection('users').doc(user._id).update({
      data: {
        tenantId: DEFAULT_TENANT_ID,
        tenantName: DEFAULT_TENANT_NAME,
        updatedAt: now
      }
    })

    results.roles = await Promise.all(ROLE_SEEDS.map((role) => seedRole(role, now)))

    // 给默认租户旧数据补 tenantId。限制批量规模，避免一次初始化超时。
    const coreCollections = [
      'customers',
      'projects',
      'project_members',
      'stage_logs',
      'photos',
      'owner_bind_codes',
      'worker_project_bind_codes',
      'staff_invite_codes',
      'design_drawings',
      'notifications',
      'warranty_cards',
      'after_sales_tickets',
      'after_sales_ticket_logs',
      'owner_supplements',
      'case_authorizations',
      'operation_logs'
    ]
    results.backfill = {}
    for (const collectionName of coreCollections) {
      try {
        const res = await db.collection(collectionName)
          .where({ tenantId: _.in(['', null]) })
          .limit(100)
          .get()
        const items = res.data || []
        await Promise.all(items.map((item) => db.collection(collectionName).doc(item._id).update({
          data: {
            tenantId: DEFAULT_TENANT_ID,
            tenantName: DEFAULT_TENANT_NAME,
            updatedAt: now
          }
        })))
        results.backfill[collectionName] = items.length
      } catch (error) {
        results.backfill[collectionName] = {
          skipped: true,
          message: error.message || '集合补齐失败'
        }
      }
    }

    return { ok: true, tenantId: DEFAULT_TENANT_ID, results }
  } catch (error) {
    return {
      error: {
        message: error.message || '初始化 SaaS 配置失败'
      }
    }
  }
}
