const test = require('node:test')
const assert = require('node:assert/strict')

const {
  authorizeDailySummaryInvocation,
  runDailySummaries,
  shouldSendDailySummaryNotice
} = require('../../cloudfunctions/dailySummary/security')

const ADMIN = { role: 'admin', tenantId: 'tenant-a' }

test('dailySummary rejects an ordinary user', () => {
  assert.throws(() => authorizeDailySummaryInvocation({
    openid: 'user-openid',
    user: { role: 'worker', tenantId: 'tenant-a' },
    event: {},
    cronSecret: 'server-secret'
  }), (error) => error.code === 'FORBIDDEN')
})

test('dailySummary manual admin cannot select another tenant', () => {
  const invocation = authorizeDailySummaryInvocation({
    openid: 'admin-openid',
    user: ADMIN,
    event: { tenantId: 'tenant-b' },
    cronSecret: 'server-secret'
  })
  assert.deepEqual(invocation, { mode: 'manual', tenantIds: ['tenant-a'] })
})

test('dailySummary accepts a valid server cron secret', () => {
  const invocation = authorizeDailySummaryInvocation({
    openid: '',
    user: null,
    event: { cronSecret: 'server-secret' },
    cronSecret: 'server-secret'
  })
  assert.deepEqual(invocation, { mode: 'timer', tenantIds: null })
})

test('dailySummary fails closed without a trusted trigger identity', () => {
  assert.throws(() => authorizeDailySummaryInvocation({
    openid: '',
    user: null,
    event: { isCron: true, source: 'timer', tenantId: 'tenant-a' },
    cronSecret: ''
  }), (error) => error.code === 'UNTRUSTED_TRIGGER')
})

test('dailySummary keeps each tenant result isolated', async () => {
  const rows = {
    'tenant-a': { pendingLogs: 2, openTasks: 3 },
    'tenant-b': { pendingLogs: 7, openTasks: 11 }
  }
  const results = await runDailySummaries({
    invocation: { mode: 'timer', tenantIds: null },
    listTenantIds: async () => ['tenant-a', 'tenant-b'],
    loadTenantSummary: async (tenantId) => Object.assign({ tenantId }, rows[tenantId])
  })
  assert.deepEqual(results, [
    { tenantId: 'tenant-a', pendingLogs: 2, openTasks: 3 },
    { tenantId: 'tenant-b', pendingLogs: 7, openTasks: 11 }
  ])
})

test('dailySummary global webhook is limited to the default tenant', () => {
  assert.equal(shouldSendDailySummaryNotice({ tenantId: 'tenant_shengjing_default', sendRequested: true }), true)
  assert.equal(shouldSendDailySummaryNotice({ tenantId: 'tenant-a', sendRequested: true }), false)
})

test('dailySummary does not send when sending is not requested', () => {
  assert.equal(shouldSendDailySummaryNotice({ tenantId: 'tenant_shengjing_default', sendRequested: false }), false)
})
