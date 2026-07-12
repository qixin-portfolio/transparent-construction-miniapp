const test = require('node:test')
const assert = require('node:assert/strict')

const { reviewStageLog } = require('../../cloudfunctions/reviewStageLog/reviewService')
const { FakeDb, createCommand } = require('./fake-db')

function baseOptions(seedOverrides = {}, optionOverrides = {}) {
  const seed = Object.assign({
    projects: {
      p1: { _id: 'p1', tenantId: 't1', currentStage: '木工/吊顶', currentStageCode: 'carpentry_ceiling', progress: 60 }
    },
    stage_logs: {
      log1: { _id: 'log1', tenantId: 't1', projectId: 'p1', stage: '开工交底', stageCode: 'start_briefing', progress: 10, reviewStatus: 'pending', ownerVisible: false }
    },
    photos: {
      photo1: { _id: 'photo1', tenantId: 't1', stageLogId: 'log1', ownerVisible: false }
    }
  }, seedOverrides)
  const db = new FakeDb(seed)
  let noticeCount = 0
  return Object.assign({
    db,
    _: createCommand(),
    event: { stageLogId: 'log1', action: 'approve' },
    user: { _id: 'boss1', role: 'boss_qi', name: '老齐' },
    openid: 'openid_boss',
    tenantId: 't1',
    now: 'NOW',
    sendOwnerNotice: async () => {
      noticeCount += 1
      return { result: { ok: true } }
    },
    getNoticeCount: () => noticeCount
  }, optionOverrides)
}

test('approving older stage keeps project at current stage', async () => {
  const options = baseOptions()
  const res = await reviewStageLog(options)
  assert.equal(res.ok, true)
  assert.equal(options.db.data.projects.p1.currentStage, '木工/吊顶')
  assert.equal(options.db.data.projects.p1.progress, 60)
  assert.equal(options.db.data.stage_logs.log1.reviewStatus, 'approved')
  assert.equal(options.db.data.stage_logs.log1.isHistoricalOrRework, true)
})

test('approving lower progress keeps higher project progress', async () => {
  const options = baseOptions()
  await reviewStageLog(options)
  assert.equal(options.db.data.projects.p1.progress, 60)
})

test('approving later stage advances project normally', async () => {
  const options = baseOptions({
    projects: {
      p1: { _id: 'p1', tenantId: 't1', currentStage: '开工交底', currentStageCode: 'start_briefing', progress: 10 }
    },
    stage_logs: {
      log1: { _id: 'log1', tenantId: 't1', projectId: 'p1', stage: '水电定位', stageCode: 'water_electric_position', progress: 20, reviewStatus: 'pending', ownerVisible: false }
    }
  })
  await reviewStageLog(options)
  assert.equal(options.db.data.projects.p1.currentStage, '水电定位')
  assert.equal(options.db.data.projects.p1.currentStageCode, 'water_electric_position')
  assert.equal(options.db.data.projects.p1.progress, 20)
})

test('delivered project remains delivered after old log approval', async () => {
  const options = baseOptions({
    projects: {
      p1: { _id: 'p1', tenantId: 't1', currentStage: '竣工验收', currentStageCode: 'final_acceptance', progress: 100, statusCode: 'delivered', status: '已交付' }
    }
  })
  await reviewStageLog(options)
  assert.equal(options.db.data.projects.p1.statusCode, 'delivered')
  assert.equal(options.db.data.projects.p1.status, '已交付')
  assert.equal(options.db.data.projects.p1.currentStage, '竣工验收')
  assert.equal(options.db.data.projects.p1.progress, 100)
})

test('duplicate review is idempotent and does not send owner notice again', async () => {
  const options = baseOptions({
    stage_logs: {
      log1: { _id: 'log1', tenantId: 't1', projectId: 'p1', stage: '开工交底', stageCode: 'start_briefing', progress: 10, reviewStatus: 'approved', ownerVisible: true }
    }
  })
  const res = await reviewStageLog(options)
  assert.equal(res.alreadyReviewed, true)
  assert.equal(options.getNoticeCount(), 0)
})

test('two concurrent reviews only produce one state transition notification', async () => {
  const options = baseOptions()
  await Promise.all([
    reviewStageLog(options),
    reviewStageLog(options)
  ])
  assert.equal(options.db.data.stage_logs.log1.reviewStatus, 'approved')
  assert.equal(options.getNoticeCount(), 1)
})

test('historical or rework log remains approved but does not regress project', async () => {
  const options = baseOptions()
  await reviewStageLog(options)
  assert.equal(options.db.data.stage_logs.log1.reviewStatus, 'approved')
  assert.equal(options.db.data.stage_logs.log1.stage, '开工交底')
  assert.equal(options.db.data.projects.p1.currentStage, '木工/吊顶')
})

test('notice failure does not rollback approved status', async () => {
  const options = baseOptions({}, {
    sendOwnerNotice: async () => {
      throw new Error('通知失败')
    }
  })
  const res = await reviewStageLog(options)
  assert.equal(options.db.data.stage_logs.log1.reviewStatus, 'approved')
  assert.equal(options.db.data.stage_logs.log1.ownerVisible, true)
  assert.equal(res.noticeStatus, 'failed')
  assert.match(options.db.data.stage_logs.log1.noticeError, /通知失败/)
})
