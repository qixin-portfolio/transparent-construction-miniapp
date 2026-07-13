const test = require('node:test')
const assert = require('node:assert/strict')

const { createStageLog } = require('../../cloudfunctions/submitStageLog/submitService')
const { FakeDb, createCommand } = require('./fake-db')

function baseOptions(overrides = {}) {
  const db = new FakeDb({
    projects: {
      p1: { _id: 'p1', name: '测试工地', tenantId: 't1', currentStage: '木工/吊顶', currentStageCode: 'carpentry_ceiling', progress: 65 }
    }
  })
  let ownerNoticeCount = 0
  let wecomCount = 0
  return Object.assign({
    db,
    _: createCommand(),
    event: { projectId: 'p1', workContent: '今日施工记录' },
    user: { _id: 'u1', role: 'worker', name: '测试工长' },
    openid: 'openid_worker',
    tenantId: 't1',
    tenantName: '测试租户',
    project: db.data.projects.p1,
    existingLog: null,
    now: 'NOW',
    sendOwnerNotice: async () => {
      ownerNoticeCount += 1
      return { result: { ok: true } }
    },
    sendWecomMarkdown: async () => {
      wecomCount += 1
      return true
    },
    getOwnerNoticeCount: () => ownerNoticeCount,
    getWecomCount: () => wecomCount
  }, overrides)
}

test('worker upload without event stage uses project current stage and stays pending', async () => {
  const options = baseOptions()
  const res = await createStageLog(options)
  const log = Object.values(options.db.data.stage_logs)[0]
  assert.equal(res.autoApproved, false)
  assert.equal(log.stage, '木工/吊顶')
  assert.equal(log.stageCode, 'carpentry_ceiling')
  assert.equal(log.reviewStatus, 'pending')
  assert.equal(log.ownerVisible, false)
  assert.equal(options.getWecomCount(), 1)
  assert.equal(options.getOwnerNoticeCount(), 0)
})

test('upload without event stage and project current stage returns STAGE_REQUIRED', async () => {
  const options = baseOptions()
  options.project = { _id: 'p1', name: '测试工地', tenantId: 't1' }
  options.db.data.projects.p1 = options.project
  await assert.rejects(
    () => createStageLog(options),
    (error) => error.code === 'STAGE_REQUIRED'
  )
})

test('boss_qi self upload is approved, owner visible, and not pending', async () => {
  const options = baseOptions({
    user: { _id: 'boss1', role: 'boss_qi', name: '老齐' },
    openid: 'openid_boss'
  })
  const res = await createStageLog(options)
  const log = Object.values(options.db.data.stage_logs)[0]
  assert.equal(res.autoApproved, true)
  assert.equal(log.reviewStatus, 'approved')
  assert.equal(log.ownerVisible, true)
  assert.equal(log.approvalMode, 'reviewer_self_upload')
  assert.equal(Object.values(options.db.data.stage_logs).filter((item) => item.reviewStatus === 'pending').length, 0)
  assert.equal(options.getOwnerNoticeCount(), 1)
  assert.equal(options.getWecomCount(), 0)
})

test('auto approved upload sends owner notice once and records notice failure without rollback', async () => {
  const options = baseOptions({
    user: { _id: 'boss1', role: 'boss_qi', name: '老齐' },
    sendOwnerNotice: async () => {
      throw new Error('订阅消息失败')
    }
  })
  const res = await createStageLog(options)
  const log = Object.values(options.db.data.stage_logs)[0]
  assert.equal(log.reviewStatus, 'approved')
  assert.equal(log.ownerVisible, true)
  assert.equal(res.noticeStatus, 'failed')
  assert.match(res.noticeError, /订阅消息失败/)
  assert.equal(log.noticeStatus, 'failed')
})
