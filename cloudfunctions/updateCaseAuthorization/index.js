const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'
const SCOPES = ['private', 'internal', 'public']

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

async function assertOwnerProject(openid, tenantId, projectId) {
  const res = await db.collection('projects').doc(projectId).get()
  const project = res.data || null
  if (!project) throw new Error('工地不存在')
  if (project.tenantId && project.tenantId !== tenantId) throw new Error('当前账号无权更新授权')
  const ownerOpenids = Array.isArray(project.ownerOpenids) ? project.ownerOpenids : []
  if (project.ownerOpenid !== openid && ownerOpenids.indexOf(openid) === -1) {
    throw new Error('当前账号无权更新授权')
  }
  return project
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const tenantName = user.tenantName || DEFAULT_TENANT_NAME
    const projectId = String(event.projectId || '').trim()
    if (!projectId) throw new Error('缺少工地 ID')
    const project = await assertOwnerProject(openid, tenantId, projectId)
    const authorizationScope = SCOPES.indexOf(event.authorizationScope) !== -1 ? event.authorizationScope : 'private'
    const allowedMaterials = Array.isArray(event.allowedMaterials) ? event.allowedMaterials : []
    const ownerNameDisplay = String(event.ownerNameDisplay || 'anonymous').trim()
    const now = db.serverDate()
    const where = { tenantId: _.in([tenantId, '', null]), projectId, ownerOpenid: openid }
    const existing = await db.collection('case_authorizations').where(where).limit(1).get()
    const data = {
      tenantId,
      tenantName,
      projectId,
      projectName: project.name || '',
      ownerId: user._id || '',
      ownerOpenid: openid,
      authorizationScope,
      allowedMaterials,
      ownerNameDisplay,
      status: authorizationScope === 'private' ? 'revoked' : 'approved',
      authorizedAt: authorizationScope === 'private' ? null : now,
      revokedAt: authorizationScope === 'private' ? now : null,
      updatedAt: now
    }

    if (existing.data.length) {
      await db.collection('case_authorizations').doc(existing.data[0]._id).update({ data })
      return { id: existing.data[0]._id }
    }

    const res = await db.collection('case_authorizations').add({
      data: Object.assign({}, data, { createdAt: now })
    })
    return { id: res._id }
  } catch (error) {
    return { error: { message: error.message || '更新案例授权失败' } }
  }
}
