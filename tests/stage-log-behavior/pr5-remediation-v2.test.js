const test = require('node:test')
const assert = require('node:assert/strict')

const { createStageLog } = require('../../cloudfunctions/submitStageLog/submitService')
const { reviewStageLog } = require('../../cloudfunctions/reviewStageLog/reviewService')
const { buildSubmissionIdempotencyKey } = require('../../cloudfunctions/submitStageLog/guards')
const { createCommand } = require('./fake-db')
const { TransactionModelDb } = require('./transaction-model')

function seed(overrides = {}) {
  return Object.assign({
    projects: {
      p1: { _id: 'p1', tenantId: 't1', name: '测试工地', currentStage: '木工/吊顶', currentStageCode: 'carpentry_ceiling', progress: 65 }
    },
    stage_logs: {},
    photos: {},
    stage_log_submission_keys: {}
  }, overrides)
}

function options(overrides = {}) {
  const db = overrides.db || new TransactionModelDb(seed())
  return Object.assign({
    db,
    _: createCommand(),
    event: { projectId: 'p1', workContent: '今日施工记录' },
    user: { _id: 'u1', role: 'worker', name: '测试工长' },
    openid: 'openid_worker',
    tenantId: 't1',
    tenantName: '测试租户',
    now: new Date('2026-07-27T04:00:00.000Z'),
    sendOwnerNotice: async () => ({ skipped: true }),
    sendWecomMarkdown: async () => false
  }, overrides)
}

function onlyLog(db) {
  return Object.values(db.data.stage_logs)[0]
}

function onlyKey(db) {
  return Object.values(db.data.stage_log_submission_keys)[0]
}

async function rejectCurrentAttempt(submitOptions) {
  const currentKey = onlyKey(submitOptions.db)
  const log = submitOptions.db.data.stage_logs[currentKey.currentStageLogId]
  return reviewStageLog({
    db: submitOptions.db,
    _: createCommand(),
    event: { stageLogId: log._id, action: 'reject', rejectReason: '请补充照片' },
    user: { _id: 'boss1', role: 'boss_qi', name: '审核人' },
    openid: 'boss-openid',
    tenantId: 't1',
    now: submitOptions.now,
    sendOwnerNotice: async () => ({ skipped: true })
  })
}

test('rejected current attempt creates a new log and advances the submission slot', async () => {
  const submitOptions = options()
  const first = await createStageLog(submitOptions)
  await rejectCurrentAttempt(submitOptions)
  const second = await createStageLog(submitOptions)

  const logs = Object.values(submitOptions.db.data.stage_logs)
  const rejected = logs.find((log) => log._id === first.id)
  const replacement = logs.find((log) => log._id === second.id)
  const key = onlyKey(submitOptions.db)
  assert.equal(logs.length, 2)
  assert.equal(rejected.reviewStatus, 'rejected')
  assert.equal(replacement.reviewStatus, 'pending')
  assert.notEqual(first.id, second.id)
  assert.equal(replacement.submissionAttemptNo, 2)
  assert.equal(key.currentStageLogId, second.id)
  assert.equal(key.currentStatus, 'pending')
  assert.equal(key.attemptNo, 2)
  assert.ok(key.lastRejectedAt)
})

test('multiple rejected attempts keep all history and continue incrementing attempts', async () => {
  const submitOptions = options()
  await createStageLog(submitOptions)
  await rejectCurrentAttempt(submitOptions)
  await createStageLog(submitOptions)
  await rejectCurrentAttempt(submitOptions)
  const third = await createStageLog(submitOptions)

  const logs = Object.values(submitOptions.db.data.stage_logs)
  assert.equal(logs.length, 3)
  assert.deepEqual(logs.map((log) => log.reviewStatus).sort(), ['pending', 'rejected', 'rejected'])
  assert.equal(submitOptions.db.data.stage_logs[third.id].submissionAttemptNo, 3)
  assert.equal(onlyKey(submitOptions.db).attemptNo, 3)
})

test('pending and approved current attempts block duplicate submissions', async () => {
  const pending = options()
  await createStageLog(pending)
  await assert.rejects(() => createStageLog(pending), (error) => error.code === 'ALREADY_SUBMITTED')

  const approved = options({ user: { _id: 'boss1', role: 'boss_qi', name: '审核人' }, openid: 'boss-openid' })
  await createStageLog(approved)
  await assert.rejects(() => createStageLog(approved), (error) => error.code === 'ALREADY_SUBMITTED')
})

test('legacy logs without a key preserve pending and approved blocking but allow rejected replacement', async () => {
  const now = new Date()
  for (const status of ['pending', 'approved']) {
    const submitOptions = options({ db: new TransactionModelDb(seed({
      stage_logs: { legacy: { _id: 'legacy', tenantId: 't1', projectId: 'p1', stage: '木工/吊顶', stageCode: 'carpentry_ceiling', submittedByOpenid: 'openid_worker', submittedBy: 'u1', reviewStatus: status, createdAt: now } }
    })) })
    await assert.rejects(() => createStageLog(submitOptions), (error) => error.code === 'ALREADY_SUBMITTED')
  }

  const submitOptions = options({ db: new TransactionModelDb(seed({
    stage_logs: { legacy: { _id: 'legacy', tenantId: 't1', projectId: 'p1', stage: '木工/吊顶', stageCode: 'carpentry_ceiling', submittedByOpenid: 'openid_worker', submittedBy: 'u1', reviewStatus: 'rejected', createdAt: now } }
  })) })
  await createStageLog(submitOptions)
  assert.equal(Object.keys(submitOptions.db.data.stage_logs).length, 2)
  assert.equal(onlyKey(submitOptions.db).attemptNo, 1)
})

test('legacy mixed statuses keep pending or approved as the blocking priority', async () => {
  const now = new Date()
  const submitOptions = options({ db: new TransactionModelDb(seed({
    stage_logs: {
      rejected: { _id: 'rejected', tenantId: 't1', projectId: 'p1', stage: '木工/吊顶', stageCode: 'carpentry_ceiling', submittedByOpenid: 'openid_worker', submittedBy: 'u1', reviewStatus: 'rejected', createdAt: now },
      pending: { _id: 'pending', tenantId: 't1', projectId: 'p1', stage: '木工/吊顶', stageCode: 'carpentry_ceiling', submittedByOpenid: 'openid_worker', submittedBy: 'u1', reviewStatus: 'pending', createdAt: now }
    }
  })) })
  await assert.rejects(() => createStageLog(submitOptions), (error) => error.code === 'ALREADY_SUBMITTED')
  assert.equal(Object.keys(submitOptions.db.data.stage_log_submission_keys).length, 0)
})

test('inconsistent submission key status fails without a new business write', async () => {
  const keyId = buildSubmissionIdempotencyKey({ tenantId: 't1', projectId: 'p1', stageCode: 'carpentry_ceiling', openid: 'openid_worker', userId: 'u1', date: new Date() })
  const submitOptions = options({ db: new TransactionModelDb(seed({
    stage_logs: { log1: { _id: 'log1', tenantId: 't1', projectId: 'p1', reviewStatus: 'rejected' } },
    stage_log_submission_keys: { [keyId]: { _id: keyId, tenantId: 't1', projectId: 'p1', stageCode: 'carpentry_ceiling', currentStageLogId: 'log1', currentStatus: 'pending', attemptNo: 1 } }
  })) })
  await assert.rejects(() => createStageLog(submitOptions), (error) => error.code === 'SUBMISSION_STATE_INCONSISTENT')
  assert.equal(Object.keys(submitOptions.db.data.stage_logs).length, 1)
  assert.equal(Object.keys(submitOptions.db.data.stage_log_submission_keys).length, 1)
})

test('reviewing an old rejected attempt cannot overwrite the current submission key', async () => {
  const submitOptions = options()
  const first = await createStageLog(submitOptions)
  await rejectCurrentAttempt(submitOptions)
  const second = await createStageLog(submitOptions)
  const keyBefore = onlyKey(submitOptions.db)
  const result = await reviewStageLog({
    db: submitOptions.db,
    _: createCommand(),
    event: { stageLogId: first.id, action: 'approve' },
    user: { _id: 'boss1', role: 'boss_qi', name: '审核人' },
    openid: 'boss-openid',
    tenantId: 't1',
    now: submitOptions.now,
    sendOwnerNotice: async () => ({ skipped: true })
  })
  assert.equal(result.code, 'ALREADY_REVIEWED')
  assert.equal(onlyKey(submitOptions.db).currentStageLogId, keyBefore.currentStageLogId)
  assert.equal(onlyKey(submitOptions.db).currentStageLogId, second.id)
})

test('optimistic transaction conflict retries and leaves one new stage log', async () => {
  let keyReads = 0
  let releaseReads
  const bothRead = new Promise((resolve) => { releaseReads = resolve })
  const db = new TransactionModelDb(seed(), {
    onRead: async (name) => {
      if (name !== 'stage_log_submission_keys') return
      keyReads += 1
      if (keyReads === 2) releaseReads()
      await bothRead
    }
  })
  const submitOptions = options({ db })
  const results = await Promise.allSettled([createStageLog(submitOptions), createStageLog(submitOptions)])
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
  assert.equal(results.filter((result) => result.status === 'rejected' && result.reason.code === 'ALREADY_SUBMITTED').length, 1)
  assert.equal(db.transactionConflicts, 1)
  assert.equal(Object.keys(db.data.stage_logs).length, 1)
  assert.equal(Object.keys(db.data.stage_log_submission_keys).length, 1)
  assert.equal(onlyKey(db).attemptNo, 1)
})

for (const [name, modelOptions, expectedCode] of [
  ['missing collection', {}, 'IDEMPOTENCY_STORE_UNAVAILABLE'],
  ['collection read permission denial', { failReads: ['stage_log_submission_keys'] }, 'IDEMPOTENCY_STORE_UNAVAILABLE'],
  ['collection write permission denial', { failWrites: ['stage_log_submission_keys'] }, 'IDEMPOTENCY_STORE_UNAVAILABLE'],
  ['transaction unavailable', { transactionUnavailable: true }, 'IDEMPOTENCY_STORE_UNAVAILABLE'],
  ['stage log write failure rolls back key creation', { failWrites: ['stage_logs'] }, 'IDEMPOTENCY_STORE_UNAVAILABLE'],
  ['transaction commit failure rolls back all writes', { failCommit: true }, 'SUBMISSION_TRANSACTION_FAILED']
]) {
  test(`${name} fails closed with no stage log, project update, or notice`, async () => {
    const base = name === 'missing collection' ? {
      projects: seed().projects,
      stage_logs: {},
      photos: {}
    } : seed()
    const db = new TransactionModelDb(base, modelOptions)
    let notices = 0
    const submitOptions = options({ db, sendOwnerNotice: async () => { notices += 1 }, sendWecomMarkdown: async () => { notices += 1 } })
    await assert.rejects(() => createStageLog(submitOptions), (error) => error.code === expectedCode)
    assert.equal(Object.keys(db.data.stage_logs).length, 0)
    assert.equal(db.data.projects.p1.progress, 65)
    assert.equal(notices, 0)
    if (db.data.stage_log_submission_keys) assert.equal(Object.keys(db.data.stage_log_submission_keys).length, 0)
  })
}
