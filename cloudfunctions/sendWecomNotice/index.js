const https = require('https')

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

exports.main = async (event) => {
  try {
    const webhook = process.env.WECOM_WEBHOOK_URL
    if (!webhook) throw new Error('Missing WECOM_WEBHOOK_URL')

    const content = String(event.markdown || event.content || '').trim()
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
