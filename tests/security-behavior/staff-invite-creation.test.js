const test = require('node:test')
const assert = require('node:assert/strict')

const {
  createUniqueStaffInvite,
  reserveStaffInviteCode
} = require('../../cloudfunctions/createStaffInviteCode/inviteCodeSecurity')

function createReservationStore(initialInvites = {}) {
  let queue = Promise.resolve()
  const state = { invites: Object.assign({}, initialInvites) }
  return {
    state,
    runTransaction(work) {
      const result = queue.then(() => work({
        getInviteById: async (id) => state.invites[id] && Object.assign({}, state.invites[id]),
        findInviteByCode: async (code) => Object.values(state.invites).find((item) => item.code === code) || null,
        setInviteById: async (id, data) => { state.invites[id] = Object.assign({}, data, { _id: id }) }
      }))
      queue = result.catch(() => {})
      return result
    }
  }
}

test('staff invite code reservation allows only one concurrent tenant', async () => {
  const store = createReservationStore()
  const reserve = (tenantId) => reserveStaffInviteCode({
    runTransaction: store.runTransaction,
    code: '123456',
    invite: { tenantId, role: 'worker', status: 'active' }
  })
  const results = await Promise.allSettled([reserve('tenant-a'), reserve('tenant-b')])
  assert.equal(results.filter((item) => item.status === 'fulfilled').length, 1)
  assert.equal(results.filter((item) => item.status === 'rejected' && item.reason.code === 'INVITE_CODE_COLLISION').length, 1)
  assert.equal(['tenant-a', 'tenant-b'].includes(store.state.invites['123456'].tenantId), true)
})

test('staff invite code reservation rejects a legacy record with the same code', async () => {
  const store = createReservationStore({ legacy: { _id: 'legacy', code: '123456', tenantId: 'tenant-a', status: 'used' } })
  await assert.rejects(reserveStaffInviteCode({
    runTransaction: store.runTransaction,
    code: '123456',
    invite: { tenantId: 'tenant-b', role: 'worker', status: 'active' }
  }), (error) => error.code === 'INVITE_CODE_COLLISION')
})

test('staff invite generation retries after a code collision', async () => {
  const store = createReservationStore({ legacy: { _id: 'legacy', code: '123456', tenantId: 'tenant-a', status: 'used' } })
  const codes = ['123456', '654321']
  const result = await createUniqueStaffInvite({
    makeCode: () => codes.shift(),
    invite: { tenantId: 'tenant-b', role: 'designer', status: 'active' },
    reserveCode: (code, invite) => reserveStaffInviteCode({ runTransaction: store.runTransaction, code, invite })
  })
  assert.equal(result.code, '654321')
  assert.equal(store.state.invites['654321'].tenantId, 'tenant-b')
})
