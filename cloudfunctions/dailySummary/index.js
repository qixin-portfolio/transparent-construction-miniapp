const cloud = require('wx-server-sdk')
const https = require('https')
const {
  authorizeDailySummaryInvocation,
  runDailySummaries,
  shouldSendDailySummaryNotice
} = require('./security')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'

function tenantScope(tenantId) {
  return tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId
}

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { openid: '', user: null }
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  return { openid: OPENID, user: res.data[0] || null }
}

function todayText() {
  const date = new Date()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
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

async function listTenantIds() {
  const tenantIds = [DEFAULT_TENANT_ID]
  let offset = 0
  while (true) {
    const res = await db.collection('tenants').skip(offset).limit(100).get()
    const batch = res.data || []
    batch.forEach((tenant) => {
      if (tenant && tenant._id && tenant.status !== 'disabled') tenantIds.push(tenant._id)
    })
    if (batch.length < 100) break
    offset += batch.length
  }
  return Array.from(new Set(tenantIds))
}

async function loadTenantSummary(tenantId, sendRequested) {
  const [pendingLogs, openTasks] = await Promise.all([
    db.collection('stage_logs')
      .where({ tenantId: tenantScope(tenantId), reviewStatus: 'pending' })
      .count(),
    db.collection('tasks')
      .where({ tenantId: tenantScope(tenantId), status: _.neq('done') })
      .count()
  ])
  const content = [
    `### 透明工地每日闭环 ${todayText()}`,
    `> 企业：${tenantId}`,
    `> 待审核日报：${pendingLogs.total} 条`,
    `> 待处理任务：${openTasks.total} 条`,
    '',
    pendingLogs.total > 0 ? '请优先审核今日工地日报，审核后业主才能看到进度。' : '今日没有待审核日报。'
  ].join('\n')
  let noticeSent = false
  let noticeError = ''
  if (shouldSendDailySummaryNotice({ tenantId, sendRequested })) {
    try {
      noticeSent = await sendWecomMarkdown(content)
    } catch (error) {
      noticeError = error.message || '企业微信提醒发送失败'
    }
  }
  return {
    tenantId,
    pendingLogs: pendingLogs.total || 0,
    openTasks: openTasks.total || 0,
    content,
    noticeSent,
    noticeError
  }
}

exports.main = async (event = {}) => {
  try {
    const { openid, user } = await getCurrentUser()
    const invocation = authorizeDailySummaryInvocation({
      openid,
      user,
      event,
      cronSecret: process.env.DAILY_SUMMARY_CRON_SECRET || ''
    })
    const summaries = await runDailySummaries({
      invocation,
      listTenantIds,
      loadTenantSummary: (tenantId) => loadTenantSummary(tenantId, event.send !== false)
    })
    if (invocation.mode === 'manual') return summaries[0] || { error: { message: '未找到企业汇总' } }
    return { mode: 'timer', summaries }
  } catch (error) {
    return {
      error: {
        code: error.code || '',
        message: error.message || '生成每日闭环失败'
      }
    }
  }
}
