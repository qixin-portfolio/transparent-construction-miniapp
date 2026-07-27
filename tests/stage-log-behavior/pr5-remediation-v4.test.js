const test = require('node:test')
const assert = require('node:assert/strict')

const { createStageLog, createSubmissionRequestContext } = require('../../cloudfunctions/submitStageLog/submitService')
const { reviewStageLog } = require('../../cloudfunctions/reviewStageLog/reviewService')
const { buildSubmissionIdempotencyKey } = require('../../cloudfunctions/submitStageLog/guards')
const { createCommand } = require('./fake-db')
const { TransactionModelDb } = require('./transaction-model')

const REQUEST_NOW = new Date('2026-07-27T15:59:59.999Z')

function baseSeed(overrides = {}) {
  return Object.assign({
    projects: {
      p1: { _id: 'p1', tenantId: 't1', name: '测试工地', currentStage: '木工/吊顶', currentStageCode: 'carpentry_ceiling', progress: 65 }
    },
    stage_logs: {},
    photos: {},
    stage_log_submission_keys: {}
  }, overrides)
}

function submitOptions(overrides = {}) {
  const db = overrides.db || new TransactionModelDb(baseSeed())
  let notices = 0
  return Object.assign({
    db,
    _: createCommand(),
    event: { projectId: 'p1', workContent: '今日施工记录' },
    user: { _id: 'u1', role: 'worker', name: '测试工长' },
    openid: 'openid_worker',
    tenantId: 't1',
    tenantName: '测试租户',
    now: 'SERVER_NOW',
    requestNow: REQUEST_NOW,
    sendOwnerNotice: async () => { notices += 1 },
    sendWecomMarkdown: async () => { notices += 1 },
    getNotices: () => notices
  }, overrides)
}

function keyIdFor(options) {
  return buildSubmissionIdempotencyKey({
    tenantId: options.tenantId,
    projectId: 'p1',
    stageCode: 'carpentry_ceiling',
    openid: options.openid,
    userId: options.user._id,
    businessDate: createSubmissionRequestContext(options.requestNow).businessDate
  })
}

function currentSlot(options, overrides = {}) {
  const businessDate = createSubmissionRequestContext(options.requestNow).businessDate
  const keyId = keyIdFor(options)
  const log = Object.assign({
    _id: 'log1',
    tenantId: 't1',
    projectId: 'p1',
    stage: '木工/吊顶',
    stageCode: 'carpentry_ceiling',
    submittedBy: 'u1',
    businessDate,
    submissionKeyId: keyId,
    submissionAttemptNo: 1,
    reviewStatus: 'rejected',
    ownerVisible: false,
    createdAt: REQUEST_NOW
  }, overrides.log)
  const key = Object.assign({
    _id: keyId,
    tenantId: 't1',
    projectId: 'p1',
    stageCode: 'carpentry_ceiling',
    submitterId: 'u1',
    businessDate,
    currentStageLogId: 'log1',
    currentStatus: 'rejected',
    attemptNo: 1
  }, overrides.key)
  return { keyId, log, key }
}

function rejectSubmitWithZeroWrites(name, mutate) {
  test(`submit rejects synchronized invalid slot values: ${name}`, async () => {
    const options = submitOptions()
    const slot = currentSlot(options)
    mutate(slot)
    options.db = new TransactionModelDb(baseSeed({
      stage_logs: { log1: slot.log },
      stage_log_submission_keys: { [slot.keyId]: slot.key }
    }))
    await assert.rejects(() => createStageLog(options), (error) => error.code === 'SUBMISSION_STATE_INCONSISTENT')
    assert.equal(Object.keys(options.db.data.stage_logs).length, 1)
    assert.equal(Object.keys(options.db.data.stage_log_submission_keys).length, 1)
    assert.equal(options.db.data.projects.p1.progress, 65)
    assert.equal(options.getNotices(), 0)
  })
}

function rejectReviewWithZeroWrites(name, mutate) {
  test(`review rejects synchronized invalid slot values: ${name}`, async () => {
    const options = submitOptions()
    const slot = currentSlot(options, { log: { reviewStatus: 'pending' }, key: { currentStatus: 'pending' } })
    mutate(slot)
    options.db = new TransactionModelDb(baseSeed({
      stage_logs: { log1: slot.log },
      photos: { photo1: { _id: 'photo1', tenantId: 't1', stageLogId: 'log1', ownerVisible: false } },
      stage_log_submission_keys: { [slot.keyId]: slot.key }
    }))
    const before = JSON.parse(JSON.stringify(options.db.data))
    await assert.rejects(() => reviewStageLog(Object.assign(options, {
      event: { stageLogId: 'log1', action: 'approve' },
      user: { _id: 'boss1', role: 'boss_qi', name: '审核人' },
      openid: 'openid_boss'
    })), (error) => error.code === 'SUBMISSION_STATE_INCONSISTENT')
    assert.deepEqual(options.db.data, before)
    assert.equal(options.getNotices(), 0)
  })
}

const invalidSlotMutations = [
  ['attemptNo 0', (slot) => { slot.log.submissionAttemptNo = 0; slot.key.attemptNo = 0 }],
  ['negative attemptNo', (slot) => { slot.log.submissionAttemptNo = -1; slot.key.attemptNo = -1 }],
  ['decimal attemptNo', (slot) => { slot.log.submissionAttemptNo = 1.5; slot.key.attemptNo = 1.5 }],
  ['string attemptNo', (slot) => { slot.log.submissionAttemptNo = '1'; slot.key.attemptNo = '1' }],
  ['null attemptNo', (slot) => { slot.log.submissionAttemptNo = null; slot.key.attemptNo = null }],
  ['boolean attemptNo', (slot) => { slot.log.submissionAttemptNo = true; slot.key.attemptNo = true }],
  ['array attemptNo', (slot) => { slot.log.submissionAttemptNo = [1]; slot.key.attemptNo = [1] }],
  ['object attemptNo', (slot) => { slot.log.submissionAttemptNo = { value: 1 }; slot.key.attemptNo = { value: 1 } }],
  ['invalid calendar date', (slot) => { slot.log.businessDate = '2026-02-30'; slot.key.businessDate = '2026-02-30' }],
  ['invalid date format', (slot) => { slot.log.businessDate = '2026-7-27'; slot.key.businessDate = '2026-7-27' }],
  ['date with time', (slot) => { slot.log.businessDate = '2026-07-27T00:00:00'; slot.key.businessDate = '2026-07-27T00:00:00' }],
  ['year zero date', (slot) => { slot.log.businessDate = '0000-01-01'; slot.key.businessDate = '0000-01-01' }],
  ['uppercase status', (slot) => { slot.log.reviewStatus = 'PENDING'; slot.key.currentStatus = 'PENDING' }],
  ['unknown status', (slot) => { slot.log.reviewStatus = 'failed'; slot.key.currentStatus = 'failed' }],
  ['empty tenant ID', (slot) => { slot.log.tenantId = ''; slot.key.tenantId = '' }],
  ['empty project ID', (slot) => { slot.log.projectId = ''; slot.key.projectId = '' }],
  ['empty submitter ID', (slot) => { slot.log.submittedBy = ''; slot.key.submitterId = '' }],
  ['cross-tenant slot', (slot) => { slot.log.tenantId = 't2'; slot.key.tenantId = 't2' }],
  ['whitespace submitter ID', (slot) => { slot.log.submittedBy = ' u1'; slot.key.submitterId = ' u1' }],
  ['whitespace current log ID', (slot) => { slot.log._id = ' log1'; slot.key.currentStageLogId = ' log1' }],
  ['forged matching key ID', (slot) => { slot.key._id = 'stage-log-submission:v1:forged' }],
  ['reused key ID after date change', (slot) => { slot.log.businessDate = '2026-07-26'; slot.key.businessDate = '2026-07-26' }],
  ['reused key ID after stage change', (slot) => { slot.log.stageCode = 'painting'; slot.key.stageCode = 'painting' }],
  ['reused key ID after submitter change', (slot) => { slot.log.submittedBy = 'u2'; slot.key.submitterId = 'u2' }]
]

for (const [name, mutate] of invalidSlotMutations) {
  rejectSubmitWithZeroWrites(name, mutate)
  rejectReviewWithZeroWrites(name, mutate)
}
