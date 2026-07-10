const crypto = require('crypto')

const ALLOWED_ROLES = ['admin', 'boss_qi', 'boss_hu']
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'

function createError(code, message) {
  const error = new Error(message || code)
  error.code = code
  return error
}

function secretsMatch(actual, expected) {
  const actualBuffer = Buffer.from(String(actual || ''))
  const expectedBuffer = Buffer.from(String(expected || ''))
  return actualBuffer.length > 0 &&
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
}

function authorizeDailySummaryInvocation({ openid, user, event = {}, cronSecret }) {
  if (openid) {
    if (!user || ALLOWED_ROLES.indexOf(user.role) === -1) {
      throw createError('FORBIDDEN', '当前账号无权查看每日汇总')
    }
    return {
      mode: 'manual',
      tenantIds: [user.tenantId || DEFAULT_TENANT_ID]
    }
  }

  if (!secretsMatch(event.cronSecret, cronSecret)) {
    throw createError('UNTRUSTED_TRIGGER', '无法验证定时任务身份')
  }
  return { mode: 'timer', tenantIds: null }
}

function shouldSendDailySummaryNotice({ tenantId, sendRequested }) {
  return sendRequested === true && tenantId === DEFAULT_TENANT_ID
}

async function runDailySummaries({ invocation, listTenantIds, loadTenantSummary }) {
  const tenantIds = invocation.mode === 'manual'
    ? invocation.tenantIds
    : await listTenantIds()
  const uniqueTenantIds = Array.from(new Set((tenantIds || []).filter(Boolean)))
  const results = []
  for (const tenantId of uniqueTenantIds) {
    results.push(await loadTenantSummary(tenantId))
  }
  return results
}

module.exports = {
  ALLOWED_ROLES,
  DEFAULT_TENANT_ID,
  authorizeDailySummaryInvocation,
  runDailySummaries,
  shouldSendDailySummaryNotice
}
