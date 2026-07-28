const { DEFAULT_TENANT_ID, tenantMatches } = require('./stage-flow')

const SUBSCRIBE_TEMPLATE_ID = 'CSnZXzPW_Qe9Nor3NR7__Z0dHlQaItFPpb6X1-Sd4bY'
const NOTICE_TYPE = 'owner-stage-approved'
const ALLOWED_MINIPROGRAM_STATES = ['developer', 'trial', 'formal']

function formatDate(value) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getOwnerOpenids(project) {
  return Array.from(new Set(
    (Array.isArray(project.ownerOpenids) ? project.ownerOpenids : [project.ownerOpenid])
      .filter(Boolean)
  ))
}

function getNotificationEnvironment(environment = process.env) {
  const enabled = environment.ENABLE_EXTERNAL_NOTIFICATIONS === 'true'
  const miniprogramState = environment.WECHAT_MINIPROGRAM_STATE
  if (!enabled) return { enabled: false, reason: 'external_notifications_disabled', miniprogramState: '' }
  if (ALLOWED_MINIPROGRAM_STATES.indexOf(miniprogramState) === -1) {
    return { enabled: false, reason: 'invalid_miniprogram_state', miniprogramState: '' }
  }
  return { enabled: true, reason: '', miniprogramState }
}

function buildOwnerNoticeKey(tenantId, stageLogId) {
  return `${NOTICE_TYPE}:${tenantId}:${stageLogId}`
}

function existingNoticeResult(log) {
  const status = log.ownerNoticeStatus || 'sending'
  const result = {
    duplicate: true,
    noticeKey: log.ownerNoticeKey,
    noticeStatus: status,
    sentCount: Number(log.ownerNoticeSentCount || 0),
    totalCount: Number(log.ownerNoticeRequestedCount || 0),
    reason: log.ownerNoticeReason || ''
  }
  if (status === 'not_requested') return Object.assign(result, { skipped: true })
  return Object.assign(result, { ok: status === 'sent' })
}

function noticeStatusData({ key, status, reason, totalCount, sentCount }) {
  return {
    ownerNoticeKey: key,
    ownerNoticeStatus: status,
    ownerNoticeReason: reason || '',
    ownerNoticeRequestedCount: Number(totalCount || 0),
    ownerNoticeSentCount: Number(sentCount || 0),
    ownerNoticeAttemptedAt: new Date(),
    ownerNoticeRetryCount: 0,
    ownerNoticeType: NOTICE_TYPE
  }
}

function createOwnerNoticeSender({ cloud, db, environment }) {
  return async function sendOwnerNotice({ projectId, stageLogId, tenantId }) {
    const claim = await db.runTransaction(async (transaction) => {
      const project = (await transaction.collection('projects').doc(projectId).get()).data || null
      if (!project) return { result: { skipped: true, reason: 'project_not_found' } }
      if (!tenantMatches(project.tenantId, tenantId)) {
        return { result: { ok: false, errorCode: 'TENANT_MISMATCH', reason: 'project_tenant_mismatch' } }
      }

      const log = (await transaction.collection('stage_logs').doc(stageLogId).get()).data || null
      if (!log || log.projectId !== projectId || !tenantMatches(log.tenantId, tenantId)) {
        return { result: { ok: false, errorCode: 'STAGE_LOG_PROJECT_MISMATCH', reason: 'stage_log_project_mismatch' } }
      }
      if (log.reviewStatus !== 'approved' || log.ownerVisible !== true) {
        return { result: { ok: false, errorCode: 'STAGE_LOG_NOT_APPROVED', reason: 'stage_log_not_approved' } }
      }

      const key = buildOwnerNoticeKey(tenantId, stageLogId)
      if (log.ownerNoticeKey === key) return { result: existingNoticeResult(log) }

      const ownerOpenids = getOwnerOpenids(project)
      if (!ownerOpenids.length) {
        const result = { skipped: true, reason: 'no_owner', noticeKey: key, noticeStatus: 'not_requested' }
        await transaction.collection('stage_logs').doc(stageLogId).update({ data: noticeStatusData({ key, status: 'not_requested', reason: 'no_owner' }) })
        return { result }
      }

      const config = getNotificationEnvironment(environment)
      if (!config.enabled) {
        const result = { skipped: true, reason: config.reason, noticeKey: key, noticeStatus: 'not_requested' }
        await transaction.collection('stage_logs').doc(stageLogId).update({ data: noticeStatusData({ key, status: 'not_requested', reason: config.reason }) })
        return { result }
      }

      await transaction.collection('stage_logs').doc(stageLogId).update({
        data: noticeStatusData({ key, status: 'sending', totalCount: ownerOpenids.length })
      })
      return { project, log, ownerOpenids, key, miniprogramState: config.miniprogramState }
    })

    if (claim.result) return claim.result

    const results = []
    for (const ownerOpenid of claim.ownerOpenids) {
      try {
        await cloud.openapi.subscribeMessage.send({
          touser: ownerOpenid,
          templateId: SUBSCRIBE_TEMPLATE_ID,
          page: 'subpackages/owner/pages/owner/owner',
          miniprogramState: claim.miniprogramState,
          data: {
            thing1: { value: String(claim.project.name || '工地').slice(0, 20) },
            phrase2: { value: String(claim.log.stage || '进度更新').slice(0, 5) },
            thing3: { value: `${Number(claim.log.progress || claim.project.progress || 0)}%` },
            date4: { value: formatDate(Date.now()) }
          }
        })
        results.push(true)
      } catch (_) {
        results.push(false)
      }
    }

    const sentCount = results.filter(Boolean).length
    const result = {
      ok: sentCount === claim.ownerOpenids.length,
      sentCount,
      totalCount: claim.ownerOpenids.length,
      noticeKey: claim.key,
      noticeStatus: sentCount === claim.ownerOpenids.length ? 'sent' : 'failed'
    }
    try {
      await db.collection('stage_logs').doc(stageLogId).update({
        data: noticeStatusData({
          key: claim.key,
          status: result.noticeStatus,
          reason: result.ok ? '' : 'delivery_failed',
          totalCount: result.totalCount,
          sentCount: result.sentCount
        })
      })
    } catch (error) {
      return Object.assign(result, {
        noticeStatus: 'persist_failed',
        warningCode: 'OWNER_NOTICE_STATUS_PERSIST_FAILED',
        warningMessage: '通知已执行，但通知状态未能记录'
      })
    }
    return result
  }
}

module.exports = {
  NOTICE_TYPE,
  ALLOWED_MINIPROGRAM_STATES,
  getNotificationEnvironment,
  buildOwnerNoticeKey,
  createOwnerNoticeSender
}
