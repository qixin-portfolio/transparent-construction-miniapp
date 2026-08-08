const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const securityPath = '../cloudfunctions/stylePreviewApi/style-preview-security'
const {
  LEGACY_DEFAULT_TENANT_ID,
  assertImageExtensionMatchesMime,
  customerTenantScope,
  filterCustomersForTenant,
  imageInfo,
  isCustomerTenantAllowed,
  validateStylePreviewFileId
} = require(securityPath)

const TEST_ENV = 'shengjing-style-test-d3ac90f38b1'
const FILE_CONTEXT = {
  tenantId: 'tenant-a',
  customerId: 'customer-a',
  sessionId: 'session-a'
}

function fileId(kind, extension = 'jpg') {
  return `cloud://test.bucket/style-preview/${FILE_CONTEXT.tenantId}/${FILE_CONTEXT.customerId}/${FILE_CONTEXT.sessionId}/${kind}/original.${extension}`
}

function expectInvalidFile(patch) {
  assert.throws(
    () => validateStylePreviewFileId(Object.assign({}, FILE_CONTEXT, { kind: 'source', fileId: fileId('source') }, patch)),
    (error) => error && error.code === 'INVALID_IMAGE'
  )
}

function loadRealService(cloudCalls, uploads) {
  const cloudServicePath = path.join(root, 'miniprogram/services/cloud.js')
  const previewServicePath = path.join(root, 'miniprogram/subpackages/style-preview/services/real-preview-service.js')
  delete require.cache[require.resolve(cloudServicePath)]
  delete require.cache[require.resolve(previewServicePath)]
  global.wx = {
    cloud: {
      callFunction(options) {
        cloudCalls.push(options)
        const action = options.data.action
        if (action === 'checkAccess') return Promise.resolve({ result: { allowed: true } })
        if (action === 'createSession') {
          return Promise.resolve({
            result: {
              sessionId: FILE_CONTEXT.sessionId,
              upload: {
                source: `style-preview/${FILE_CONTEXT.tenantId}/${FILE_CONTEXT.customerId}/${FILE_CONTEXT.sessionId}/source/original.jpg`,
                reference: `style-preview/${FILE_CONTEXT.tenantId}/${FILE_CONTEXT.customerId}/${FILE_CONTEXT.sessionId}/reference/original.jpg`
              }
            }
          })
        }
        if (action === 'createTask') return Promise.resolve({ result: { taskId: 'task-a', sessionId: FILE_CONTEXT.sessionId } })
        return Promise.resolve({ result: {} })
      },
      uploadFile(options) {
        uploads.push(options)
        return Promise.resolve({ fileID: `cloud://test.bucket/${options.cloudPath}` })
      }
    }
  }
  return require(previewServicePath)
}

test('global app CloudBase environment remains production', () => {
  const app = read('miniprogram/app.js')
  assert.match(app, /envId:\s*'cloud1-d4g7zh8kpca0e26d5'/)
  assert.doesNotMatch(app, /envId:\s*'shengjing-style-test-d3ac90f38b1'/)
})

test('Style Preview calls and uploads explicitly select the isolated test environment', async () => {
  const cloudCalls = []
  const uploads = []
  const originalGetApp = global.getApp
  global.getApp = () => { throw new Error('Style Preview must not read globalData.envId') }
  try {
    const service = loadRealService(cloudCalls, uploads)
    await service.checkAccess()
    await service.createPreview({
      customerId: FILE_CONTEXT.customerId,
      sourceImage: '/tmp/source.jpg',
      referenceImage: '/tmp/reference.png',
      roomType: '客厅',
      note: ''
    })
    assert.ok(cloudCalls.length >= 5)
    assert.ok(cloudCalls.every((item) => item.config && item.config.env === TEST_ENV))
    assert.equal(uploads.length, 2)
    assert.ok(uploads.every((item) => item.config && item.config.env === TEST_ENV))
  } finally {
    global.getApp = originalGetApp
    delete global.wx
  }
})

test('explicit cross-tenant customer access is denied', () => {
  assert.equal(isCustomerTenantAllowed('tenant-a', 'tenant-b'), false)
})

test('non-default tenant cannot access a legacy null-tenant customer', () => {
  assert.equal(isCustomerTenantAllowed('tenant-b', null), false)
})

test('non-default tenant cannot access a legacy empty-tenant customer', () => {
  assert.equal(isCustomerTenantAllowed('tenant-b', ''), false)
})

test('default tenant can access a legacy null-tenant customer', () => {
  assert.equal(isCustomerTenantAllowed(LEGACY_DEFAULT_TENANT_ID, null), true)
})

test('default tenant can access a legacy empty-tenant customer', () => {
  assert.equal(isCustomerTenantAllowed(LEGACY_DEFAULT_TENANT_ID, ''), true)
})

test('non-default customer listing excludes all legacy tenant records', () => {
  assert.deepEqual(customerTenantScope('tenant-b'), ['tenant-b'])
  const customers = filterCustomersForTenant('tenant-b', [
    { _id: 'explicit', tenantId: 'tenant-b' },
    { _id: 'other', tenantId: 'tenant-a' },
    { _id: 'legacy-null', tenantId: null },
    { _id: 'legacy-empty', tenantId: '' }
  ])
  assert.deepEqual(customers.map((item) => item._id), ['explicit'])
})

test('exact current-session source fileID is allowed', () => {
  const result = validateStylePreviewFileId(Object.assign({}, FILE_CONTEXT, { kind: 'source', fileId: fileId('source') }))
  assert.equal(result.mimeType, 'image/jpeg')
})

test('exact current-session reference fileID is allowed', () => {
  const result = validateStylePreviewFileId(Object.assign({}, FILE_CONTEXT, { kind: 'reference', fileId: fileId('reference', 'png') }))
  assert.equal(result.mimeType, 'image/png')
})

test('cross-tenant fileID is denied', () => {
  expectInvalidFile({ fileId: fileId('source').replace('/tenant-a/', '/tenant-b/') })
})

test('cross-customer fileID is denied', () => {
  expectInvalidFile({ fileId: fileId('source').replace('/customer-a/', '/customer-b/') })
})

test('cross-session fileID is denied', () => {
  expectInvalidFile({ fileId: fileId('source').replace('/session-a/', '/session-b/') })
})

test('source and reference fileIDs cannot be swapped', () => {
  expectInvalidFile({ fileId: fileId('reference') })
})

test('extra prefix containing a valid Style Preview substring is denied', () => {
  expectInvalidFile({ fileId: `cloud://test.bucket/evil/style-preview/${FILE_CONTEXT.tenantId}/${FILE_CONTEXT.customerId}/${FILE_CONTEXT.sessionId}/source/original.jpg` })
})

test('fileID traversal segments are denied', () => {
  expectInvalidFile({ fileId: `cloud://test.bucket/style-preview/${FILE_CONTEXT.tenantId}/${FILE_CONTEXT.customerId}/${FILE_CONTEXT.sessionId}/source/../source/original.jpg` })
})

test('unsupported image extensions are denied', () => {
  expectInvalidFile({ fileId: fileId('source', 'gif') })
})

test('file extension must match MIME detected from magic bytes', () => {
  const validation = validateStylePreviewFileId(Object.assign({}, FILE_CONTEXT, { kind: 'source', fileId: fileId('source', 'png') }))
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00])
  const actual = imageInfo(jpeg)
  assert.throws(
    () => assertImageExtensionMatchesMime(validation, actual.mimeType),
    (error) => error && error.code === 'INVALID_IMAGE'
  )
})
