const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const ALLOWED_ROLES = ['admin', 'boss_qi', 'boss_hu']

function tenantScope(tenantId) {
  return tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId
}

async function getAllowedCaller() {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) throw new Error('无法识别当前调用者')
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  const user = res.data[0] || null
  if (!user || ALLOWED_ROLES.indexOf(user.role) === -1) {
    throw new Error('当前账号无权查看每日汇总')
  }
  return user
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

exports.main = async (event = {}) => {
  try {
    const user = await getAllowedCaller()
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const pendingLogs = await db.collection('stage_logs')
      .where({ tenantId: tenantScope(tenantId), reviewStatus: 'pending' })
      .count()

    const openTasks = await db.collection('tasks')
      .where({ tenantId: tenantScope(tenantId), status: _.neq('done') })
      .count()

    const content = [
      `### 晟景透明工地每日闭环 ${todayText()}`,
      `> 待审核日报：${pendingLogs.total} 条`,
      `> 待处理任务：${openTasks.total} 条`,
      '',
      pendingLogs.total > 0 ? '请优先审核今日工地日报，审核后业主才能看到进度。' : '今日没有待审核日报。'
    ].join('\n')

    let noticeSent = false
    let noticeError = ''
    if (event.send !== false) {
      try {
        noticeSent = await sendWecomMarkdown(content)
      } catch (error) {
        noticeError = error.message || '企业微信提醒发送失败'
      }
    }

    return {
      content,
      noticeSent,
      noticeError
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '生成每日闭环失败'
      }
    }
  }
}
