const DEFAULT_TENANT_ID = 'tenant_shengjing_default'

function createError(code, message) {
  const error = new Error(message || code)
  error.code = code
  return error
}

function tenantMatches(resourceTenantId, tenantId) {
  return resourceTenantId ? resourceTenantId === tenantId : tenantId === DEFAULT_TENANT_ID
}

async function executeStageLogReview({
  runTransaction,
  sendNotice,
  updateNoticeStatus,
  stageLogId,
  action,
  tenantId,
  reviewer,
  now,
  rejectReason = '',
  ownerSummary = ''
}) {
  if (['approve', 'reject'].indexOf(action) === -1) {
    throw createError('INVALID_ACTION', '审核动作不正确')
  }
  const approved = action === 'approve'
  const transition = await runTransaction(async (transaction) => {
    const log = await transaction.getStageLog(stageLogId)
    if (!log) throw createError('STAGE_LOG_NOT_FOUND', '日报不存在')
    if (!tenantMatches(log.tenantId, tenantId)) throw createError('FORBIDDEN', '无权审核该日报')

    const previousStatus = log.reviewStatus || 'pending'
    if (previousStatus !== 'pending') {
      throw createError('ALREADY_REVIEWED', '该日报已审核，请勿重复操作')
    }

    let project = null
    let projectPatch = null
    if (approved) {
      project = await transaction.getProject(log.projectId)
      if (!project) throw createError('PROJECT_NOT_FOUND', '日报对应工地不存在')
      if (!tenantMatches(project.tenantId, tenantId)) {
        throw createError('PROJECT_TENANT_MISMATCH', '日报对应工地不属于当前企业')
      }
      const currentProgress = Number(project.progress || 0)
      const logProgress = Number(log.progress || 0)
      projectPatch = {
        progress: Math.max(currentProgress, logProgress),
        updatedAt: now
      }
      if (!project.currentStage || logProgress > currentProgress) {
        projectPatch.currentStage = log.stage || project.currentStage || ''
      }
    }

    const nextStatus = approved ? 'approved' : 'rejected'
    const reviewRecord = {
      action,
      previousStatus,
      nextStatus,
      rejectReason: approved ? '' : rejectReason,
      reviewedBy: reviewer,
      reviewedAt: now
    }
    const logPatch = {
      previousReviewStatus: previousStatus,
      reviewStatus: nextStatus,
      ownerVisible: approved,
      rejectReason: approved ? '' : rejectReason,
      auditComment: approved ? '' : rejectReason,
      reviewedBy: reviewer,
      reviewedByOpenid: reviewer.openid || '',
      reviewedByName: reviewer.name || '',
      reviewedAt: now,
      noticeStatus: approved ? 'pending' : 'not_required',
      noticeError: '',
      updatedAt: now
    }
    if (approved && ownerSummary) logPatch.ownerSummary = ownerSummary

    await transaction.updateStageLog(logPatch, reviewRecord)
    await transaction.updatePhotos({ ownerVisible: approved, updatedAt: now })
    if (projectPatch) await transaction.updateProject(log.projectId, projectPatch)

    return { approved, log: Object.assign({}, log, logPatch), project }
  })

  let noticeStatus = transition.approved ? 'pending' : 'not_required'
  let noticeError = ''
  let noticeTrackingError = ''
  if (transition.approved) {
    try {
      const result = await sendNotice(transition.project, transition.log)
      if (result.sentCount < result.totalCount) {
        throw createError('NOTICE_PARTIAL_FAILURE', '业主订阅消息部分发送失败')
      }
      noticeStatus = result.totalCount > 0 ? 'sent' : 'not_required'
    } catch (error) {
      noticeStatus = 'failed'
      noticeError = String(error.message || '业主通知发送失败').slice(0, 200)
    }
    try {
      await updateNoticeStatus(noticeStatus, noticeError)
    } catch (error) {
      noticeTrackingError = String(error.message || '通知状态写回失败').slice(0, 200)
    }
  }

  return {
    ok: true,
    ownerVisible: transition.approved,
    noticeStatus,
    noticeError,
    noticeTrackingError
  }
}

module.exports = {
  executeStageLogReview,
  tenantMatches
}
