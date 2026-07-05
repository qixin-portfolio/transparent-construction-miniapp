const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const SUBMIT_ROLES = ['admin', 'boss_qi', 'boss_hu', 'designer', 'worker', 'project_manager']
const ALL_PROJECT_ROLES = ['admin', 'boss_qi', 'boss_hu']
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'
const MAX_TEXT_LENGTH = 1200

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  const user = res.data[0] || null
  if (user && !user.tenantId) {
    user.tenantId = DEFAULT_TENANT_ID
    user.tenantName = DEFAULT_TENANT_NAME
  }
  return { openid: OPENID, user }
}

function assertRole(user) {
  if (!user || SUBMIT_ROLES.indexOf(user.role) === -1) {
    throw new Error('当前账号没有生成日报草稿的权限')
  }
}

async function assertProjectAccess(openid, user, projectId) {
  if (ALL_PROJECT_ROLES.indexOf(user.role) !== -1) return
  const member = await db.collection('project_members')
    .where({ projectId, userOpenid: openid })
    .limit(1)
    .get()
  if (!member.data.length) {
    throw new Error('当前账号不属于该工地，不能生成日报')
  }
}

function normalizeText(text, limit = MAX_TEXT_LENGTH) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/[，。！？；：,.!?;:]\s+/g, (mark) => mark.trim())
    .trim()
    .slice(0, limit)
}

function compactSentence(text, fallback = '') {
  const value = normalizeText(text, 300)
  if (!value) return fallback
  return /[。！？]$/.test(value) ? value : `${value}。`
}

function normalizeIssueText(value) {
  const text = normalizeText(value, 300)
  const compact = text.replace(/[，。！？；：,.!?;:\s]/g, '')
  const noIssueTexts = [
    '无',
    '无问题',
    '暂无问题',
    '没有问题',
    '无现场问题',
    '暂无现场问题',
    '没有现场问题',
    '无明显现场问题',
    '暂无明显现场问题',
    '没有明显现场问题',
    '暂未发现现场问题',
    '暂未发现明显现场问题',
    '未发现现场问题',
    '未发现明显现场问题',
    '无明显异常',
    '暂无明显异常',
    '没有明显异常',
    '现场验收合格'
  ]
  return noIssueTexts.indexOf(compact) !== -1 ? '' : text
}

function extractMatchedSentence(text, keywords) {
  const sentences = normalizeText(text, 1200)
    .split(/[。！？；;.!?]/)
    .map((item) => item.trim())
    .filter(Boolean)
  return sentences.find((sentence) => keywords.some((keyword) => sentence.indexOf(keyword) !== -1)) || ''
}

function makeFallbackDraft(input) {
  const rawText = normalizeText(input.rawText || input.quickNote || '')
  const stage = normalizeText(input.stage || '当前工序', 40)
  const photoCount = Number(input.photoCount || 0)
  const photoText = photoCount > 0 ? `现场已上传${photoCount}张照片。` : '现场照片待补充。'
  const issueSentence = extractMatchedSentence(rawText, [
    '问题', '漏水', '返工', '破损', '空鼓', '开裂', '延误', '没到', '缺料', '不平',
    '尺寸', '需要处理', '需要协调', '不确定'
  ])
  const confirmSentence = extractMatchedSentence(rawText, [
    '确认', '沟通', '业主', '设计师', '老板', '位置', '颜色', '款式', '尺寸', '方案'
  ])
  const workBase = rawText
    ? `${stage}：${compactSentence(rawText, '')}${photoText}`
    : `${stage}节点按计划推进，已完成现场检查与关键工序记录。${photoText}`
  const issue = issueSentence ? normalizeIssueText(compactSentence(issueSentence)) : ''
  const needConfirm = confirmSentence ? compactSentence(confirmSentence) : ''
  const tomorrowPlan = input.tomorrowPlan ||
    `明日继续推进${stage}相关施工，并复核现场质量和现场成品保护。`

  return {
    workContent: compactSentence(workBase),
    issue,
    needConfirm,
    tomorrowPlan: compactSentence(tomorrowPlan),
    ownerSummary: compactSentence(`今天${stage}按计划推进，现场情况已更新。${photoText}`),
    reviewFocus: compactSentence(issueSentence || confirmSentence || `${stage}进度、照片完整性和现场质量需审核确认。`),
    rawTranscript: rawText,
    sourceType: input.voiceFileID ? 'ai_local_voice' : 'ai_local'
  }
}

function requestJson(urlText, payload, headers = {}, timeout = 60000) {
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
          reject(new Error(`AI 服务返回异常：${res.statusCode} ${text.slice(0, 200)}`))
          return
        }
        try {
          resolve(JSON.parse(text || '{}'))
        } catch (error) {
          reject(error)
        }
      })
    })
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy(new Error('AI 服务请求超时'))
    })
    req.write(body)
    req.end()
  })
}

function parseDraftJson(text) {
  const value = String(text || '').trim()
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch (_) {
    const match = value.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch (error) {
      return null
    }
  }
}

async function polishDraftWithZhipu(input) {
  const apiKey = process.env.ZHIPUAI_API_KEY || process.env.BIGMODEL_API_KEY
  const rawText = normalizeText(input.rawText || input.quickNote || '')
  if (!apiKey || !rawText) return null

  const model = process.env.ZHIPUAI_TEXT_MODEL || 'glm-4-flash'
  const payload = {
    model,
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: [
          '你是装修公司透明工地日报助理。',
          '把工长口语化内容整理成专业、真实、简洁的日报。',
          '只基于输入内容整理，不要编造未提到的工序、材料、人员和承诺。',
          '必须只输出一个 JSON 对象，不要输出 Markdown、解释或代码块。'
        ].join('')
      },
      {
        role: 'user',
        content: JSON.stringify({
          projectName: input.projectName || '',
          stage: input.stage || '',
          progress: input.progress || 0,
          photoCount: input.photoCount || 0,
          rawText,
          outputSchema: {
            workContent: '今日完成，给管理员和内部人员看，80字以内',
            issue: '现场问题，没有则返回空字符串',
            needConfirm: '需要业主或内部确认，没有则空字符串',
            tomorrowPlan: '明日计划，60字以内',
            ownerSummary: '业主端友好文案，真实安心，60字以内',
            reviewFocus: '管理员审核重点，50字以内'
          }
        })
      }
    ]
  }

  const res = await requestJson('https://open.bigmodel.cn/api/paas/v4/chat/completions', payload, {
    Authorization: `Bearer ${apiKey}`
  })
  const content = res.choices && res.choices[0] && res.choices[0].message
    ? res.choices[0].message.content
    : ''
  return parseDraftJson(content)
}

function sanitizeDraft(draft, source) {
  const issue = normalizeIssueText(draft.issue)
  return {
    workContent: compactSentence(draft.workContent, source.workContent || ''),
    issue: issue ? compactSentence(issue) : '',
    needConfirm: normalizeText(draft.needConfirm || '', 240),
    tomorrowPlan: compactSentence(draft.tomorrowPlan, source.tomorrowPlan || ''),
    ownerSummary: compactSentence(draft.ownerSummary, source.ownerSummary || ''),
    reviewFocus: compactSentence(draft.reviewFocus, source.reviewFocus || ''),
    rawTranscript: normalizeText(draft.rawTranscript || source.rawTranscript || ''),
    sourceType: normalizeText(draft.sourceType || source.sourceType || 'ai_local', 40)
  }
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    assertRole(user)
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const projectId = normalizeText(event.projectId || '', 80)
    if (!projectId) throw new Error('缺少工地 ID')
    await assertProjectAccess(openid, user, projectId)

    const projectRes = await db.collection('projects').doc(projectId).get()
    const project = projectRes.data || {}
    if (project.tenantId && project.tenantId !== tenantId) throw new Error('当前账号无权操作该工地')

    const voiceFileID = normalizeText(event.voiceFileID || '', 260)
    const voiceTranscript = normalizeText(event.voiceTranscript || event.transcript || '')
    const quickNote = normalizeText(event.quickNote || '')
    if (!voiceFileID && !quickNote && !voiceTranscript) {
      throw new Error('请先录一段语音或写一句现场情况')
    }

    let transcript = voiceTranscript
    let provider = voiceTranscript ? 'wechat_si' : 'local'
    let warning = ''
    if (voiceFileID && !transcript) {
      warning = '语音已归档，但没有拿到识别文字；请重录或补一句现场情况。'
    }

    const rawText = normalizeText([transcript, quickNote].filter(Boolean).join(' '))
    if (!rawText) {
      throw new Error(warning || '语音未能识别到有效文字，请补充一句现场情况')
    }

    const draftInput = {
      projectName: normalizeText(event.projectName || project.name || '', 80),
      stage: normalizeText(event.stage || '', 40),
      stageCode: normalizeText(event.stageCode || '', 40),
      progress: Number(event.progress || 0),
      photoCount: Number(event.photoCount || 0),
      voiceFileID,
      quickNote,
      rawText,
      tomorrowPlan: normalizeText(event.tomorrowPlan || '', 240)
    }
    const fallbackDraft = makeFallbackDraft(draftInput)

    let polishedDraft = null
    if (process.env.ZHIPUAI_API_KEY || process.env.BIGMODEL_API_KEY) {
      try {
        polishedDraft = await polishDraftWithZhipu(draftInput)
        provider = transcript ? 'wechat_si_zhipu' : 'zhipu'
      } catch (error) {
        warning = warning || `智谱 AI 暂不可用，已使用本地整理：${error.message || '服务异常'}`
      }
    } else {
      warning = warning || '未配置智谱 AI Key，已使用本地规则整理。'
    }

    const draft = sanitizeDraft(Object.assign({}, fallbackDraft, polishedDraft || {}, {
      rawTranscript: transcript || quickNote,
      sourceType: provider === 'wechat_si_zhipu'
        ? 'ai_wechat_si_zhipu'
        : (transcript ? 'ai_wechat_si_local' : fallbackDraft.sourceType)
    }), fallbackDraft)

    return {
      ok: true,
      provider,
      warning,
      draft
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '生成日报草稿失败'
      }
    }
  }
}
