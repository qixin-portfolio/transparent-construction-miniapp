const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const ALLOWED_ROLES = ['admin', 'boss_qi', 'boss_hu']

async function assertAllowedCaller() {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) throw new Error('无法识别当前调用者')
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  const user = res.data[0] || null
  if (!user || ALLOWED_ROLES.indexOf(user.role) === -1) {
    throw new Error('当前账号无权发送企业微信通知')
  }
  return user
}

function sendMarkdown(webhook, content) {
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
            reject(new Error(parsed.errmsg || '企业微信发送失败'))
            return
          }
          resolve(parsed)
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
    await assertAllowedCaller()
    const webhook = process.env.WECOM_WEBHOOK_URL
    if (!webhook) throw new Error('Missing WECOM_WEBHOOK_URL')

    const content = String(event.markdown || event.content || '').trim().slice(0, 2000)
    if (!content) throw new Error('企业微信通知内容不能为空')

    const result = await sendMarkdown(webhook, content)
    return {
      ok: true,
      result
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '发送企业微信通知失败'
      }
    }
  }
}
