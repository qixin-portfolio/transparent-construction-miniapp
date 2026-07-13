const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const stageFlow = require('../../shared/stage-flow')
const { targets, generatedContent } = require('../../scripts/sync-stage-flow')

test('runtime stage-flow copies match the shared source', () => {
  const root = path.resolve(__dirname, '../..')
  targets.forEach(([source, copies]) => {
    copies.forEach((file) => {
      assert.equal(
        fs.readFileSync(path.join(root, file), 'utf8'),
        generatedContent(source),
        `${file} drifted from ${source}`
      )
    })
  })
})

test('generated runtime stage modules can be loaded from their deployment directories', () => {
  assert.equal(typeof require('../../cloudfunctions/submitStageLog/stage-flow').resolveStage, 'function')
  assert.equal(typeof require('../../cloudfunctions/reviewStageLog/owner-notice').createOwnerNoticeSender, 'function')
  assert.equal(typeof require('../../cloudfunctions/submitStageLog/access').assertProjectAccess, 'function')
})

test('missing event stage falls back to project current stage', () => {
  const stage = stageFlow.resolveSubmissionStage({}, {
    currentStage: '木工/吊顶',
    progress: 65
  })
  assert.equal(stage.code, 'carpentry_ceiling')
  assert.equal(stage.source, 'project_current')
})

test('event stage name without legal stageCode falls back to project current stage', () => {
  const stage = stageFlow.resolveSubmissionStage({ stage: '开工交底' }, {
    currentStage: '木工/吊顶',
    progress: 65
  })
  assert.equal(stage.code, 'carpentry_ceiling')
  assert.equal(stage.source, 'project_current')
})

test('missing event stage and project current stage requires explicit choice', () => {
  assert.throws(() => stageFlow.resolveSubmissionStage({}, {}), /请选择本次施工工序/)
})

test('older stage and lower progress do not regress project', () => {
  const result = stageFlow.buildProjectProgressPatch(
    { currentStage: '木工/吊顶', progress: 60 },
    { stage: '开工交底', progress: 10 },
    'NOW'
  )
  assert.equal(result.patch.currentStage, undefined)
  assert.equal(result.patch.progress, undefined)
  assert.equal(result.isHistoricalOrRework, true)
})

test('later stage advances project and progress', () => {
  const result = stageFlow.buildProjectProgressPatch(
    { currentStage: '开工交底', progress: 10 },
    { stage: '水电定位', progress: 20 },
    'NOW'
  )
  assert.equal(result.patch.currentStage, '水电定位')
  assert.equal(result.patch.currentStageCode, 'water_electric_position')
  assert.equal(result.patch.progress, 20)
})

test('delivered project status is not rewritten by progress patch', () => {
  const result = stageFlow.buildProjectProgressPatch(
    { currentStage: '竣工验收', progress: 100, statusCode: 'delivered', status: '已交付' },
    { stage: '开工交底', progress: 10 },
    'NOW'
  )
  assert.equal(result.projectWasDelivered, true)
  assert.equal(Object.prototype.hasOwnProperty.call(result.patch, 'status'), false)
  assert.equal(Object.prototype.hasOwnProperty.call(result.patch, 'statusCode'), false)
})
