const test = require('node:test')
const assert = require('node:assert/strict')

const { createStageLog } = require('../../cloudfunctions/submitStageLog/submitService')
const { createOwnerNoticeSender } = require('../../shared/owner-notice')
const { FakeDb, createCommand } = require('./fake-db')

let createSendOwnerNoticeService
let directServiceLoadError
try {
  ({ createSendOwnerNoticeService } = require('../../cloudfunctions/sendOwnerNotice/noticeService'))
} catch (error) {
  directServiceLoadError = error
}

function startOfChinaDay() {
  const now = new Date()
  const china = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  return new Date(Date.UTC(china.getUTCFullYear(), china.getUTCMonth(), china.getUTCDate()) - 8 * 60 * 60 * 1000)
}

function stageLogSeed(overrides = {}) {
  return Object.assign({
    _id: 'log1',
    tenantId: 't1',
    projectId: 'p1',
    stage: '木工/吊顶',
    stageCode: 'carpentry_ceiling',
    progress: 65,
    reviewStatus: 'approved',
    ownerVisible: true
  }, overrides)
}

function notificationDb(overrides = {}) {
  return new FakeDb({
    projects: { p1: Object.assign({ _id: 'p1', tenantId: 't1', name: '测试工地', ownerOpenid: 'owner-1' }, overrides.project) },
    stage_logs: { log1: stageLogSeed(overrides.log) },
    photos: {}
  })
}

function submitOptions(overrides = {}) {
  const db = overrides.db || new FakeDb({
    projects: { p1: { _id: 'p1', tenantId: 't1', name: '测试工地', currentStage: '木工/吊顶', currentStageCode: 'carpentry_ceiling', progress: 65 } }
  })
  return Object.assign({
    db,
    _: createCommand(),
    event: { projectId: 'p1', workContent: '今日施工记录' },
    user: { _id: 'u1', role: 'worker', name: '测试工长' },
    openid: 'openid_worker',
    tenantId: 't1',
    tenantName: '测试租户',
    now: new Date(),
    sendWecomMarkdown: async () => true,
    sendOwnerNotice: async () => ({ skipped: true, reason: 'no_owner' })
  }, overrides)
}

function senderOptions(db, environment, send) {
  return {
    db,
    environment,
    cloud: { openapi: { subscribeMessage: { send } } }
  }
}

test('stageCode empty falls back only to a legal project current stage', async () => {
  const result = await createStageLog(submitOptions())
  assert.equal(result.stage.code, 'carpentry_ceiling')
})

test('stageCode empty without a legal project current stage rejects with zero writes', async () => {
  const options = submitOptions()
  options.db.data.projects.p1 = { _id: 'p1', tenantId: 't1', name: '测试工地' }
  await assert.rejects(() => createStageLog(options), (error) => error.code === 'STAGE_REQUIRED')
  assert.equal(Object.keys(options.db.data.stage_logs).length, 0)
  assert.equal(Object.keys(options.db.data.stage_log_submission_keys).length, 0)
})

for (const stageCode of ['not-a-real-stage', 'water_electric', ' CARPENTRY_CEILING ', 'Carpentry_Ceiling']) {
  test(`illegal stageCode ${stageCode} rejects with zero writes`, async () => {
    const options = submitOptions({ event: { projectId: 'p1', workContent: '今日施工记录', stageCode } })
    await assert.rejects(() => createStageLog(options), (error) => error.code === 'INVALID_STAGE_CODE')
    assert.equal(Object.keys(options.db.data.stage_logs).length, 0)
    assert.equal(Object.keys(options.db.data.stage_log_submission_keys).length, 0)
    assert.equal(options.db.data.projects.p1.progress, 65)
  })
}

test('a valid explicit stageCode is accepted from the shared stage configuration', async () => {
  const result = await createStageLog(submitOptions({ event: { projectId: 'p1', workContent: '今日施工记录', stageCode: 'painting' } }))
  assert.equal(result.stage.code, 'painting')
})

test('duplicate detection finds a same-user log older than 20 newer project logs', async () => {
  const start = startOfChinaDay()
  const stageLogs = {}
  for (let index = 0; index < 30; index += 1) {
    stageLogs[`other-${index}`] = stageLogSeed({
      _id: `other-${index}`,
      submittedByOpenid: `other-${index}`,
      submittedBy: `other-${index}`,
      createdAt: new Date(start.getTime() + (index + 10) * 1000)
    })
  }
  stageLogs.target = stageLogSeed({ submittedByOpenid: 'openid_worker', submittedBy: 'u1', createdAt: new Date(start.getTime() + 1000) })
  const options = submitOptions({ db: new FakeDb({ projects: { p1: { _id: 'p1', tenantId: 't1', currentStageCode: 'carpentry_ceiling', progress: 65 } }, stage_logs: stageLogs }) })
  await assert.rejects(() => createStageLog(options), (error) => error.code === 'ALREADY_SUBMITTED')
})

test('same user can submit to another project and another user can submit to the same project', async () => {
  const db = new FakeDb({
    projects: {
      p1: { _id: 'p1', tenantId: 't1', currentStageCode: 'carpentry_ceiling', progress: 65 },
      p2: { _id: 'p2', tenantId: 't1', currentStageCode: 'carpentry_ceiling', progress: 65 }
    },
    stage_logs: { existing: stageLogSeed({ submittedByOpenid: 'openid_worker', submittedBy: 'u1', createdAt: new Date() }) }
  })
  const otherProject = submitOptions({ db, event: { projectId: 'p2', workContent: '另一工地' } })
  const otherUser = submitOptions({ db, openid: 'openid_other', user: { _id: 'u2', role: 'worker' } })
  await createStageLog(otherProject)
  await createStageLog(otherUser)
})

test('same user can submit after the China-day boundary', async () => {
  const start = startOfChinaDay()
  const yesterday = new Date(start.getTime() - 1000)
  const options = submitOptions({ db: new FakeDb({
    projects: { p1: { _id: 'p1', tenantId: 't1', currentStageCode: 'carpentry_ceiling', progress: 65 } },
    stage_logs: { yesterday: stageLogSeed({ submittedByOpenid: 'openid_worker', submittedBy: 'u1', createdAt: yesterday }) }
  }) })
  await createStageLog(options)
})

test('concurrent duplicate submissions create one log and one deterministic claim', async () => {
  const options = submitOptions()
  const results = await Promise.allSettled([createStageLog(options), createStageLog(options)])
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
  assert.equal(Object.keys(options.db.data.stage_logs).length, 1)
  assert.equal(Object.keys(options.db.data.stage_log_submission_keys).length, 1)
})

test('owner notification is disabled with no environment configuration', async () => {
  let sends = 0
  const db = notificationDb()
  const sender = createOwnerNoticeSender(senderOptions(db, {}, async () => { sends += 1 }))
  const result = await sender({ projectId: 'p1', stageLogId: 'log1', tenantId: 't1', miniprogramState: 'formal' })
  assert.equal(result.skipped, true)
  assert.equal(result.reason, 'external_notifications_disabled')
  assert.equal(sends, 0)
  assert.equal(db.data.stage_logs.log1.ownerNoticeStatus, 'not_requested')
})

for (const environment of [
  { ENABLE_EXTERNAL_NOTIFICATIONS: 'false', WECHAT_MINIPROGRAM_STATE: 'formal' },
  { ENABLE_EXTERNAL_NOTIFICATIONS: 'true' },
  { ENABLE_EXTERNAL_NOTIFICATIONS: 'true', WECHAT_MINIPROGRAM_STATE: 'invalid' }
]) {
  test(`notification environment ${JSON.stringify(environment)} cannot send unsafely`, async () => {
    let sends = 0
    const sender = createOwnerNoticeSender(senderOptions(notificationDb(), environment, async () => { sends += 1 }))
    const result = await sender({ projectId: 'p1', stageLogId: 'log1', tenantId: 't1' })
    assert.equal(result.skipped, true)
    assert.equal(sends, 0)
  })
}

for (const state of ['developer', 'trial', 'formal']) {
  test(`enabled notification uses server-only ${state} state`, async () => {
    let receivedState = ''
    const sender = createOwnerNoticeSender(senderOptions(notificationDb(), {
      ENABLE_EXTERNAL_NOTIFICATIONS: 'true',
      WECHAT_MINIPROGRAM_STATE: state
    }, async (payload) => { receivedState = payload.miniprogramState }))
    await sender({ projectId: 'p1', stageLogId: 'log1', tenantId: 't1', miniprogramState: 'formal' })
    assert.equal(receivedState, state)
  })
}

test('no-owner notification path is persisted and idempotent', async () => {
  let sends = 0
  const db = notificationDb({ project: { ownerOpenid: '' } })
  const sender = createOwnerNoticeSender(senderOptions(db, { ENABLE_EXTERNAL_NOTIFICATIONS: 'true', WECHAT_MINIPROGRAM_STATE: 'developer' }, async () => { sends += 1 }))
  const first = await sender({ projectId: 'p1', stageLogId: 'log1', tenantId: 't1' })
  const second = await sender({ projectId: 'p1', stageLogId: 'log1', tenantId: 't1' })
  assert.equal(first.reason, 'no_owner')
  assert.equal(second.duplicate, true)
  assert.equal(sends, 0)
})

test('notification sequential and concurrent duplicates send externally once', async () => {
  let sends = 0
  const db = notificationDb()
  const sender = createOwnerNoticeSender(senderOptions(db, { ENABLE_EXTERNAL_NOTIFICATIONS: 'true', WECHAT_MINIPROGRAM_STATE: 'developer' }, async () => { sends += 1 }))
  await Promise.all([sender({ projectId: 'p1', stageLogId: 'log1', tenantId: 't1' }), sender({ projectId: 'p1', stageLogId: 'log1', tenantId: 't1' })])
  await sender({ projectId: 'p1', stageLogId: 'log1', tenantId: 't1' })
  assert.equal(sends, 1)
  assert.equal(db.data.stage_logs.log1.ownerNoticeStatus, 'sent')
})

test('notification failure is persisted and does not auto-retry', async () => {
  let sends = 0
  const db = notificationDb()
  const sender = createOwnerNoticeSender(senderOptions(db, { ENABLE_EXTERNAL_NOTIFICATIONS: 'true', WECHAT_MINIPROGRAM_STATE: 'trial' }, async () => {
    sends += 1
    throw new Error('delivery failed')
  }))
  const first = await sender({ projectId: 'p1', stageLogId: 'log1', tenantId: 't1' })
  const second = await sender({ projectId: 'p1', stageLogId: 'log1', tenantId: 't1' })
  assert.equal(first.ok, false)
  assert.equal(second.duplicate, true)
  assert.equal(sends, 1)
  assert.equal(db.data.stage_logs.log1.ownerNoticeStatus, 'failed')
})

test('different stage logs and tenants have distinct notification keys', async () => {
  let sends = 0
  const db = new FakeDb({
    projects: {
      p1: { _id: 'p1', tenantId: 't1', ownerOpenid: 'owner-1' },
      p2: { _id: 'p2', tenantId: 't2', ownerOpenid: 'owner-2' }
    },
    stage_logs: {
      log1: stageLogSeed(),
      log2: stageLogSeed({ _id: 'log2', tenantId: 't2', projectId: 'p2' })
    }
  })
  const sender = createOwnerNoticeSender(senderOptions(db, { ENABLE_EXTERNAL_NOTIFICATIONS: 'true', WECHAT_MINIPROGRAM_STATE: 'developer' }, async () => { sends += 1 }))
  await sender({ projectId: 'p1', stageLogId: 'log1', tenantId: 't1' })
  await sender({ projectId: 'p2', stageLogId: 'log2', tenantId: 't2' })
  assert.equal(sends, 2)
  assert.notEqual(db.data.stage_logs.log1.ownerNoticeKey, db.data.stage_logs.log2.ownerNoticeKey)
})

test('direct send service requires a reviewer role and keeps tenant boundaries', async () => {
  assert.equal(directServiceLoadError, undefined)
  const db = notificationDb()
  const service = createSendOwnerNoticeService({
    db,
    cloud: { openapi: { subscribeMessage: { send: async () => {} } } },
    getCurrentUser: async () => ({ openid: 'worker', user: { role: 'worker', tenantId: 't1' } })
  })
  const result = await service({ projectId: 'p1', stageLogId: 'log1', tenantId: 't2' })
  assert.equal(result.errorCode, 'ROLE_NOT_ALLOWED')
})
