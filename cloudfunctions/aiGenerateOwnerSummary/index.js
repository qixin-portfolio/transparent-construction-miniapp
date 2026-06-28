const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const ALLOWED_ROLES = ['admin', 'boss_qi', 'boss_hu']
const DEFAULT_MODEL = 'deepseek-chat'
const DEFAULT_TIMEOUT = 15000

const ERROR_MESSAGES = {
  INVALID_STAGE_LOG_ID: '缺少有效的日报 ID',
  USER_NOT_FOUND: '请先登录',
  NO_TENANT: '当前账号未绑定租户',
  FORBIDDEN: '当前账号没有生成业主摘要的权限',
  STAGE_LOG_NOT_FOUND: '日报不存在或无权访问',
  PROJECT_NOT_FOUND: '工地不存在或无权访问',
  AI_CONFIG_MISSING: 'AI 服务未配置',
  AI_REQUEST_FAILED: 'AI 服务请求失败，请稍后再试',
  AI_EMPTY_RESPONSE: 'AI 未返回有效摘要，请手动填写',
  UNKNOWN_ERROR: '生成业主摘要失败'
}

function fail(code, message) {
  return {
    success: false,
    code,
    message: message || ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR
  }
}

function createError(code, message) {
  const error = new Error(message || ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR)
  error.code = code
  return error
}

function normalizeText(value, limit = 1000) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit)
}

function stripSensitiveText(value, limit = 1000) {
  return normalizeText(value, limit)
    .replace(/1[3-9]\d{9}/g, '[手机号已省略]')
    .replace(/o[A-Za-z0-9_-]{20,}/g, '[openid已省略]')
    .replace(/tenant_[A-Za-z0-9_-]+/g, '[tenantId已省略]')
    .replace(/\b[a-f0-9]{24}\b/gi, '[ID已省略]')
}

function getPhotoCount(stageLog) {
  const photoFileIDs = Array.isArray(stageLog.photoFileIDs) ? stageLog.photoFileIDs : []
  const photos = Array.isArray(stageLog.photos) ? stageLog.photos : []
  return Math.max(photoFileIDs.length, photos.length)
}

function buildPrompt(input) {
  const projectName = stripSensitiveText(input.projectName, 80)
  const stage = stripSensitiveText(input.stage, 60)
  const workContent = stripSensitiveText(input.workContent, 800)
  const issue = stripSensitiveText(input.issue, 300)
  const nextPlan = stripSensitiveText(input.nextPlan, 300)
  const photoCount = Number(input.photoCount || 0)
  const reviewStatus = stripSensitiveText(input.reviewStatus, 40)

  return [
    {
      role: 'system',
      content: [
        '你是装修公司透明工地日报助理。',
        '你的任务是把工长提交的施工日报，改写成业主能看懂的进度摘要。',
        '只能基于输入内容改写，不能编造未提供的施工内容、材料、验收结论、质量承诺或客户评价。',
        '输出要真实、克制、通俗。',
        '不要使用绝对化词语，不要承诺质量保证，不要夸大进度。',
        '不要暴露内部管理问题，不要直接说“返工”“失误”“责任”。',
        '如果存在问题或风险，用温和方式表达为“将继续跟进”或“后续会同步处理进展”。',
        '只输出摘要正文，不要标题，不要编号，不要 Markdown。'
      ].join('')
    },
    {
      role: 'user',
      content: JSON.stringify({
        projectName,
        stage,
        workContent,
        issue,
        nextPlan,
        photoCount,
        hasPhotos: photoCount > 0,
        reviewStatus,
        outputRules: [
          '50-100字',
          '面向业主',
          '通俗易懂',
          '不夸大承诺',
          '不做质量保证',
          '不使用绝对化词',
          '不暴露内部管理问题',
          '不直接说“返工/失误/责任”',
          '如存在问题，用“将继续跟进”“后续会同步处理进展”等温和表达',
          '只输出摘要正文，不要标题，不要编号，不要 Markdown',
          '如果日报内容很少，生成保守摘要，不要编造'
        ]
      })
    }
  ]
}

function buildChatCompletionsUrl(baseURL) {
  const cleanBase = normalizeText(baseURL, 300).replace(/\/+$/, '')
  if (!cleanBase) return ''
  if (/\/chat\/completions$/.test(cleanBase)) return cleanBase
  if (/\/v1$/.test(cleanBase)) return `${cleanBase}/chat/completions`
  return `${cleanBase}/v1/chat/completions`
}

function requestJson(urlText, payload, headers, timeout) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlText)
    const body = JSON.stringify(payload)
    const req = https.request({
      method: 'POST',
      hostname: url.hostname,
      path: `${url.pathname}${url.search}`,
      timeout,
      headers: Object.assign({
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }, headers)
    }, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(createError('AI_REQUEST_FAILED', `AI 服务返回异常：${res.statusCode}`))
          return
        }
        try {
          resolve(JSON.parse(text || '{}'))
        } catch (_) {
          reject(createError('AI_REQUEST_FAILED'))
        }
      })
    })
    req.on('error', () => reject(createError('AI_REQUEST_FAILED')))
    req.on('timeout', () => {
      req.destroy(createError('AI_REQUEST_FAILED', 'AI 服务请求超时'))
    })
    req.write(body)
    req.end()
  })
}

async function callOpenAICompatible(messages) {
  const apiKey = normalizeText(process.env.AI_API_KEY, 500)
  const baseURL = normalizeText(process.env.AI_BASE_URL, 300)
  const model = normalizeText(process.env.AI_MODEL, 80) || DEFAULT_MODEL
  const timeout = Number(process.env.AI_TIMEOUT_MS || DEFAULT_TIMEOUT)
  const safeTimeout = Number.isFinite(timeout) && timeout > 0 ? Math.min(timeout, 30000) : DEFAULT_TIMEOUT
  const url = buildChatCompletionsUrl(baseURL)

  if (!apiKey || !url) {
    throw createError('AI_CONFIG_MISSING')
  }
  try {
    new URL(url)
  } catch (_) {
    throw createError('AI_CONFIG_MISSING')
  }

  const result = await requestJson(url, {
    model,
    temperature: 0.2,
    max_tokens: 180,
    messages
  }, {
    Authorization: `Bearer ${apiKey}`
  }, safeTimeout)

  const content = result.choices &&
    result.choices[0] &&
    result.choices[0].message &&
    result.choices[0].message.content

  return {
    provider: 'openai-compatible',
    model: result.model || model,
    content: normalizeText(content, 500)
  }
}

function sanitizeSummary(value) {
  let summary = stripSensitiveText(value, 300)
    .replace(/^#+\s*/gm, '')
    .replace(/^[\s*-]+\s*/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/["“”]/g, '')
    .replace(/返工/g, '继续调整')
    .replace(/失误/g, '需要优化')
    .replace(/责任/g, '相关情况')
    .trim()

  if (summary.length > 120) {
    summary = summary.slice(0, 119).replace(/[，、；：,.!?！？\s]+$/, '')
    summary = `${summary}。`
  }

  return summary
}

exports.main = async (event = {}) => {
  try {
    const stageLogId = normalizeText(event.stageLogId, 80)
    if (!stageLogId) {
      return fail('INVALID_STAGE_LOG_ID')
    }

    const { OPENID } = cloud.getWXContext()
    const userRes = await db.collection('users')
      .where({ openid: OPENID, status: 'active' })
      .limit(1)
      .get()
    const user = userRes.data[0] || null
    if (!user) {
      return fail('USER_NOT_FOUND')
    }
    if (!user.tenantId) {
      return fail('NO_TENANT')
    }
    if (ALLOWED_ROLES.indexOf(user.role) === -1) {
      return fail('FORBIDDEN')
    }

    const tenantId = user.tenantId
    const logRes = await db.collection('stage_logs')
      .where({ _id: stageLogId, tenantId })
      .limit(1)
      .get()
    const stageLog = logRes.data[0] || null
    if (!stageLog) {
      return fail('STAGE_LOG_NOT_FOUND')
    }

    const projectId = normalizeText(stageLog.projectId, 80)
    if (!projectId) {
      return fail('PROJECT_NOT_FOUND')
    }
    const projectRes = await db.collection('projects')
      .where({ _id: projectId, tenantId })
      .limit(1)
      .get()
    const project = projectRes.data[0] || null
    if (!project) {
      return fail('PROJECT_NOT_FOUND')
    }

    const messages = buildPrompt({
      projectName: project.name || stageLog.projectName || '',
      stage: stageLog.stage || stageLog.stageName || '',
      workContent: stageLog.workContent || '',
      issue: stageLog.issue || '',
      nextPlan: stageLog.nextPlan || stageLog.tomorrowPlan || '',
      photoCount: getPhotoCount(stageLog),
      reviewStatus: stageLog.reviewStatus || 'pending'
    })

    const aiResult = await callOpenAICompatible(messages)
    const summary = sanitizeSummary(aiResult.content)
    if (!summary) {
      return fail('AI_EMPTY_RESPONSE')
    }

    return {
      success: true,
      summary,
      provider: aiResult.provider,
      model: aiResult.model
    }
  } catch (error) {
    const code = error && error.code ? error.code : 'UNKNOWN_ERROR'
    if (code !== 'AI_CONFIG_MISSING') {
      console.error('[aiGenerateOwnerSummary]', code, error && error.message ? error.message : '')
    }
    return fail(code)
  }
}
