const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const REVIEW_ROLES = ['admin', 'boss_qi', 'boss_hu']
const _ = db.command
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'
const SUBSCRIBE_TEMPLATE_ID = 'CSnZXzPW_Qe9Nor3NR7__Z0dHlQaItFPpb6X1-Sd4bY'

function tenantScope(tenantId) {
  return tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId
}

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

function assertReviewRole(user) {
  if (!user || REVIEW_ROLES.indexOf(user.role) === -1) {
    throw new Error('当前账号没有审核日报的权限')
  }
}

function formatNoticeDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function sendApprovedNotice(project, log) {
  const ownerOpenids = Array.isArray(project.ownerOpenids)
    ? project.ownerOpenids.filter(Boolean)
    : (project.ownerOpenid ? [project.ownerOpenid] : [])
  const uniqueOpenids = Array.from(new Set(ownerOpenids))
  if (!uniqueOpenids.length) return { sentCount: 0, totalCount: 0 }

  const results = []
  for (const ownerOpenid of uniqueOpenids) {
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: ownerOpenid,
        templateId: SUBSCRIBE_TEMPLATE_ID,
        page: 'subpackages/owner/pages/owner/owner',
        miniprogramState: 'formal',
        data: {
          thing1: { value: String(project.name || '工地').slice(0, 20) },
          phrase2: { value: String(log.stage || '进度更新').slice(0, 5) },
          thing3: { value: `${Number(log.progress || project.progress || 0)}%` },
          date4: { value: formatNoticeDate(new Date()) }
        }
      })
      results.push(true)
    } catch (error) {
      results.push(false)
    }
  }
  return { sentCount: results.filter(Boolean).length, totalCount: uniqueOpenids.length }
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    assertReviewRole(user)
    const tenantId = user.tenantId || DEFAULT_TENANT_ID

    const stageLogId = String(event.stageLogId || '').trim()
    const action = String(event.action || '').trim()
    if (!stageLogId) throw new Error('缺少日报 ID')
    if (['approve', 'reject'].indexOf(action) === -1) throw new Error('审核动作不正确')

    const approved = action === 'approve'
    const rejectReason = String(event.rejectReason || event.comment || '').trim()
    const logRes = await db.collection('stage_logs').doc(stageLogId).get()
    const log = logRes.data
    if (!log) throw new Error('日报不存在')
    if ((log.tenantId && log.tenantId !== tenantId) || (!log.tenantId && tenantId !== DEFAULT_TENANT_ID)) {
      throw new Error('无权审核该日报')
    }
    if ((log.reviewStatus || 'pending') !== 'pending') {
      const statusError = new Error('该日报已审核，请勿重复操作')
      statusError.code = 'REVIEW_STATUS_NOT_PENDING'
      throw statusError
    }

    let project = null
    if (approved && log.projectId) {
      const projectRes = await db.collection('projects').doc(log.projectId).get()
      project = projectRes.data || null
      if (!project) throw new Error('日报对应工地不存在')
      if ((project.tenantId && project.tenantId !== tenantId) || (!project.tenantId && tenantId !== DEFAULT_TENANT_ID)) {
        const projectError = new Error('日报对应工地不属于当前企业')
        projectError.code = 'PROJECT_TENANT_MISMATCH'
        throw projectError
      }
    }
    const now = db.serverDate()

    const updateData = {
      reviewStatus: approved ? 'approved' : 'rejected',
      ownerVisible: approved,
      rejectReason: approved ? '' : rejectReason,
      auditComment: approved ? '' : rejectReason,
      reviewRecords: _.push({
        action,
        rejectReason,
        reviewedByOpenid: openid,
        reviewedByName: user.name || '',
        reviewedAt: now
      }),
      reviewedByOpenid: openid,
      reviewedByName: user.name || '',
      reviewedAt: now,
      updatedAt: now
    }
    if (approved && event.ownerSummary) {
      updateData.ownerSummary = String(event.ownerSummary).trim().slice(0, 200)
    }
    await db.collection('stage_logs').doc(stageLogId).update({ data: updateData })

    await db.collection('photos').where({ stageLogId, tenantId: tenantScope(tenantId) }).update({
      data: {
        ownerVisible: approved,
        updatedAt: now
      }
    })

    if (approved && project) {
      const currentProgress = Number(project.progress || 0)
      const logProgress = Number(log.progress || 0)
      const projectData = {
        updatedAt: now
      }
      if (logProgress > 0) {
        projectData.progress = Math.max(currentProgress, logProgress)
      }
      if (log.stage && logProgress >= currentProgress) {
        projectData.currentStage = log.stage
      }
      await db.collection('projects').doc(log.projectId).update({ data: projectData })

      // 审核函数已完成身份和租户校验，直接发送，避免跨云函数调用丢失调用者身份。
      try {
        const noticeResult = await sendApprovedNotice(project, log)
        if (noticeResult.sentCount < noticeResult.totalCount) console.warn('[业主订阅消息部分发送失败]')
      } catch (_) {
        // 通知发送失败不影响审核结果
      }
    }

    return {
      ok: true,
      ownerVisible: approved
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '审核日报失败'
      }
    }
  }
}
