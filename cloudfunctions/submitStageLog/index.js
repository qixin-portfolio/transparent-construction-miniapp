const cloud = require('wx-server-sdk')
const https = require('https')
const { createError } = require('./stage-flow')
const { createStageLog } = require('./submitService')
const { assertProjectAccess, assertTenantMatch } = require('./access')
const { createOwnerNoticeSender } = require('./owner-notice')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const SUBMIT_ROLES = ['admin', 'boss_qi', 'boss_hu', 'designer', 'worker', 'project_manager']
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
    throw createError(user ? 'ROLE_NOT_ALLOWED' : 'UNAUTHORIZED', '当前账号没有提交工地日报的权限')
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

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    assertRole(user, SUBMIT_ROLES)
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const tenantName = user.tenantName || DEFAULT_TENANT_NAME

    const projectId = String(event.projectId || '').trim()
    const workContent = String(event.workContent || '').trim()
    if (!projectId) throw new Error('缺少工地 ID')
    if (!workContent) throw new Error('请填写今日完成')

    await assertProjectAccess({ db, openid, user, projectId })

    const projectRes = await db.collection('projects').doc(projectId).get()
    const project = projectRes.data
    if (!project) throw new Error('工地不存在')
    assertTenantMatch(project.tenantId, tenantId)
    const now = db.serverDate()

    return createStageLog({
      db,
      _,
      event,
      user,
      openid,
      tenantId,
      tenantName,
      project,
      now,
      requestNow: new Date(),
      sendWecomMarkdown,
      sendOwnerNotice: createOwnerNoticeSender({ cloud, db })
    })
  } catch (error) {
    return {
      error: {
        code: error.code || '',
        message: error.message || '提交工地日报失败'
      }
    }
  }
}
