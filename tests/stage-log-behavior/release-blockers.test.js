const test = require('node:test')
const assert = require('node:assert/strict')

const { createStageLog } = require('../../cloudfunctions/submitStageLog/submitService')
const { assertProjectAccess } = require('../../cloudfunctions/submitStageLog/access')
const { reviewStageLog } = require('../../cloudfunctions/reviewStageLog/reviewService')
const {
  getLogStage,
  summarizeNoticeResults,
  runApprovalNotice
} = require('../../shared/stage-flow')
const { targets, generatedContent } = require('../../scripts/sync-stage-flow')
const { createOwnerNoticeSender } = require('../../shared/owner-notice')
const { FakeDb, createCommand } = require('./fake-db')
const fs = require('node:fs')
const path = require('node:path')

function submitOptions({ user, project, event, db } = {}) {
  const database = db || new FakeDb({ projects: { p1: project || {
    _id: 'p1',
    tenantId: 't1',
    name: '测试工地',
    currentStage: '木工/吊顶',
    currentStageCode: 'carpentry_ceiling',
    progress: 65
  } } })
  return {
    db: database,
    _: createCommand(),
    event: Object.assign({ projectId: 'p1', workContent: '今日施工记录' }, event),
    user: user || { _id: 'u1', role: 'worker', name: '测试工长' },
    openid: 'openid_worker',
    tenantId: 't1',
    tenantName: '测试租户',
    project: database.data.projects.p1,
    now: 'NOW',
    sendOwnerNotice: async () => ({ result: { skipped: true, reason: 'no_owner' } }),
    sendWecomMarkdown: async () => true
  }
}

function reviewOptions({ project, log, db, user, tenantId, sendOwnerNotice } = {}) {
  const database = db || new FakeDb({
    projects: { p1: project || {
      _id: 'p1', tenantId: 't1', currentStage: '木工/吊顶',
      currentStageCode: 'carpentry_ceiling', progress: 60
    } },
    stage_logs: { log1: log || {
      _id: 'log1', tenantId: 't1', projectId: 'p1',
      stage: '开工交底', stageCode: 'start_briefing', progress: 10,
      reviewStatus: 'pending', ownerVisible: false
    } },
    photos: {}
  })
  return {
    db: database,
    _: createCommand(),
    event: { stageLogId: 'log1', action: 'approve' },
    user: user || { _id: 'boss1', role: 'boss_qi', name: '审核人' },
    openid: 'openid_boss',
    tenantId: tenantId || 't1',
    now: 'NOW',
    sendOwnerNotice: sendOwnerNotice || (async () => ({ result: { ok: true } }))
  }
}

test('event role cannot promote a worker to reviewer upload', async () => {
  const options = submitOptions({ event: { role: 'boss_qi' } })
  const result = await createStageLog(options)
  const log = Object.values(options.db.data.stage_logs)[0]
  assert.equal(result.autoApproved, false)
  assert.equal(log.reviewStatus, 'pending')
})

test('event tenantId cannot change the server tenant written to a log', async () => {
  const options = submitOptions({ event: { tenantId: 'tenant_other' } })
  await createStageLog(options)
  const log = Object.values(options.db.data.stage_logs)[0]
  assert.equal(log.tenantId, 't1')
})

test('submit rejects a project from another tenant', async () => {
  await assert.rejects(
    () => createStageLog(submitOptions({ project: { _id: 'p1', tenantId: 't2', currentStage: '木工/吊顶' } })),
    (error) => error.code === 'TENANT_MISMATCH'
  )
})

test('blank-tenant legacy project is not visible to a non-default tenant', async () => {
  const options = submitOptions({ project: { _id: 'p1', tenantId: '', currentStage: '木工/吊顶' } })
  options.tenantId = 'tenant_other'
  await assert.rejects(() => createStageLog(options), (error) => error.code === 'TENANT_MISMATCH')
})

test('empty-tenant user cannot access a non-default tenant project', async () => {
  const options = submitOptions({
    user: { _id: 'u1', role: 'worker', tenantId: '' },
    project: { _id: 'p1', tenantId: 'tenant_other', currentStage: '木工/吊顶' }
  })
  options.tenantId = 'tenant_shengjing_default'
  await assert.rejects(() => createStageLog(options), (error) => error.code === 'TENANT_MISMATCH')
})

test('non-member worker cannot submit a project', async () => {
  const db = new FakeDb({ project_members: {} })
  await assert.rejects(
    () => assertProjectAccess({ db, openid: 'worker-openid', user: { role: 'worker' }, projectId: 'p1' }),
    (error) => error.code === 'PROJECT_ACCESS_DENIED'
  )
})

test('review rejects a cross-tenant stage log', async () => {
  const options = reviewOptions({ log: {
    _id: 'log1', tenantId: 't2', projectId: 'p1', stage: '开工交底',
    stageCode: 'start_briefing', progress: 10, reviewStatus: 'pending'
  } })
  await assert.rejects(() => reviewStageLog(options), (error) => error.code === 'TENANT_MISMATCH')
})

test('review rejects a project whose tenant differs from the log tenant', async () => {
  const options = reviewOptions({ project: { _id: 'p1', tenantId: 't2', currentStage: '开工交底', progress: 10 } })
  await assert.rejects(() => reviewStageLog(options), (error) => error.code === 'TENANT_MISMATCH')
})

test('notice aggregation marks all successful recipients as sent', () => {
  assert.deepEqual(summarizeNoticeResults({ ok: true, sentCount: 2, totalCount: 2 }), {
    status: 'sent', requestedCount: 2, successCount: 2, failureCount: 0, errorSummary: ''
  })
})

test('notice aggregation marks mixed recipients as partial', () => {
  assert.equal(summarizeNoticeResults({ ok: true, sentCount: 1, totalCount: 2 }).status, 'partial')
})

test('notice aggregation marks zero successful recipients as failed', () => {
  const summary = summarizeNoticeResults({ ok: true, sentCount: 0, totalCount: 2 })
  assert.equal(summary.status, 'failed')
  assert.equal(summary.failureCount, 2)
})

test('notice aggregation marks no recipients as not_requested', () => {
  assert.equal(summarizeNoticeResults({ ok: true, sentCount: 0, totalCount: 0 }).status, 'not_requested')
})

test('notice status persistence failure preserves the approved core result', async () => {
  const db = new FakeDb({
    projects: { p1: { _id: 'p1', tenantId: 't1', currentStage: '木工/吊顶', progress: 60 } },
    stage_logs: { log1: { _id: 'log1', tenantId: 't1', projectId: 'p1', stage: '开工交底', progress: 10, reviewStatus: 'pending' } },
    photos: {}
  }, { failNoticeStatusUpdate: true })
  const result = await reviewStageLog(reviewOptions({ db }))
  assert.equal(result.reviewStatus, 'approved')
  assert.equal(result.noticeStatus, 'persist_failed')
  assert.equal(result.warningCode, 'NOTICE_STATUS_PERSIST_FAILED')
  assert.equal(db.data.stage_logs.log1.reviewStatus, 'approved')
})

test('notice persistence failure does not retry the approval transition', async () => {
  let sendCount = 0
  const db = new FakeDb({
    projects: { p1: { _id: 'p1', tenantId: 't1', currentStage: '木工/吊顶', progress: 60 } },
    stage_logs: { log1: { _id: 'log1', tenantId: 't1', projectId: 'p1', stage: '开工交底', progress: 10, reviewStatus: 'pending' } },
    photos: {}
  }, { failNoticeStatusUpdate: true })
  const options = reviewOptions({ db, sendOwnerNotice: async () => {
    sendCount += 1
    return { result: { ok: false, sentCount: 0, totalCount: 1 } }
  } })
  await reviewStageLog(options)
  assert.equal(sendCount, 1)
  assert.equal(db.data.stage_logs.log1.reviewStatus, 'approved')
})

test('notice summary redacts sensitive error text', () => {
  const summary = summarizeNoticeResults({ ok: false, sentCount: 0, totalCount: 1, message: 'openid=secret-token' })
  assert.equal(summary.status, 'failed')
  assert.doesNotMatch(JSON.stringify(summary), /secret-token/)
})

test('owner notice sender rejects a cross-tenant project before sending', async () => {
  let sendCount = 0
  const db = new FakeDb({
    projects: { p1: { _id: 'p1', tenantId: 't2', ownerOpenid: 'owner-1' } },
    stage_logs: { log1: { _id: 'log1', tenantId: 't2', projectId: 'p1', reviewStatus: 'approved', ownerVisible: true } }
  })
  const sender = createOwnerNoticeSender({
    db,
    cloud: { openapi: { subscribeMessage: { send: async () => { sendCount += 1 } } } }
  })
  const result = await sender({ projectId: 'p1', stageLogId: 'log1', tenantId: 't1' })
  assert.equal(result.errorCode, 'TENANT_MISMATCH')
  assert.equal(sendCount, 0)
})

test('owner notice sender reports all delivery failures as failed counts', async () => {
  const db = new FakeDb({
    projects: { p1: { _id: 'p1', tenantId: 't1', ownerOpenids: ['owner-1', 'owner-2'] } },
    stage_logs: { log1: { _id: 'log1', tenantId: 't1', projectId: 'p1', stage: '木工/吊顶', progress: 65, reviewStatus: 'approved', ownerVisible: true } }
  })
  const sender = createOwnerNoticeSender({
    db,
    cloud: { openapi: { subscribeMessage: { send: async () => { throw new Error('delivery failed') } } } }
  })
  const result = await sender({ projectId: 'p1', stageLogId: 'log1', tenantId: 't1' })
  assert.equal(result.ok, false)
  assert.equal(result.sentCount, 0)
  assert.equal(result.totalCount, 2)
})

test('parallel review requests still produce one approved transition', async () => {
  const options = reviewOptions()
  const results = await Promise.all([reviewStageLog(options), reviewStageLog(options)])
  assert.equal(options.db.data.stage_logs.log1.reviewStatus, 'approved')
  assert.equal(results.filter((item) => item.alreadyReviewed).length, 1)
})

test('already reviewed stage log returns stable ALREADY_REVIEWED code', async () => {
  const options = reviewOptions({ log: {
    _id: 'log1', tenantId: 't1', projectId: 'p1', stage: '开工交底',
    stageCode: 'start_briefing', progress: 10, reviewStatus: 'approved', ownerVisible: true
  } })
  const result = await reviewStageLog(options)
  assert.equal(result.code, 'ALREADY_REVIEWED')
  assert.equal(result.noticeRequired, false)
})

test('auto approval and manual review compete with one state transition', async () => {
  const options = reviewOptions()
  const first = reviewStageLog(options)
  const second = reviewStageLog(options)
  const results = await Promise.all([first, second])
  assert.equal(results.filter((item) => item.alreadyReviewed).length, 1)
  assert.equal(options.db.data.stage_logs.log1.reviewStatus, 'approved')
})

test('higher current progress survives an old approved log', async () => {
  const options = reviewOptions({ project: {
    _id: 'p1', tenantId: 't1', currentStage: '木工/吊顶', currentStageCode: 'carpentry_ceiling', progress: 80
  } })
  await reviewStageLog(options)
  assert.equal(options.db.data.projects.p1.progress, 80)
})

test('delivered project status remains unchanged after old log approval', async () => {
  const options = reviewOptions({ project: {
    _id: 'p1', tenantId: 't1', currentStage: '竣工验收', currentStageCode: 'final_acceptance',
    progress: 100, status: '已交付', statusCode: 'delivered'
  } })
  await reviewStageLog(options)
  assert.equal(options.db.data.projects.p1.statusCode, 'delivered')
  assert.equal(options.db.data.projects.p1.status, '已交付')
})

test('historical log remains labeled as its original stage', async () => {
  const options = reviewOptions()
  await reviewStageLog(options)
  assert.equal(options.db.data.stage_logs.log1.stage, '开工交底')
  assert.equal(options.db.data.projects.p1.currentStage, '木工/吊顶')
})

test('generated files all carry the generated-file marker', () => {
  targets.forEach(([, files]) => files.forEach((file) => {
    assert.match(fs.readFileSync(path.resolve(__dirname, '../..', file), 'utf8'), /^\/\/ GENERATED FILE - DO NOT EDIT\./)
  }))
})

test('generated file drift is detectable without changing the workspace', () => {
  const [source, destinations] = targets[0]
  const destination = destinations[0]
  const expected = generatedContent(source)
  const actual = fs.readFileSync(path.resolve(__dirname, '../..', destination), 'utf8')
  assert.notEqual(actual.replace('progress: 10', 'progress: 11'), expected)
})

test('stage sync targets include the frontend and both deployable functions', () => {
  const files = targets[0][1]
  assert.deepEqual(files, [
    'miniprogram/utils/stage-flow.js',
    'cloudfunctions/submitStageLog/stage-flow.js',
    'cloudfunctions/reviewStageLog/stage-flow.js'
  ])
})

test('unknown stage code is rejected instead of falling back to the first stage', () => {
  assert.throws(() => getLogStage({ stageCode: 'unknown-stage' }), (error) => error.code === 'INVALID_STAGE')
})

test('notice status writeback is isolated from core approval state', async () => {
  let persisted = false
  const result = await runApprovalNotice({
    now: 'NOW',
    sendNotice: async () => ({ ok: false, sentCount: 0, totalCount: 1 }),
    updateStatus: async () => {
      persisted = true
      throw new Error('write failed')
    }
  })
  assert.equal(persisted, true)
  assert.equal(result.noticeExecutionStatus, 'failed')
  assert.equal(result.noticeStatus, 'persist_failed')
})
