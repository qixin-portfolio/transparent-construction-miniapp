const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'

function tenantMatches(resourceTenantId, tenantId) {
  return resourceTenantId ? resourceTenantId === tenantId : tenantId === DEFAULT_TENANT_ID
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

async function assertOwnerProject(openid, user, tenantId, projectId) {
  if (!projectId) throw new Error('缺少工地 ID')
  const res = await db.collection('projects').doc(projectId).get()
  const project = res.data || null
  if (!project) throw new Error('工地不存在')
  if (!tenantMatches(project.tenantId, tenantId)) throw new Error('当前账号无权查看该工地')
  const ownerOpenids = Array.isArray(project.ownerOpenids) ? project.ownerOpenids : []
  const ownerUserIds = Array.isArray(project.ownerUserIds) ? project.ownerUserIds : []
  const ownerUserId = (user && user._id) || ''
  const matchedByOpenid = project.ownerOpenid === openid || ownerOpenids.indexOf(openid) !== -1
  const matchedByUserId = ownerUserId && (project.ownerUserId === ownerUserId || ownerUserIds.indexOf(ownerUserId) !== -1)
  if (!matchedByOpenid && !matchedByUserId) {
    throw new Error('当前账号无权查看该工地')
  }
  return project
}

async function recordWarrantyViewed(openid, user, tenantId, project, warrantyCard) {
  if (!warrantyCard) return
  try {
    await db.collection('operation_logs').add({
      data: {
        tenantId,
        tenantName: (user && user.tenantName) || project.tenantName || DEFAULT_TENANT_NAME,
        event: 'warranty_card_viewed',
        eventType: 'warranty_card_viewed',
        actorOpenid: openid,
        actorUserId: (user && user._id) || '',
        actorRole: (user && user.role) || '',
        projectId: project._id || '',
        projectName: project.name || '',
        warrantyCardId: warrantyCard._id || '',
        createdAt: db.serverDate()
      }
    })
  } catch (error) {
    // 埋点不能影响质保卡查看。
  }
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const projectId = String(event.projectId || '').trim()
    const project = await assertOwnerProject(openid, user, tenantId, projectId)
    const res = await db.collection('warranty_cards')
      .where({ tenantId: tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId, projectId })
      .orderBy('updatedAt', 'desc')
      .limit(20)
      .get()
    const ownerId = user._id || ''
    const warrantyCard = (res.data || []).find((item) => {
      if (!item.ownerOpenid && !item.ownerId && !item.ownerUserId) return true
      return item.ownerOpenid === openid || item.ownerId === ownerId || item.ownerUserId === ownerId
    }) || null
    await recordWarrantyViewed(openid, user, tenantId, project, warrantyCard)
    return { project, warrantyCard }
  } catch (error) {
    return { error: { message: error.message || '获取电子质保卡失败' } }
  }
}
