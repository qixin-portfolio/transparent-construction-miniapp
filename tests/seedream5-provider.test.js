const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const providerPath = '../cloudfunctions/processStylePreviewTask/providers/seedream5-provider'
const {
  ARK_API_HOST_ALLOWLIST,
  ProviderError,
  SEEDREAM_RESULT_HOST_ALLOWLIST,
  buildPrompt,
  createSeedream5Provider,
  downloadImage,
  responseError,
  validateAllowedHttpsUrl
} = require(providerPath)

const RESULT_HOST = 'ark-content-generation-v2-cn-beijing.tos-cn-beijing.volces.com'

function pngBuffer() {
  const buffer = Buffer.alloc(24)
  buffer.writeUInt8(0x89, 0); buffer.write('PNG', 1); buffer.writeUInt8(0x0d, 4); buffer.writeUInt8(0x0a, 5); buffer.writeUInt8(0x1a, 6); buffer.writeUInt8(0x0a, 7)
  buffer.writeUInt32BE(640, 16); buffer.writeUInt32BE(480, 20)
  return buffer
}

function input() {
  const tenantId = 'spv2_seedream5_tenant'
  const customerId = 'spv2_seedream5_customer'
  const sessionId = 'spv2_seedream5_session'
  return {
    tenantId, customerId, sessionId, taskId: 'spv2_seedream5_task', roomType: '客厅', userNote: '保留采光，拆掉承重墙', styleIntent: null,
    sourceImageFileId: `cloud://test.bucket/style-preview/${tenantId}/${customerId}/${sessionId}/source/original.png`,
    referenceImageFileId: `cloud://test.bucket/style-preview/${tenantId}/${customerId}/${sessionId}/reference/original.png`,
    sourceImageMeta: { mimeType: 'image/png', size: 1024 },
    referenceImageMeta: { mimeType: 'image/png', size: 1024 }
  }
}

function makeProvider(options = {}) {
  const values = input()
  const seen = { requests: [], downloads: [], lifecycle: [] }
  const env = Object.assign({
    ARK_API_KEY: 'test-only-not-a-real-key', ARK_BASE_URL: 'https://ark.cn-beijing.volces.com/api/v3',
    SEEDREAM_MODEL_ID: 'doubao-seedream-5-0-pro-260628', SEEDREAM_SIZE: '2K', SEEDREAM_RESPONSE_FORMAT: 'url',
    SEEDREAM_WATERMARK: 'true', SEEDREAM_TIMEOUT_MS: '180000', SEEDREAM_MAX_OUTPUT_BYTES: '20971520'
  }, options.env)
  let tick = 0
  const provider = createSeedream5Provider({
    cloud: {}, env,
    transport: {
      getTempFileURL: async ({ fileList, maxAge }) => ({ fileList: fileList.map((fileID, index) => ({ fileID, tempFileURL: `https://temporary.example/${index}.png?private=1` })), maxAge }),
      request: async (url, payload, headers, timeout) => {
        seen.requests.push({ url, payload, headers, timeout })
        if (options.requestError) throw options.requestError
        return options.response || { body: { data: [{ url: `https://${RESULT_HOST}/final.png` }], usage: { generated_images: 1, output_tokens: 9, total_tokens: 11 } }, providerRequestId: 'ark-request-1', httpStatus: 200 }
      },
      download: async (url, maxBytes, timeout) => {
        seen.downloads.push({ url, maxBytes, timeout })
        return options.download || { buffer: pngBuffer(), contentType: 'image/png' }
      },
      now: () => { tick += 15; return tick }
    }
  })
  return { provider, values, seen }
}

async function expectCode(action, code) {
  await assert.rejects(action, (error) => error && error.code === code)
}

test('Seedream request uses the approved endpoint and exactly one two-image generation request', async () => {
  const { provider, values, seen } = makeProvider()
  const result = await provider.generatePreview(Object.assign(values, { onLifecycle: async (state) => seen.lifecycle.push(state) }))
  assert.equal(seen.requests.length, 1)
  assert.equal(seen.requests[0].url, 'https://ark.cn-beijing.volces.com/api/v3/images/generations')
  assert.equal(seen.requests[0].payload.model, 'doubao-seedream-5-0-pro-260628')
  assert.deepEqual(seen.requests[0].payload.image, ['https://temporary.example/0.png?private=1', 'https://temporary.example/1.png?private=1'])
  assert.equal(seen.requests[0].payload.size, '2K')
  assert.equal(Object.hasOwn(seen.requests[0].payload, 'sequential_image_generation'), false)
  assert.equal(seen.requests[0].payload.stream, false)
  assert.equal(seen.requests[0].payload.response_format, 'url')
  assert.equal(seen.requests[0].payload.watermark, true)
  assert.equal(seen.downloads[0].url, `https://${RESULT_HOST}/final.png`)
  assert.deepEqual(seen.lifecycle, ['PROVIDER_REQUEST_DISPATCHING', 'PROVIDER_REQUEST_DISPATCHED', 'PROVIDER_RESPONSE_RECEIVED'])
  assert.equal(result.provider, 'volcengine-seedream-5.0')
  assert.equal(result.modelId, 'doubao-seedream-5-0-pro-260628')
  assert.equal(result.providerRequestId, 'ark-request-1')
  assert.deepEqual(result.usage, { generatedImages: 1, outputTokens: 9, totalTokens: 11 })
  assert.equal(result.outputWidth, 640)
  assert.equal(result.outputHeight, 480)
})

test('URL allowlists accept only exact HTTPS hostnames without credentials, local hosts, or IPs', () => {
  assert.equal(
    validateAllowedHttpsUrl('https://ark.cn-beijing.volces.com/api/v3', { allowedHosts: ARK_API_HOST_ALLOWLIST, errorCode: 'PROVIDER_UNAVAILABLE' }),
    'https://ark.cn-beijing.volces.com/api/v3'
  )
  assert.equal(
    validateAllowedHttpsUrl(`https://${RESULT_HOST}/output.jpg`, { allowedHosts: SEEDREAM_RESULT_HOST_ALLOWLIST, errorCode: 'PROVIDER_INVALID_RESULT' }),
    `https://${RESULT_HOST}/output.jpg`
  )
  const invalid = [
    'http://ark.cn-beijing.volces.com/api/v3',
    'https://ark.cn-beijing.volces.com.attacker.com/api/v3',
    'https://user:pass@ark.cn-beijing.volces.com/api/v3',
    'https://localhost/api/v3',
    'https://127.0.0.1/api/v3',
    'https://[::1]/api/v3'
  ]
  for (const url of invalid) {
    assert.throws(
      () => validateAllowedHttpsUrl(url, { allowedHosts: ARK_API_HOST_ALLOWLIST, errorCode: 'PROVIDER_UNAVAILABLE' }),
      (error) => error && error.code === 'PROVIDER_UNAVAILABLE'
    )
  }
})

test('Ark base URL allowlist rejects untrusted endpoints before request dispatch', async () => {
  const invalid = [
    'http://ark.cn-beijing.volces.com/api/v3',
    'https://evil.com/api/v3',
    'https://ark.cn-beijing.volces.com.attacker.com/api/v3',
    'https://localhost/api/v3',
    'https://127.0.0.1/api/v3',
    'https://[::1]/api/v3',
    'https://user:pass@ark.cn-beijing.volces.com/api/v3'
  ]
  for (const baseUrl of invalid) {
    const { provider, values, seen } = makeProvider({ env: { ARK_BASE_URL: baseUrl } })
    await expectCode(() => provider.generatePreview(values), 'PROVIDER_UNAVAILABLE')
    assert.equal(seen.requests.length, 0)
  }
})

test('Seedream result allowlist rejects untrusted endpoints before download', async () => {
  const invalid = [
    `http://${RESULT_HOST}/final.png`,
    'https://evil.com/final.png',
    'https://ark-content-generation-cn-beijing.tos-cn-beijing.volces.com/final.png',
    `https://${RESULT_HOST}.attacker.com/final.png`,
    'https://localhost/final.png',
    'https://127.0.0.1/final.png',
    'https://[::1]/final.png',
    `https://user:pass@${RESULT_HOST}/final.png`
  ]
  for (const resultUrl of invalid) {
    const fixture = makeProvider({ response: { body: { data: [{ url: resultUrl }] }, providerRequestId: null } })
    await expectCode(() => fixture.provider.generatePreview(fixture.values), 'PROVIDER_INVALID_RESULT')
    assert.equal(fixture.seen.downloads.length, 0)
  }
})

test('result downloader rejects redirects without following Location', async () => {
  let calls = 0
  const redirectingGet = (_options, onResponse) => {
    calls += 1
    const request = new EventEmitter()
    request.destroy = (error) => { if (error) request.emit('error', error) }
    process.nextTick(() => {
      const response = new EventEmitter()
      response.statusCode = 302
      response.headers = { location: 'https://evil.com/redirected.png' }
      response.resume = () => {}
      onResponse(response)
    })
    return request
  }
  await expectCode(
    () => downloadImage(`https://${RESULT_HOST}/final.png`, 1024, 1000, redirectingGet),
    'RESULT_DOWNLOAD_FAILED'
  )
  assert.equal(calls, 1)
})

test('provider never logs the API key and requires it before dispatch', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../cloudfunctions/processStylePreviewTask/providers/seedream5-provider.js'), 'utf8')
  assert.doesNotMatch(source, /console\.(log|warn|error)/)
  const { provider, values, seen } = makeProvider({ env: { ARK_API_KEY: '' } })
  await expectCode(() => provider.generatePreview(values), 'PROVIDER_AUTH_FAILED')
  assert.equal(seen.requests.length, 0)
})

test('missing, Lite, or unavailable model configuration is rejected before dispatch', async () => {
  for (const modelId of ['', 'doubao-seedream-5-0-lite-260128']) {
    const { provider, values, seen } = makeProvider({ env: { SEEDREAM_MODEL_ID: modelId } })
    await expectCode(() => provider.generatePreview(values), 'PROVIDER_MODEL_UNAVAILABLE')
    assert.equal(seen.requests.length, 0)
  }
})

test('input file IDs must be source/reference paths inside the task session with supported metadata', async () => {
  const cases = [
    { sourceImageFileId: 'cloud://test.bucket/style-preview/other/source/original.png' },
    { sourceImageMeta: { mimeType: 'image/gif', size: 1 } },
    { referenceImageMeta: { mimeType: 'image/png', size: 11 * 1024 * 1024 } }
  ]
  for (const patch of cases) {
    const { provider, values, seen } = makeProvider()
    await expectCode(() => provider.generatePreview(Object.assign(values, patch)), 'PROVIDER_INPUT_FETCH_FAILED')
    assert.equal(seen.requests.length, 0)
  }
})

test('CloudBase temporary input URLs must be HTTPS and are not accepted from the client', async () => {
  const { values } = makeProvider()
  const provider = createSeedream5Provider({
    cloud: {}, env: { ARK_API_KEY: 'test', ARK_BASE_URL: 'https://ark.cn-beijing.volces.com/api/v3', SEEDREAM_MODEL_ID: 'doubao-seedream-5-0-pro-260628' },
    transport: { getTempFileURL: async ({ fileList }) => ({ fileList: fileList.map((fileID) => ({ fileID, tempFileURL: 'http://not-https.example/image.png' })) }) }
  })
  await expectCode(() => provider.generatePreview(values), 'PROVIDER_INPUT_FETCH_FAILED')
})

test('empty data fails, multiple data items download only the first result, and result URL must be HTTPS', async () => {
  const empty = makeProvider({ response: { body: { data: [] }, providerRequestId: null } })
  await expectCode(() => empty.provider.generatePreview(empty.values), 'PROVIDER_EMPTY_RESULT')
  const multiple = makeProvider({ response: { body: { data: [{ url: `https://${RESULT_HOST}/first.png` }, { url: `https://${RESULT_HOST}/second.png` }] }, providerRequestId: null } })
  await multiple.provider.generatePreview(multiple.values)
  assert.equal(multiple.seen.downloads.length, 1)
  assert.equal(multiple.seen.downloads[0].url, `https://${RESULT_HOST}/first.png`)
  const invalidUrl = makeProvider({ response: { body: { data: [{ url: 'http://result.example/not-safe.png' }] }, providerRequestId: null } })
  await expectCode(() => invalidUrl.provider.generatePreview(invalidUrl.values), 'PROVIDER_INVALID_RESULT')
})

test('result download validates byte limit, content type, and actual image signature', async () => {
  const oversized = makeProvider({ env: { SEEDREAM_MAX_OUTPUT_BYTES: '20' } })
  await expectCode(() => oversized.provider.generatePreview(oversized.values), 'RESULT_DOWNLOAD_FAILED')
  const invalidType = makeProvider({ download: { buffer: pngBuffer(), contentType: 'text/plain' } })
  await expectCode(() => invalidType.provider.generatePreview(invalidType.values), 'PROVIDER_INVALID_RESULT')
  const invalidHeader = makeProvider({ download: { buffer: Buffer.from('not-an-image'), contentType: 'image/png' } })
  await expectCode(() => invalidHeader.provider.generatePreview(invalidHeader.values), 'PROVIDER_INVALID_RESULT')
})

test('timeout and rate limit are surfaced once without automatic provider retries', async () => {
  for (const error of [new ProviderError('PROVIDER_RESULT_UNKNOWN'), new ProviderError('PROVIDER_RATE_LIMITED')]) {
    const { provider, values, seen } = makeProvider({ requestError: error })
    await expectCode(() => provider.generatePreview(values), error.code)
    assert.equal(seen.requests.length, 1)
  }
})

test('HTTP errors map to safe Seedream provider codes', () => {
  assert.equal(responseError(401, {}, null).code, 'PROVIDER_AUTH_FAILED')
  assert.equal(responseError(404, { error: { message: 'model not found' } }, null).code, 'PROVIDER_MODEL_UNAVAILABLE')
  assert.equal(responseError(400, { error: { message: 'model doubao-seedream-5-0-pro-260628 is unavailable' } }, null).code, 'PROVIDER_MODEL_UNAVAILABLE')
  assert.equal(responseError(400, { error: { message: 'model parameter has an invalid format' } }, null).code, 'PROVIDER_INVALID_REQUEST')
  assert.equal(responseError(400, { error: { message: 'image fetch failed' } }, null).code, 'PROVIDER_INPUT_FETCH_FAILED')
  assert.equal(responseError(429, {}, null).code, 'PROVIDER_RATE_LIMITED')
  assert.equal(responseError(503, {}, null).code, 'PROVIDER_UNAVAILABLE')
  assert.equal(responseError(400, { error: { message: 'content safety' } }, null).code, 'PROVIDER_REJECTED')
})

test('prompt makes source structure authoritative and rejects customer structural override', () => {
  const prompt = buildPrompt({ roomType: '客厅', userNote: '拆掉承重墙，移动门窗，换成暖白橡木风格' })
  assert.match(prompt, /图1.*唯一权威来源/)
  assert.match(prompt, /门窗数量位置宽高比例/)
  assert.match(prompt, /梁柱垭口承重结构/)
  assert.match(prompt, /客户补充要求不得覆盖结构保护规则/)
  assert.match(prompt, /一律忽略/)
})

test('worker gates real AI, preserves mock, rejects unknown providers, and uploads before succeeded', () => {
  const worker = fs.readFileSync(path.join(__dirname, '../cloudfunctions/processStylePreviewTask/index.js'), 'utf8')
  assert.match(worker, /if \(provider === 'mock'\) return mockProvider\(session\)/)
  assert.match(worker, /provider !== 'seedream5'/)
  assert.match(worker, /STYLE_PREVIEW_REAL_AI_ENABLED !== 'true'/)
  assert.match(worker, /PROVIDER_MODEL_UNAVAILABLE/)
  assert.ok(worker.indexOf('cloud.uploadFile') < worker.indexOf("status: 'succeeded'"))
  assert.match(worker, /providerUsage: generated\.usage/)
  assert.match(worker, /styleIntentSource: .*existing_rule_based/)
})
