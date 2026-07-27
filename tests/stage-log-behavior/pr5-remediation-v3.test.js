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
    event: { projectId: 'p1', workContent: '今日施工记录', businessDate: 'forged' },
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
    openid: 'openid_worker',
    userId: 'u1',
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
    submittedByOpenid: 'openid_worker',
    businessDate,
    submissionBusinessDate: businessDate,
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

function assertZeroSubmitWrites(options, initialLogs = 1, initialKeys = 0) {
  assert.equal(Object.keys(options.db.data.stage_logs).length, initialLogs)
  assert.equal(Object.keys(options.db.data.stage_log_submission_keys).length, initialKeys)
  assert.equal(options.db.data.projects.p1.progress, 65)
  assert.equal(options.getNotices(), 0)
}

test('request context fixes China business date, day range, and idempotency key across midnight', async () => {
  const requestContext = createSubmissionRequestContext(REQUEST_NOW)
  assert.equal(requestContext.businessDate, '2026-07-27')
  assert.equal(requestContext.businessDayStart.toISOString(), '2026-07-26T16:00:00.000Z')
  assert.equal(requestContext.businessDayEnd.toISOString(), '2026-07-27T16:00:00.000Z')

  const utcDifferentContext = createSubmissionRequestContext(new Date('2026-01-01T16:30:00.000Z'))
  assert.equal(utcDifferentContext.businessDate, '2026-01-02')
  assert.equal(utcDifferentContext.businessDayEnd.getTime() - utcDifferentContext.businessDayStart.getTime(), 24 * 60 * 60 * 1000)

  const options = submitOptions()
  const result = await createStageLog(options)
  const log = options.db.data.stage_logs[result.id]
  const key = Object.values(options.db.data.stage_log_submission_keys)[0]
  assert.equal(log.businessDate, '2026-07-27')
  assert.equal(log.submissionBusinessDate, '2026-07-27')
  assert.equal(key.businessDate, '2026-07-27')
  assert.equal(log.submissionKeyId, key._id)
  assert.notEqual(log.businessDate, options.event.businessDate)
})

test('request context remains immutable when a transaction conflict retries after China midnight', async () => {
  let reads = 0
  let releaseReads
  const bothRead = new Promise((resolve) => { releaseReads = resolve })
  const db = new TransactionModelDb(baseSeed(), {
    onRead: async (name) => {
      if (name !== 'stage_log_submission_keys') return
      reads += 1
      if (reads === 2) releaseReads()
      await bothRead
    }
  })
  const options = submitOptions({ db })
  const results = await Promise.allSettled([createStageLog(options), createStageLog(options)])
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
  assert.equal(results.filter((result) => result.status === 'rejected' && result.reason.code === 'ALREADY_SUBMITTED').length, 1)
  const log = Object.values(db.data.stage_logs)[0]
  const key = Object.values(db.data.stage_log_submission_keys)[0]
  assert.equal(db.transactionConflicts, 1)
  assert.equal(log.businessDate, '2026-07-27')
  assert.equal(key.businessDate, '2026-07-27')
})

for (const partial of [
  { submissionKeyId: 'missing-key' },
  { submissionAttemptNo: 1 },
  { submissionKeyId: '' },
  { submissionAttemptNo: 0 }
]) {
  test(`submit rejects partial new-format history: ${JSON.stringify(partial)}`, async () => {
    const options = submitOptions()
    const log = Object.assign({
      _id: 'log1', tenantId: 't1', projectId: 'p1', stage: '木工/吊顶', stageCode: 'carpentry_ceiling',
      submittedBy: 'u1', submittedByOpenid: 'openid_worker', reviewStatus: 'rejected', createdAt: REQUEST_NOW
    }, partial)
    options.db = new TransactionModelDb(baseSeed({ stage_logs: { log1: log } }))
    await assert.rejects(() => createStageLog(options), (error) => error.code === 'SUBMISSION_STATE_INCONSISTENT')
    assertZeroSubmitWrites(options)
  })
}

test('submit rejects a stage log that declares a missing submission key', async () => {
  const options = submitOptions()
  const slot = currentSlot(options)
  options.db = new TransactionModelDb(baseSeed({ stage_logs: { log1: slot.log } }))
  await assert.rejects(() => createStageLog(options), (error) => error.code === 'SUBMISSION_STATE_INCONSISTENT')
  assertZeroSubmitWrites(options)
})

for (const [name, mutate] of [
  ['attempt number', (slot) => { slot.log.submissionAttemptNo = 2 }],
  ['submitter', (slot) => { slot.key.submitterId = 'u2' }],
  ['business date', (slot) => { slot.key.businessDate = '2026-07-26' }],
  ['tenant', (slot) => { slot.key.tenantId = 't2' }],
  ['project', (slot) => { slot.key.projectId = 'p2' }],
  ['stage', (slot) => { slot.key.stageCode = 'painting' }],
  ['current log', (slot) => { slot.key.currentStageLogId = 'other-log' }],
  ['current status', (slot) => { slot.key.currentStatus = 'pending' }],
  ['declared key id', (slot) => { slot.log.submissionKeyId = 'other-key' }]
]) {
  test(`submit fails closed on ${name} linkage mismatch`, async () => {
    const options = submitOptions()
    const slot = currentSlot(options)
    mutate(slot)
    options.db = new TransactionModelDb(baseSeed({
      stage_logs: { log1: slot.log },
      stage_log_submission_keys: { [slot.keyId]: slot.key }
    }))
    await assert.rejects(() => createStageLog(options), (error) => error.code === 'SUBMISSION_STATE_INCONSISTENT')
    assertZeroSubmitWrites(options, 1, 1)
  })
}

function reviewOptions(overrides = {}) {
  const options = submitOptions(overrides)
  options.event = { stageLogId: 'log1', action: 'approve' }
  options.user = { _id: 'boss1', role: 'boss_qi', name: '审核人' }
  options.openid = 'openid_boss'
  return options
}

function assertZeroReviewWrites(options, before) {
  assert.deepEqual(options.db.data, before)
  assert.equal(options.getNotices(), 0)
}

test('review rejects a pending stage log that declares a missing key with zero writes', async () => {
  const options = reviewOptions()
  const slot = currentSlot(options, { log: { reviewStatus: 'pending' }, key: { currentStatus: 'pending' } })
  options.db = new TransactionModelDb(baseSeed({ stage_logs: { log1: slot.log } }))
  const before = JSON.parse(JSON.stringify(options.db.data))
  await assert.rejects(() => reviewStageLog(options), (error) => error.code === 'SUBMISSION_STATE_INCONSISTENT')
  assertZeroReviewWrites(options, before)
})

for (const [name, mutate] of [
  ['attempt number', (slot) => { slot.log.submissionAttemptNo = 2 }],
  ['submitter', (slot) => { slot.key.submitterId = 'u2' }],
  ['business date', (slot) => { slot.key.businessDate = '2026-07-26' }],
  ['tenant', (slot) => { slot.key.tenantId = 't2' }],
  ['project', (slot) => { slot.key.projectId = 'p2' }],
  ['stage', (slot) => { slot.key.stageCode = 'painting' }],
  ['current log', (slot) => { slot.key.currentStageLogId = 'other-log' }],
  ['current status', (slot) => { slot.key.currentStatus = 'approved' }],
  ['declared key id', (slot) => { slot.log.submissionKeyId = 'other-key' }]
]) {
  test(`review fails closed on ${name} linkage mismatch`, async () => {
    const options = reviewOptions()
    const slot = currentSlot(options, { log: { reviewStatus: 'pending' }, key: { currentStatus: 'pending' } })
    mutate(slot)
    options.db = new TransactionModelDb(baseSeed({
      stage_logs: { log1: slot.log },
      stage_log_submission_keys: { [slot.keyId]: slot.key }
    }))
    const before = JSON.parse(JSON.stringify(options.db.data))
    await assert.rejects(() => reviewStageLog(options), (error) => error.code === 'SUBMISSION_STATE_INCONSISTENT')
    assertZeroReviewWrites(options, before)
  })
}

test('legacy log without all new-structure fields remains reviewable and does not create a key', async () => {
  const options = reviewOptions()
  options.db = new TransactionModelDb(baseSeed({
    stage_logs: { log1: { _id: 'log1', tenantId: 't1', projectId: 'p1', stage: '木工/吊顶', stageCode: 'carpentry_ceiling', reviewStatus: 'pending', ownerVisible: false } }
  }))
  await reviewStageLog(options)
  assert.equal(options.db.data.stage_logs.log1.reviewStatus, 'approved')
  assert.equal(Object.keys(options.db.data.stage_log_submission_keys).length, 0)
})

test('auto-approval project write failure rolls back new log, key, photos, and notices', async () => {
  const db = new TransactionModelDb(baseSeed(), { failWrites: ['projects'] })
  const options = submitOptions({ db, user: { _id: 'boss1', role: 'boss_qi', name: '审核人' }, openid: 'openid_boss' })
  await assert.rejects(() => createStageLog(options), (error) => error.code === 'IDEMPOTENCY_STORE_UNAVAILABLE' || error.code === 'SUBMISSION_TRANSACTION_FAILED')
  assert.equal(Object.keys(db.data.stage_logs).length, 0)
  assert.equal(Object.keys(db.data.stage_log_submission_keys).length, 0)
  assert.equal(Object.keys(db.data.photos).length, 0)
  assert.equal(options.getNotices(), 0)
})

for (const [name, modelOptions] of [
  ['key read', { failReads: ['stage_log_submission_keys'] }],
  ['key write', { failWrites: ['stage_log_submission_keys'] }],
  ['project write', { failWrites: ['projects'] }],
  ['photo write', { failWrites: ['photos'] }],
  ['stage log write', { failWrites: ['stage_logs'] }],
  ['transaction commit', { failCommit: true }]
]) {
  test(`review ${name} failure rolls back all changes and sends no notification`, async () => {
    const options = reviewOptions()
    const slot = currentSlot(options, { log: { reviewStatus: 'pending' }, key: { currentStatus: 'pending' } })
    options.db = new TransactionModelDb(baseSeed({
      stage_logs: { log1: slot.log },
      photos: { photo1: { _id: 'photo1', tenantId: 't1', stageLogId: 'log1', ownerVisible: false } },
      stage_log_submission_keys: { [slot.keyId]: slot.key }
    }), modelOptions)
    const before = JSON.parse(JSON.stringify(options.db.data))
    await assert.rejects(() => reviewStageLog(options), (error) => error.code === 'REVIEW_STORE_UNAVAILABLE' || error.code === 'REVIEW_TRANSACTION_FAILED')
    assertZeroReviewWrites(options, before)
  })
}
