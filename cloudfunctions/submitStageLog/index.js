const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const SUBMIT_ROLES = ['admin', 'boss_qi', 'boss_hu', 'designer', 'worker', 'project_manager']
const ALL_PROJECT_ROLES = ['admin', 'boss_qi', 'boss_hu']
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'

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

function assertRole(user, roles) {
  if (!user || roles.indexOf(user.role) === -1) {
    throw new Error('当前账号没有提交工地日报的权限')
  }
}

async function assertProjectAccess(openid, user, projectId) {
  if (ALL_PROJECT_ROLES.indexOf(user.role) !== -1) return
  const member = await db.collection('project_members')
    .where({ projectId, userOpenid: openid })
    .limit(1)
    .get()
  if (!member.data.length) {
    throw new Error('当前账号不属于该工地，不能提交日报')
  }
}

function sendWecomMarkdown(content) {
  const webhook = process.env.WECOM_WEBHOOK_URL
  if (!webhook) return Promise.resolve(false)

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      msgtype: 'markdown',
      markdown: { content }
    })
    const url = new URL(webhook)
    const req = https.request({
      method: 'POST',
      hostname: url.hostname,
      path: `${url.pathname}${url.search}`,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}')
          if (parsed.errcode && parsed.errcode !== 0) {
            reject(new Error(parsed.errmsg || '企业微信提醒发送失败'))
            return
          }
          resolve(true)
        } catch (error) {
          reject(error)
        }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

function clipText(value, limit = 1200) {
  return String(value || '').trim().slice(0, limit)
}

function normalizeIssueText(value) {
  const text = clipText(value, 300)
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

function normalizeAiDraft(value) {
  if (!value || typeof value !== 'object') return null
  return {
    workContent: clipText(value.workContent, 600),
    issue: normalizeIssueText(value.issue),
    needConfirm: clipText(value.needConfirm, 300),
    tomorrowPlan: clipText(value.tomorrowPlan, 300),
    ownerSummary: clipText(value.ownerSummary, 300),
    reviewFocus: clipText(value.reviewFocus, 300),
    sourceType: clipText(value.sourceType, 40)
  }
}

function toTime(value) {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  if (value.$date && value.$date.$numberLong) return Number(value.$date.$numberLong)
  if (value.$numberLong) return Number(value.$numberLong)
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function getChinaDayRange(date = new Date()) {
  const dayMs = 24 * 60 * 60 * 1000
  const chinaOffsetMs = 8 * 60 * 60 * 1000
  const chinaDate = new Date(date.getTime() + chinaOffsetMs)
  const startTime = Date.UTC(
    chinaDate.getUTCFullYear(),
    chinaDate.getUTCMonth(),
    chinaDate.getUTCDate()
  ) - chinaOffsetMs
  return {
    start: new Date(startTime),
    end: new Date(startTime + dayMs)
  }
}

function isSameSubmitter(item, openid, userId) {
  return (openid && (item.submittedByOpenid === openid || item.createdByOpenid === openid)) ||
    (userId && (item.submittedBy === userId || item.createdBy === userId))
}

async function findExistingStageLog(projectId, tenantId, stageCode, stage, openid, userId) {
  const range = getChinaDayRange()
  const baseWhere = {
    projectId,
    tenantId: _.in([tenantId, '', null]),
    createdAt: _.gte(range.start)
  }
  const queries = []
  if (stageCode) {
    queries.push(Object.assign({}, baseWhere, { stageCode }))
  }
  if (stage) {
    queries.push(Object.assign({}, baseWhere, { stage }))
  }

  for (const where of queries) {
    const res = await db.collection('stage_logs').where(where).orderBy('createdAt', 'desc').limit(20).get()
    const existing = (res.data || []).find((item) => {
      if ((item.reviewStatus || 'pending') === 'rejected') return false
      if (!isSameSubmitter(item, openid, userId)) return false
      const time = toTime(item.createdAt || item.submittedAt || item.updatedAt)
      return time >= range.start.getTime() && time < range.end.getTime()
    })
    if (existing) return existing
  }
  return null
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    assertRole(user, SUBMIT_ROLES)
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const tenantName = user.tenantName || DEFAULT_TENANT_NAME

    const projectId = String(event.projectId || '').trim()
    const stage = String(event.stage || '').trim()
    const workContent = String(event.workContent || '').trim()
    if (!projectId) throw new Error('缺少工地 ID')
    if (!stage) throw new Error('缺少工序节点')
    if (!workContent) throw new Error('请填写今日完成')

    await assertProjectAccess(openid, user, projectId)

    const projectRes = await db.collection('projects').doc(projectId).get()
    const project = projectRes.data
    if (!project) throw new Error('工地不存在')
    if (project.tenantId && project.tenantId !== tenantId) throw new Error('当前账号无权提交该工地日报')
    const stageCode = String(event.stageCode || '').trim()
    const existingLog = await findExistingStageLog(projectId, tenantId, stageCode, stage, openid, user._id || '')
    if (existingLog) {
      throw new Error(`${stage} 节点今天已提交过日报，请勿重复操作`)
    }
    const photoFileIDs = Array.isArray(event.photoFileIDs) ? event.photoFileIDs.filter(Boolean) : []
    const sourceType = String(event.sourceType || 'manual').trim()
    const now = db.serverDate()

    const logData = {
      projectId,
      tenantId,
      tenantName,
      projectName: String(event.projectName || project.name || '').trim(),
      stage,
      stageCode,
      progress: Number(event.progress || 0),
      workContent,
      issue: normalizeIssueText(event.issue),
      needConfirm: String(event.needConfirm || '').trim(),
      tomorrowPlan: String(event.tomorrowPlan || '').trim(),
      photoFileIDs,
      voiceFileID: String(event.voiceFileID || '').trim(),
      voiceDuration: Number(event.voiceDuration || 0),
      voiceTranscript: clipText(event.voiceTranscript, 1200),
      ownerSummary: clipText(event.ownerSummary, 500),
      reviewFocus: clipText(event.reviewFocus, 500),
      aiDraft: normalizeAiDraft(event.aiDraft),
      aiGenerated: /^ai_/.test(sourceType),
      sourceType,
      reviewStatus: 'pending',
      ownerVisible: false,
      submittedByOpenid: openid,
      submittedBy: user._id || openid,
      submittedByName: user.name || '',
      reviewRecords: [],
      createdAt: now,
      updatedAt: now
    }

    const logRes = await db.collection('stage_logs').add({ data: logData })
    const addPhotoTasks = photoFileIDs.map((fileID) => db.collection('photos').add({
      data: {
        projectId,
        tenantId,
        tenantName,
        stageLogId: logRes._id,
        fileID,
        stage,
        ownerVisible: false,
        createdByOpenid: openid,
        createdBy: user._id || openid,
        createdAt: now,
        updatedAt: now
      }
    }))
    await Promise.all(addPhotoTasks)

    let noticeSent = false
    let noticeError = ''
    try {
      noticeSent = await sendWecomMarkdown([
        '### 新工地日报待审核',
        `> 工地：${project.name || logData.projectName || '未命名工地'}`,
        `> 工序：${stage}`,
        `> 提交人：${user.name || user.role || '内部人员'}`,
        `> 照片：${photoFileIDs.length} 张`,
        '',
        workContent.slice(0, 120)
      ].join('\n'))
    } catch (error) {
      noticeError = error.message || '企业微信提醒发送失败'
    }

    return {
      id: logRes._id,
      noticeSent,
      noticeError
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '提交工地日报失败'
      }
    }
  }
}
