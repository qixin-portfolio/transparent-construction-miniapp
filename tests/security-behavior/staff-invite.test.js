const test = require('node:test')
const assert = require('node:assert/strict')

const {
  assertInvitableRole,
  createInviteAttemptKeys,
  createInviteCallerAttemptKey,
  recordFailedInviteAttempt,
  redeemStaffInvite,
  toTimestamp
} = require('../../cloudfunctions/bindStaffRole/inviteSecurity')

function createInviteStore(invite) {
  let queue = Promise.resolve()
  const state = { invite: Object.assign({}, invite), attempts: {}, users: {}, redemptions: 0 }
  return {
    state,
    runTransaction(work) {
      const result = queue.then(() => work({
        getInvite: async () => Object.assign({}, state.invite),
        updateInvite: async (patch) => { state.invite = Object.assign({}, state.invite, patch) },
        updateUser: async (userId, patch) => { state.users[userId] = Object.assign({}, state.users[userId], patch) },
        getAttempt: async (key) => state.attempts[key] && Object.assign({}, state.attempts[key]),
        setAttempt: async (key, patch) => { state.attempts[key] = Object.assign({}, patch) },
        clearAttempts: async (keys) => {
          keys.forEach((key) => { state.attempts[key] = { failedAttempts: 0, lockedUntil: 0 } })
        }
      }))
      queue = result.catch(() => {})
      return result
    }
  }
}

test('staff invite cannot grant a boss role', () => {
  for (const role of ['admin', 'boss', 'boss_qi', 'boss_hu', 'platform_admin', 'super_admin']) {
    assert.throws(() => assertInvitableRole(role), (error) => error.code === 'ROLE_NOT_INVITABLE')
  }
})

test('staff invite allows only one concurrent redemption', async () => {
  const store = createInviteStore({ _id: 'invite-1', code: '123456', role: 'worker', tenantId: 'tenant-a', status: 'active', expiresAt: Date.now() + 60_000 })
  const args = { runTransaction: store.runTransaction, inviteId: 'invite-1', code: '123456', openid: 'openid-a', userId: 'user-a', now: Date.now() }
  const results = await Promise.allSettled([redeemStaffInvite(args), redeemStaffInvite(args)])
  assert.equal(results.filter((item) => item.status === 'fulfilled').length, 1)
  assert.equal(results.filter((item) => item.status === 'rejected').length, 1)
})

test('staff invite failed attempts accumulate atomically', async () => {
  const store = createInviteStore({})
  const keys = createInviteAttemptKeys('openid-a', '000000')
  await Promise.all([
    recordFailedInviteAttempt({ runTransaction: store.runTransaction, attemptKeys: keys, now: 1000 }),
    recordFailedInviteAttempt({ runTransaction: store.runTransaction, attemptKeys: keys, now: 1000 })
  ])
  keys.forEach((key) => assert.equal(store.state.attempts[key].failedAttempts, 2))
})

test('staff invite blocks attempts after the threshold', async () => {
  const store = createInviteStore({})
  const keys = createInviteAttemptKeys('openid-a', '000000')
  for (let i = 0; i < 5; i += 1) {
    await recordFailedInviteAttempt({ runTransaction: store.runTransaction, attemptKeys: keys, now: 1000 })
  }
  await assert.rejects(recordFailedInviteAttempt({ runTransaction: store.runTransaction, attemptKeys: keys, now: 1001 }), (error) => error.code === 'RATE_LIMITED')
})

test('staff invite blocks a caller who rotates through different codes', async () => {
  const store = createInviteStore({})
  for (let index = 0; index < 5; index += 1) {
    const code = String(100000 + index)
    await recordFailedInviteAttempt({
      runTransaction: store.runTransaction,
      attemptKeys: createInviteAttemptKeys('openid-a', code),
      now: 1000
    })
  }
  const callerKey = createInviteCallerAttemptKey('openid-a')
  assert.equal(store.state.attempts[callerKey].failedAttempts, 5)
  await assert.rejects(recordFailedInviteAttempt({
    runTransaction: store.runTransaction,
    attemptKeys: createInviteAttemptKeys('openid-a', '200000'),
    now: 1001
  }), (error) => error.code === 'RATE_LIMITED')
})

test('staff invite rejects an expired code', async () => {
  const store = createInviteStore({ _id: 'invite-1', code: '123456', role: 'worker', tenantId: 'tenant-a', status: 'active', expiresAt: 999 })
  await assert.rejects(redeemStaffInvite({ runTransaction: store.runTransaction, inviteId: 'invite-1', code: '123456', openid: 'openid-a', userId: 'user-a', now: 1000 }), (error) => error.code === 'INVITE_EXPIRED')
})

test('staff invite accepts Date and cloud date expiration values', () => {
  assert.equal(toTimestamp(new Date(2000)), 2000)
  assert.equal(toTimestamp({ $date: { $numberLong: '3000' } }), 3000)
  assert.equal(toTimestamp({ $numberLong: '4000' }), 4000)
})

test('staff invite treats an invalid expiration value as expired', async () => {
  const store = createInviteStore({ _id: 'invite-1', code: '123456', role: 'worker', tenantId: 'tenant-a', status: 'active', expiresAt: 'invalid' })
  await assert.rejects(redeemStaffInvite({ runTransaction: store.runTransaction, inviteId: 'invite-1', code: '123456', openid: 'openid-a', userId: 'user-a', now: 1000 }), (error) => error.code === 'INVITE_EXPIRED')
})

test('staff invite rejects a revoked code', async () => {
  const store = createInviteStore({ _id: 'invite-1', code: '123456', role: 'worker', tenantId: 'tenant-a', status: 'revoked', expiresAt: 2000 })
  await assert.rejects(redeemStaffInvite({ runTransaction: store.runTransaction, inviteId: 'invite-1', code: '123456', openid: 'openid-a', userId: 'user-a', now: 1000 }), (error) => error.code === 'INVITE_NOT_ACTIVE')
})

test('staff invite tenant comes from the server invite record', async () => {
  const store = createInviteStore({ _id: 'invite-1', code: '123456', role: 'designer', tenantId: 'tenant-a', tenantName: '企业 A', status: 'active', expiresAt: 2000 })
  const result = await redeemStaffInvite({ runTransaction: store.runTransaction, inviteId: 'invite-1', code: '123456', openid: 'openid-a', userId: 'user-a', requestedTenantId: 'tenant-b', now: 1000 })
  assert.equal(result.tenantId, 'tenant-a')
  assert.equal(store.state.users['user-a'].tenantId, 'tenant-a')
})

test('staff invite redemption clears caller and code attempt counters', async () => {
  const store = createInviteStore({ _id: 'invite-1', code: '123456', role: 'worker', tenantId: 'tenant-a', status: 'active', expiresAt: 2000 })
  const attemptKeys = createInviteAttemptKeys('openid-a', '123456')
  attemptKeys.forEach((key) => { store.state.attempts[key] = { failedAttempts: 3, lockedUntil: 0 } })
  await redeemStaffInvite({ runTransaction: store.runTransaction, inviteId: 'invite-1', code: '123456', openid: 'openid-a', userId: 'user-a', now: 1000, attemptKeys })
  attemptKeys.forEach((key) => assert.equal(store.state.attempts[key].failedAttempts, 0))
})
