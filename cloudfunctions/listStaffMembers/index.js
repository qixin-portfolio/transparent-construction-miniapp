const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const MANAGE_ROLES = ['admin', 'boss_qi', 'boss_hu']
const INTERNAL_ROLES = ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales', 'project_manager', 'worker']
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'

const ROLE_LABELS = {
  admin: '管理员',
  boss_qi: '老板（老齐）',
  boss_hu: '老板（老胡）',
  designer: '设计师',
  sales: '销售',
  project_manager: '项目经理',
  worker: '工长',
  owner: '业主'
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

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    if (MANAGE_ROLES.indexOf(user.role) === -1) {
      throw new Error('仅管理员可查看员工列表')
    }

    const scope = String(event.scope || 'internal').trim() // internal=内部员工 / all=全部用户
    const tenantId = user.tenantId || DEFAULT_TENANT_ID

    let where = { tenantId: tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId }
    if (scope === 'internal') {
      where.role = _.in(INTERNAL_ROLES)
    }

    const res = await db.collection('users')
      .where(where)
      .orderBy('createdAt', 'asc')
      .limit(200)
      .get()

    const items = res.data.map((item) => ({
      _id: item._id,
      name: item.name || '',
      staffRemark: item.staffRemark || '',
      displayName: item.staffRemark || item.name || '',
      phone: item.phone || '',
      openid: item.openid || '',
      role: item.role || 'owner',
      roleLabel: ROLE_LABELS[item.role] || item.role || '业主',
      status: item.status || 'active',
      activatedAt: item.activatedAt || null,
      createdAt: item.createdAt,
      isSelf: item.openid === openid,
      canEdit: user.role === 'admin' && item.role !== 'admin',
      canDelete: user.role === 'admin' && item.role !== 'admin' && item.openid !== openid
    }))

    return { items }
  } catch (error) {
    return {
      error: {
        message: error.message || '获取员工列表失败'
      }
    }
  }
}
