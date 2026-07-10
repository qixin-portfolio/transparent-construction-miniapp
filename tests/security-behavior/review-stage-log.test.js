const test = require('node:test')
const assert = require('node:assert/strict')

const { executeStageLogReview } = require('../../cloudfunctions/reviewStageLog/reviewService')

function createStore({ log, project }) {
  let queue = Promise.resolve()
  const state = {
    log: Object.assign({}, log),
    project: Object.assign({}, project),
    notices: [],
    noticeUpdates: []
  }
  return {
    state,
    runTransaction(work) {
      const result = queue.then(() => work({
        getStageLog: async () => Object.assign({}, state.log),
        getProject: async () => Object.assign({}, state.project),
        updateStageLog: async (patch, reviewRecord) => {
          state.log = Object.assign({}, state.log, patch)
          state.log.reviewRecords = (state.log.reviewRecords || []).concat(reviewRecord)
        },
        updatePhotos: async () => {},
        updateProject: async (projectId, patch) => {
          assert.equal(projectId, state.project._id)
          state.project = Object.assign({}, state.project, patch)
        }
      }))
      queue = result.catch(() => {})
      return result
    },
    sendNotice: async () => {
      state.notices.push('sent')
      return { sentCount: 1, totalCount: 1 }
    },
    updateNoticeStatus: async (status, error) => state.noticeUpdates.push({ status, error })
  }
}

function input(action = 'approve') {
  return {
    stageLogId: 'log-1',
    action,
    tenantId: 'tenant-a',
    reviewer: { userId: 'user-1', openid: 'admin-openid', name: '管理员', role: 'admin' },
    now: '2026-07-10T10:00:00.000Z'
  }
}

test('reviewStageLog approves a pending log once', async () => {
  const store = createStore({
    log: { _id: 'log-1', projectId: 'project-1', tenantId: 'tenant-a', reviewStatus: 'pending', progress: 60, stage: '瓦工' },
    project: { _id: 'project-1', tenantId: 'tenant-a', progress: 50, currentStage: '水电' }
  })
  const result = await executeStageLogReview(Object.assign(store, input()))
  assert.equal(result.ok, true)
  assert.equal(store.state.log.reviewStatus, 'approved')
  assert.equal(store.state.log.previousReviewStatus, 'pending')
  assert.equal(store.state.log.noticeStatus, 'pending')
  assert.equal(store.state.notices.length, 1)
})

test('reviewStageLog rejects a previously reviewed log', async () => {
  const store = createStore({
    log: { _id: 'log-1', projectId: 'project-1', tenantId: 'tenant-a', reviewStatus: 'approved' },
    project: { _id: 'project-1', tenantId: 'tenant-a', progress: 20 }
  })
  await assert.rejects(executeStageLogReview(Object.assign(store, input())), (error) => error.code === 'ALREADY_REVIEWED')
  assert.equal(store.state.notices.length, 0)
})

test('reviewStageLog allows only one concurrent approval', async () => {
  const store = createStore({
    log: { _id: 'log-1', projectId: 'project-1', tenantId: 'tenant-a', reviewStatus: 'pending', progress: 40 },
    project: { _id: 'project-1', tenantId: 'tenant-a', progress: 20 }
  })
  const results = await Promise.allSettled([
    executeStageLogReview(Object.assign(store, input())),
    executeStageLogReview(Object.assign(store, input()))
  ])
  assert.equal(results.filter((item) => item.status === 'fulfilled').length, 1)
  assert.equal(results.filter((item) => item.status === 'rejected' && item.reason.code === 'ALREADY_REVIEWED').length, 1)
  assert.equal(store.state.notices.length, 1)
})

test('reviewStageLog never decreases project progress', async () => {
  const store = createStore({
    log: { _id: 'log-1', projectId: 'project-1', tenantId: 'tenant-a', reviewStatus: 'pending', progress: 30, stage: '水电' },
    project: { _id: 'project-1', tenantId: 'tenant-a', progress: 80, currentStage: '安装' }
  })
  await executeStageLogReview(Object.assign(store, input()))
  assert.equal(store.state.project.progress, 80)
})

test('reviewStageLog does not replace a newer stage with an old stage', async () => {
  const store = createStore({
    log: { _id: 'log-1', projectId: 'project-1', tenantId: 'tenant-a', reviewStatus: 'pending', progress: 50, stage: '瓦工' },
    project: { _id: 'project-1', tenantId: 'tenant-a', progress: 80, currentStage: '安装' }
  })
  await executeStageLogReview(Object.assign(store, input()))
  assert.equal(store.state.project.currentStage, '安装')
})

test('reviewStageLog does not notify twice for a repeated request', async () => {
  const store = createStore({
    log: { _id: 'log-1', projectId: 'project-1', tenantId: 'tenant-a', reviewStatus: 'pending', progress: 40 },
    project: { _id: 'project-1', tenantId: 'tenant-a', progress: 20 }
  })
  await executeStageLogReview(Object.assign(store, input()))
  await assert.rejects(executeStageLogReview(Object.assign(store, input())))
  assert.equal(store.state.notices.length, 1)
})

test('reviewStageLog keeps a committed review successful when notice tracking fails', async () => {
  const store = createStore({
    log: { _id: 'log-1', projectId: 'project-1', tenantId: 'tenant-a', reviewStatus: 'pending', progress: 40 },
    project: { _id: 'project-1', tenantId: 'tenant-a', progress: 20 }
  })
  store.updateNoticeStatus = async () => { throw new Error('tracking unavailable') }
  const result = await executeStageLogReview(Object.assign(store, input()))
  assert.equal(result.ok, true)
  assert.equal(result.noticeTrackingError, 'tracking unavailable')
  assert.equal(store.state.log.reviewStatus, 'approved')
})
