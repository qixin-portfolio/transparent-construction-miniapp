const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

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

exports.main = async (event) => {
  try {
    const pendingLogs = await db.collection('stage_logs')
      .where({ reviewStatus: 'pending' })
      .count()

    const openTasks = await db.collection('tasks')
      .where({ status: _.neq('done') })
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
