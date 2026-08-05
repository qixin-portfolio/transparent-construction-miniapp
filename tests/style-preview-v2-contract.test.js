const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

test('test deployment config is isolated, mock-only, and contains no production target', () => {
  const config = JSON.parse(read('cloudbaserc.style-preview-test.json'))
  assert.equal(config.envId, 'shengjing-style-test-d3ac90f38b1')
  assert.equal(JSON.stringify(config).includes('cloud1-d4g7zh8kpca0e26d5'), false)
  assert.equal(config.functions.length, 2)
  assert.deepEqual(config.functions.map((item) => item.name), ['stylePreviewApi', 'processStylePreviewTask'])
  assert.equal(config.functions[0].envVariables.STYLE_PREVIEW_PROVIDER, 'mock')
  assert.equal(config.functions[0].envVariables.STYLE_PREVIEW_REAL_AI_ENABLED, 'false')
  assert.equal(Object.hasOwn(config.functions[1], 'asyncRunEnable'), false)
})

test('isolated V2 mini program build initializes CloudBase in the test environment', () => {
  const app = read('miniprogram/app.js')
  assert.match(app, /envId:\s*'shengjing-style-test-d3ac90f38b1'/)
  assert.doesNotMatch(app, /envId:\s*'cloud1-d4g7zh8kpca0e26d5'/)
})

test('deployment script refuses an implicit or production target before invoking CloudBase', () => {
  const script = read('scripts/deploy-style-preview-v2-test.mjs')
  assert.match(script, /pass exactly --env shengjing-style-test-d3ac90f38b1/)
  assert.match(script, /target !== TEST_ENV/)
  assert.match(script, /PRODUCTION_DATA_ACCESS=false/)
  assert.match(script, /stylePreviewApi/)
  assert.match(script, /processStylePreviewTask/)
  assert.match(script, /style_preview_sessions/)
  assert.match(script, /style_preview_tasks/)
  assert.match(script, /tenant_idempotency_unique/)
  assert.doesNotMatch(script, /submitStageLog|reviewStageLog|sendOwnerNotice|listMyProjects/)
})

test('real pages require server access while Mock remains a separate explicit branch', () => {
  const mockMode = read('miniprogram/utils/style-preview-mock-mode.js')
  const start = read('miniprogram/subpackages/style-preview/pages/start/index.js')
  const processing = read('miniprogram/subpackages/style-preview/pages/processing/index.js')
  const result = read('miniprogram/subpackages/style-preview/pages/result/index.js')
  const history = read('miniprogram/subpackages/style-preview/pages/history/index.js')
  const customerEdit = read('miniprogram/subpackages/internal/pages/customer-edit/customer-edit.js')
  assert.match(mockMode, /options\[optionName\]/)
  assert.match(mockMode, /wx\.getSystemInfoSync\(\)\.platform === 'devtools'/)
  assert.match(start, /mockModeEnabled\(options\)/)
  assert.match(processing, /mockModeEnabled\(options\)/)
  assert.match(result, /mockModeEnabled\(options\)/)
  assert.match(history, /mockModeEnabled\(options\)/)
  assert.match(customerEdit, /mockModeEnabled\(options, 'stylePreviewMock'\)/)
  assert.match(start, /realService\.checkAccess\(\)/)
  assert.match(processing, /realService\.getTask/)
  assert.match(processing, /task\.status === 'failed'/)
  assert.match(processing, /async retry\(\)/)
  assert.match(processing, /mockService\.completeSession/)
})

test('Mock URL parameters are ignored outside DevTools', () => {
  const helperPath = path.join(root, 'miniprogram/utils/style-preview-mock-mode.js')
  const originalWx = global.wx
  global.wx = { getSystemInfoSync() { return { platform: 'ios' } } }
  delete require.cache[require.resolve(helperPath)]
  try {
    const { mockModeEnabled } = require(helperPath)
    assert.equal(mockModeEnabled({ mock: '1' }), false)
    assert.equal(mockModeEnabled({ stylePreviewMock: '1' }, 'stylePreviewMock'), false)
  } finally {
    global.wx = originalWx
    delete require.cache[require.resolve(helperPath)]
  }
})

test('server task code has tenant gates, idempotency, safe errors, and transactional claiming', () => {
  const api = read('cloudfunctions/stylePreviewApi/index.js')
  const worker = read('cloudfunctions/processStylePreviewTask/index.js')
  assert.match(api, /STYLE_PREVIEW_FEATURE_ENABLED === 'true'/)
  assert.match(api, /idempotencyKey/)
  assert.match(api, /const baseKey = buildKey/)
  assert.match(api, /\$\{baseKey\}:retry:\$\{attempts\.total \+ 1\}/)
  assert.match(api, /latestTask && ACTIVE_TASK_STATES\.indexOf\(latestTask\.status\)/)
  assert.match(api, /STYLE_PREVIEW_TENANT_DAILY_LIMIT/)
  assert.match(api, /cloud\.downloadFile/)
  assert.match(worker, /db\.runTransaction/)
  assert.match(worker, /context\.OPENID/)
  assert.match(worker, /status: 'succeeded'/)
  assert.match(worker, /const completedSession = Object\.assign\(\{\}, session/)
  assert.match(worker, /delete completedSession\._id/)
  assert.match(worker, /\.doc\(task\.sessionId\)\.set\(\{ data: completedSession \}\)/)
})

test('cross-tenant customers are explicitly denied and real feedback retains all fields', () => {
  const api = read('cloudfunctions/stylePreviewApi/index.js')
  const service = read('miniprogram/subpackages/style-preview/services/real-preview-service.js')
  const result = read('miniprogram/subpackages/style-preview/pages/result/index.js')
  assert.match(api, /customer\.tenantId && customer\.tenantId !== actor\.tenantId\) throw failure\('CUSTOMER_ACCESS_DENIED'\)/)
  assert.match(api, /function customerOwnedBy\(actor, customer\)/)
  assert.match(api, /customer\.ownerUserId === actor\.user\._id/)
  assert.match(api, /ownerUserId: actor\.user\._id/)
  assert.match(api, /const sessionId = crypto\.randomUUID\(\)/)
  assert.match(api, /\.doc\(sessionId\)\.set\(\{ data \}\)/)
  assert.match(service, /rating: feedback\.rating/)
  assert.match(service, /reason: feedback\.reason/)
  assert.match(service, /note: feedback\.note/)
  assert.match(result, /onFeedbackRating/)
  assert.match(result, /onFeedbackReason/)
  assert.match(api, /FEEDBACK_SAVE_FAILED: '反馈保存失败，请稍后重试'/)
  assert.match(api, /createdAt: new Date\(\)/)
  assert.match(api, /const feedbackSession = Object\.assign\(\{\}, session/)
  assert.match(api, /\.doc\(session\._id\)\.set\(\{ data: feedbackSession \}\)/)
})
