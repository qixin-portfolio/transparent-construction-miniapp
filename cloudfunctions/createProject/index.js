const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const PROJECT_CREATE_ROLES = ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales']
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'
const PROJECT_STATUS_CODES = ['pending_start', 'in_progress', 'completed', 'delivered', 'after_sales', 'paused', 'cancelled']
const PROJECT_STATUS_BY_TEXT = {
  '待开工': 'pending_start',
  '施工中': 'in_progress',
  '已完工': 'completed',
  '完工': 'completed',
  '已竣工': 'completed',
  '竣工验收': 'completed',
  '已交付': 'delivered',
  '售后中': 'after_sales',
  '暂停中': 'paused',
  '已取消': 'cancelled'
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

function assertRole(user, roles) {
  if (!user || roles.indexOf(user.role) === -1) {
    throw new Error('当前账号没有新建工地的权限')
  }
}

function getProjectStatusCode(status, statusCode) {
  const normalizedCode = String(statusCode || '').trim()
  if (PROJECT_STATUS_CODES.indexOf(normalizedCode) !== -1) return normalizedCode
  return PROJECT_STATUS_BY_TEXT[String(status || '').trim()] || 'in_progress'
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    assertRole(user, PROJECT_CREATE_ROLES)
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const tenantName = user.tenantName || DEFAULT_TENANT_NAME

    const name = String(event.name || '').trim()
    const address = String(event.address || '').trim()
    if (!name) throw new Error('工地名称不能为空')

    const now = db.serverDate()
    const status = String(event.status || '施工中').trim()
    const project = {
      name,
      tenantId,
      tenantName,
      customerId: String(event.customerId || '').trim(),
      customerName: String(event.customerName || '').trim(),
      address,
      ownerOpenid: String(event.ownerOpenid || '').trim(),
      currentStage: '开工交底',
      progress: 10,
      status,
      statusCode: getProjectStatusCode(status, event.statusCode),
      createdByOpenid: openid,
      createdBy: user._id || openid,
      updatedByOpenid: openid,
      updatedBy: user._id || openid,
      createdAt: now,
      updatedAt: now
    }

    const res = await db.collection('projects').add({ data: project })
    await db.collection('project_members').add({
      data: {
        projectId: res._id,
        tenantId,
        tenantName,
        userOpenid: openid,
        userId: user._id || '',
        role: user.role,
        createdAt: now,
        updatedAt: now
      }
    })

    return { id: res._id }
  } catch (error) {
    return {
      error: {
        message: error.message || '新建工地失败'
      }
    }
  }
}
