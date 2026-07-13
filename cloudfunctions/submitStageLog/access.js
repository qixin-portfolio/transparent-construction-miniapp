const { DEFAULT_TENANT_ID, createError, tenantMatches } = require('./stage-flow')

const ALL_PROJECT_ROLES = ['admin', 'boss_qi', 'boss_hu']

async function assertProjectAccess({ db, openid, user, projectId }) {
  if (ALL_PROJECT_ROLES.indexOf(user.role) !== -1) return
  const member = await db.collection('project_members')
    .where({ projectId, userOpenid: openid })
    .limit(1)
    .get()
  if (!member.data.length) {
    throw createError('PROJECT_ACCESS_DENIED', '当前账号不属于该工地，不能提交日报')
  }
}

function assertTenantMatch(resourceTenantId, tenantId) {
  if (!tenantMatches(resourceTenantId, tenantId)) {
    throw createError('TENANT_MISMATCH', '当前账号无权访问该企业资源')
  }
}

module.exports = {
  DEFAULT_TENANT_ID,
  ALL_PROJECT_ROLES,
  assertProjectAccess,
  assertTenantMatch,
  tenantMatches
}
