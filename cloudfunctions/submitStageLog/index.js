const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const SUBMIT_ROLES = ['admin', 'boss_qi', 'boss_hu', 'designer', 'worker']
const ALL_PROJECT_ROLES = ['admin', 'boss_qi', 'boss_hu']

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  return { openid: OPENID, user: res.data[0] || null }
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

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    assertRole(user, SUBMIT_ROLES)

    const projectId = String(event.projectId || '').trim()
    const stage = String(event.stage || '').trim()
    const workContent = String(event.workContent || '').trim()
    if (!projectId) throw new Error('缺少工地 ID')
    if (!stage) throw new Error('缺少工序节点')
    if (!workContent) throw new Error('请填写今日完成')

    await assertProjectAccess(openid, user, projectId)

    const projectRes = await db.collection('projects').doc(projectId).get()
    const project = projectRes.data
    const photoFileIDs = Array.isArray(event.photoFileIDs) ? event.photoFileIDs.filter(Boolean) : []
    const now = db.serverDate()

    const logData = {
      projectId,
      projectName: String(event.projectName || project.name || '').trim(),
      stage,
      stageCode: String(event.stageCode || '').trim(),
      progress: Number(event.progress || 0),
      workContent,
      issue: String(event.issue || '').trim(),
      needConfirm: String(event.needConfirm || '').trim(),
      tomorrowPlan: String(event.tomorrowPlan || '').trim(),
      photoFileIDs,
      reviewStatus: 'pending',
      ownerVisible: false,
      submittedByOpenid: openid,
      submittedByName: user.name || '',
      createdAt: now,
      updatedAt: now
    }

    const logRes = await db.collection('stage_logs').add({ data: logData })
    const addPhotoTasks = photoFileIDs.map((fileID) => db.collection('photos').add({
      data: {
        projectId,
        stageLogId: logRes._id,
        fileID,
        stage,
        ownerVisible: false,
        createdByOpenid: openid,
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
