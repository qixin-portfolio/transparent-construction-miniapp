const https = require('https')

const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_INPUT_BYTES = 10 * 1024 * 1024

class ProviderError extends Error {
  constructor(code, details = {}) {
    super(code)
    this.code = code
    this.httpStatus = details.httpStatus || null
    this.providerRequestId = details.providerRequestId || null
  }
}

function required(value, code) {
  if (!String(value || '').trim()) throw new ProviderError(code)
  return String(value).trim()
}

function normalizeMimeType(value) {
  const mime = String(value || '').split(';')[0].trim().toLowerCase()
  return mime === 'image/jpg' ? 'image/jpeg' : mime
}

function extensionFor(mimeType) {
  return mimeType === 'image/png' ? 'png' : (mimeType === 'image/webp' ? 'webp' : 'jpg')
}

function imageInfo(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) throw new ProviderError('PROVIDER_INVALID_RESULT')
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    let offset = 2
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) break
      const marker = buffer[offset + 1]
      const length = buffer.readUInt16BE(offset + 2)
      if (length < 2 || offset + length + 2 > buffer.length) break
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { mimeType: 'image/jpeg', width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) }
      }
      offset += length + 2
    }
    return { mimeType: 'image/jpeg', width: null, height: null }
  }
  if (buffer.toString('ascii', 1, 4) === 'PNG') {
    return { mimeType: 'image/png', width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
  }
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { mimeType: 'image/webp', width: null, height: null }
  }
  throw new ProviderError('PROVIDER_INVALID_RESULT')
}

function buildPrompt({ roomType, userNote }) {
  return [
    '你将收到两张图片。',
    '图1是原始毛坯房现场照片，是空间结构、相机机位和透视关系的唯一权威来源。',
    '图2是客户喜欢的装修参考图，只用于参考装修风格、色彩、材质、家具语言、灯光氛围和软装方向。',
    '任务：将图1中的毛坯空间装修为图2所体现的风格，生成同一空间、同一机位、同一透视下的真实住宅室内摄影效果图。',
    '必须严格保持图1的原相机位置和拍摄方向、原始透视和视野范围、房间长宽高比例、所有墙体边界、门窗数量位置宽高比例和开启关系、梁柱垭口承重结构、顶面高度和转折关系、地面轮廓、主要管线设备点位与固定结构、各空间开口位置。',
    '图2只控制装修风格、主辅色搭配、墙地顶材质气质、家具造型语言、灯光氛围和软装方向。',
    '禁止改变房间形状、扩建或缩小空间、新增删除移动门窗、移动梁柱、改变层高或相机机位、改成另一套户型、使用超广角、生成户型图尺寸标注文字品牌Logo第三方水印、不可施工的悬浮结构或纯概念CG空间。',
    `房间类型：${String(roomType || '').trim() || '未指定'}`,
    `客户补充要求：${String(userNote || '').replace(/\s+/g, ' ').trim() || '无'}`,
    '客户补充要求不得覆盖结构保护规则；涉及拆墙、改窗、扩大空间等结构变化时一律忽略，只保留合法的风格和软装需求。',
    '视觉要求：真实中国住宅室内摄影，合理尺度，自然材质，可施工感，不过度豪华、样板间、磨皮和CG化；保持原图宽高比与构图；只输出一张最终效果图。'
  ].join('\n')
}

function validateInput({ sessionId, tenantId, customerId, sourceImageFileId, referenceImageFileId, sourceImageMeta, referenceImageMeta }) {
  const prefix = `style-preview/${tenantId}/${customerId}/${sessionId}/`
  const validateOne = (fileId, meta, kind) => {
    const id = required(fileId, 'PROVIDER_INPUT_FETCH_FAILED')
    if (id.indexOf('cloud://') !== 0 || id.indexOf(`${prefix}${kind}/`) === -1) throw new ProviderError('PROVIDER_INPUT_FETCH_FAILED')
    if (!meta || SUPPORTED_MIME_TYPES.indexOf(normalizeMimeType(meta.mimeType)) === -1 || !Number.isFinite(meta.size) || meta.size <= 0 || meta.size > MAX_INPUT_BYTES) {
      throw new ProviderError('PROVIDER_INPUT_FETCH_FAILED')
    }
    return id
  }
  return {
    sourceImageFileId: validateOne(sourceImageFileId, sourceImageMeta, 'source'),
    referenceImageFileId: validateOne(referenceImageFileId, referenceImageMeta, 'reference')
  }
}

function getHttpsUrl(value, code = 'PROVIDER_INVALID_RESULT') {
  try {
    const url = new URL(String(value || ''))
    if (url.protocol !== 'https:') throw new Error('protocol')
    return url.toString()
  } catch (_) {
    throw new ProviderError(code)
  }
}

function responseError(status, body, providerRequestId) {
  const text = JSON.stringify(body || {}).toLowerCase()
  if (/content|safety|moderation|policy/.test(text)) return new ProviderError('PROVIDER_REJECTED', { httpStatus: status, providerRequestId })
  if (status === 401 || status === 403) return new ProviderError('PROVIDER_AUTH_FAILED', { httpStatus: status, providerRequestId })
  if (status === 404 || /(?:model|endpoint).*(?:not found|unavailable|not available|does not exist)|(?:not found|unavailable|not available|does not exist).*(?:model|endpoint)/.test(text)) {
    return new ProviderError('PROVIDER_MODEL_UNAVAILABLE', { httpStatus: status, providerRequestId })
  }
  if (status === 429) return new ProviderError('PROVIDER_RATE_LIMITED', { httpStatus: status, providerRequestId })
  if (status >= 500) return new ProviderError('PROVIDER_UNAVAILABLE', { httpStatus: status, providerRequestId })
  if (status === 400 && /image|url|fetch|download/.test(text)) return new ProviderError('PROVIDER_INPUT_FETCH_FAILED', { httpStatus: status, providerRequestId })
  return new ProviderError('PROVIDER_INVALID_REQUEST', { httpStatus: status, providerRequestId })
}

function postJson(urlText, payload, headers, timeoutMs) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlText)
    const body = JSON.stringify(payload)
    const request = https.request({
      method: 'POST', hostname: url.hostname, path: `${url.pathname}${url.search}`, timeout: timeoutMs,
      headers: Object.assign({ 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, headers)
    }, (response) => {
      const chunks = []
      response.on('data', (chunk) => chunks.push(chunk))
      response.on('end', () => {
        let parsed
        try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') } catch (_) { reject(new ProviderError('PROVIDER_INVALID_RESULT', { httpStatus: response.statusCode })); return }
        const providerRequestId = response.headers['x-request-id'] || response.headers['x-tt-logid'] || null
        if (response.statusCode < 200 || response.statusCode >= 300) { reject(responseError(response.statusCode, parsed, providerRequestId)); return }
        resolve({ body: parsed, providerRequestId, httpStatus: response.statusCode })
      })
    })
    request.on('timeout', () => request.destroy(new ProviderError('PROVIDER_RESULT_UNKNOWN')))
    request.on('error', (error) => reject(error && error.code ? error : new ProviderError('PROVIDER_RESULT_UNKNOWN')))
    request.write(body)
    request.end()
  })
}

function downloadImage(urlText, maxBytes, timeoutMs) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlText)
    const request = https.get({ hostname: url.hostname, path: `${url.pathname}${url.search}`, timeout: timeoutMs }, (response) => {
      const contentType = normalizeMimeType(response.headers['content-type'])
      const contentLength = Number(response.headers['content-length'] || 0)
      if (response.statusCode < 200 || response.statusCode >= 300) { response.resume(); reject(new ProviderError('RESULT_DOWNLOAD_FAILED', { httpStatus: response.statusCode })); return }
      if (SUPPORTED_MIME_TYPES.indexOf(contentType) === -1 || (contentLength && contentLength > maxBytes)) { response.resume(); reject(new ProviderError('PROVIDER_INVALID_RESULT')); return }
      let total = 0
      const chunks = []
      response.on('data', (chunk) => {
        total += chunk.length
        if (total > maxBytes) request.destroy(new ProviderError('RESULT_DOWNLOAD_FAILED'))
        else chunks.push(chunk)
      })
      response.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType }))
    })
    request.on('timeout', () => request.destroy(new ProviderError('RESULT_DOWNLOAD_FAILED')))
    request.on('error', (error) => reject(error && error.code ? error : new ProviderError('RESULT_DOWNLOAD_FAILED')))
  })
}

function normalizedUsage(value) {
  const usage = value && typeof value === 'object' ? value : {}
  const numberOrNull = (item) => Number.isFinite(Number(item)) ? Number(item) : null
  return {
    generatedImages: numberOrNull(usage.generated_images || usage.generatedImages),
    outputTokens: numberOrNull(usage.output_tokens || usage.outputTokens),
    totalTokens: numberOrNull(usage.total_tokens || usage.totalTokens)
  }
}

function createSeedream5Provider({ cloud, env = process.env, transport = {} }) {
  const getTempFileURL = transport.getTempFileURL || ((options) => cloud.getTempFileURL(options))
  const request = transport.request || postJson
  const download = transport.download || downloadImage
  const now = transport.now || (() => Date.now())

  return {
    async generatePreview(input) {
      const apiKey = required(env.ARK_API_KEY, 'PROVIDER_AUTH_FAILED')
      const modelId = required(env.SEEDREAM_MODEL_ID, 'PROVIDER_MODEL_UNAVAILABLE')
      if (/lite/i.test(modelId)) throw new ProviderError('PROVIDER_MODEL_UNAVAILABLE')
      const baseUrl = required(env.ARK_BASE_URL, 'PROVIDER_UNAVAILABLE').replace(/\/+$/, '')
      const timeoutMs = Math.max(1000, Number(env.SEEDREAM_TIMEOUT_MS || 180000))
      const maxOutputBytes = Math.max(1, Number(env.SEEDREAM_MAX_OUTPUT_BYTES || 20971520))
      const files = validateInput(input)
      let temporary
      try {
        temporary = await getTempFileURL({ fileList: [files.sourceImageFileId, files.referenceImageFileId], maxAge: Math.ceil(timeoutMs / 1000) + 120 })
      } catch (_) {
        throw new ProviderError('PROVIDER_INPUT_FETCH_FAILED')
      }
      const urls = new Map((temporary.fileList || []).map((item) => [item.fileID, item.tempFileURL]))
      const sourceUrl = getHttpsUrl(urls.get(files.sourceImageFileId), 'PROVIDER_INPUT_FETCH_FAILED')
      const referenceUrl = getHttpsUrl(urls.get(files.referenceImageFileId), 'PROVIDER_INPUT_FETCH_FAILED')
      const payload = {
        model: modelId,
        prompt: buildPrompt(input),
        image: [sourceUrl, referenceUrl],
        size: env.SEEDREAM_SIZE || '2K',
        stream: false,
        response_format: env.SEEDREAM_RESPONSE_FORMAT || 'url',
        watermark: String(env.SEEDREAM_WATERMARK || 'true') === 'true'
      }
      if (payload.size !== '2K' || payload.response_format !== 'url') throw new ProviderError('PROVIDER_INVALID_REQUEST')
      const startedAt = now()
      if (typeof input.onLifecycle === 'function') await input.onLifecycle('PROVIDER_REQUEST_DISPATCHING')
      let response
      try {
        if (typeof input.onLifecycle === 'function') await input.onLifecycle('PROVIDER_REQUEST_DISPATCHED')
        response = await request(`${baseUrl}/images/generations`, payload, { Authorization: `Bearer ${apiKey}` }, timeoutMs)
      } catch (error) {
        if (error && error.code) throw error
        throw new ProviderError('PROVIDER_RESULT_UNKNOWN')
      }
      if (typeof input.onLifecycle === 'function') await input.onLifecycle('PROVIDER_RESPONSE_RECEIVED')
      const first = response.body && Array.isArray(response.body.data) ? response.body.data[0] : null
      if (!first) throw new ProviderError('PROVIDER_EMPTY_RESULT')
      const resultUrl = getHttpsUrl(first && first.url)
      let downloaded
      try {
        downloaded = await download(resultUrl, maxOutputBytes, timeoutMs)
      } catch (error) {
        if (error && error.code) throw error
        throw new ProviderError('RESULT_DOWNLOAD_FAILED')
      }
      if (!downloaded || !Buffer.isBuffer(downloaded.buffer) || downloaded.buffer.length > maxOutputBytes) throw new ProviderError('RESULT_DOWNLOAD_FAILED')
      const actual = imageInfo(downloaded.buffer)
      if (normalizeMimeType(downloaded.contentType) !== actual.mimeType) throw new ProviderError('PROVIDER_INVALID_RESULT')
      return {
        provider: 'volcengine-seedream-5.0',
        modelId,
        providerRequestId: response.providerRequestId || null,
        outputImageBuffer: downloaded.buffer,
        outputMimeType: actual.mimeType,
        outputWidth: actual.width,
        outputHeight: actual.height,
        usage: normalizedUsage(response.body && response.body.usage),
        durationMs: now() - startedAt,
        extension: extensionFor(actual.mimeType)
      }
    }
  }
}

module.exports = { ProviderError, buildPrompt, createSeedream5Provider, imageInfo, normalizeMimeType, responseError, validateInput }
