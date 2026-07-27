const {
  createError,
  buildProjectProgressPatch,
  runApprovalNotice,
  tenantMatches,
  DEFAULT_TENANT_ID
} = require('./stage-flow')
const {
  isLegacyStageLog,
  validateSubmissionSlotLinkage,
  submissionStateInconsistent
} = require('./submission-slot')

function isReviewBusinessError(error) {
  return error && [
    'STAGE_LOG_NOT_FOUND',
    'PROJECT_NOT_FOUND',
    'TENANT_MISMATCH',
    'ALREADY_REVIEWED',
    'SUBMISSION_STATE_INCONSISTENT'
  ].indexOf(error.code) !== -1
}

function reviewFailure(error) {
  if (isReviewBusinessError(error)) return error
  if (error && ['COLLECTION_NOT_FOUND', 'PERMISSION_DENIED', 'TRANSACTION_UNAVAILABLE'].indexOf(error.code) !== -1) {
    return createError('REVIEW_STORE_UNAVAILABLE', '日报审核存储不可用，请稍后重试')
  }
  return createError('REVIEW_TRANSACTION_FAILED', '日报审核事务失败，请稍后重试')
}

async function reviewStageLog(options) {
  const {
    db,
    _,
    event,
    user,
    openid,
    tenantId,
    sendOwnerNotice,
    now
  } = options

  const stageLogId = String(event.stageLogId || '').trim()
  const action = String(event.action || '').trim()
  if (!stageLogId) throw new Error('缺少日报 ID')
  if (['approve', 'reject'].indexOf(action) === -1) throw new Error('审核动作不正确')

  const approved = action === 'approve'
  const rejectReason = String(event.rejectReason || event.comment || '').trim()
  let transactionResult
  try {
    transactionResult = await db.runTransaction(async (transaction) => {
    const logRes = await transaction.collection('stage_logs').doc(stageLogId).get()
    const log = logRes.data
    if (!log) throw createError('STAGE_LOG_NOT_FOUND', '日报不存在')
    if (!tenantMatches(log.tenantId, tenantId)) {
      throw createError('TENANT_MISMATCH', '无权审核该日报')
    }

    const currentReviewStatus = log.reviewStatus || 'pending'
    if (currentReviewStatus !== 'pending') {
      return {
        ok: true,
        code: 'ALREADY_REVIEWED',
        alreadyReviewed: true,
        ownerVisible: log.ownerVisible === true,
        reviewStatus: currentReviewStatus,
        noticeRequired: false
      }
    }

    let project = null
    let submissionKeyRef = null
    if (!isLegacyStageLog(log)) {
      project = (await transaction.collection('projects').doc(log.projectId).get()).data || null
      if (!project || !tenantMatches(project.tenantId, tenantId)) {
        throw submissionStateInconsistent(String(log.submissionKeyId || '').trim(), 'project_missing_or_out_of_scope')
      }
      const submissionKeyId = String(log.submissionKeyId || '').trim()
      submissionKeyRef = transaction.collection('stage_log_submission_keys').doc(submissionKeyId)
      const submissionKey = (await submissionKeyRef.get()).data || null
      const linkageReason = validateSubmissionSlotLinkage({
        stageLog: log,
        stageLogId,
        submissionKey,
        submissionKeyId,
        tenantId,
        project
      })
      if (linkageReason) throw submissionStateInconsistent(submissionKeyId, linkageReason)
    }

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
      reviewedBy: user._id || openid,
      reviewedByName: user.name || '',
      reviewedAt: now,
      updatedAt: now
    }
    if (approved && event.ownerSummary) {
      updateData.ownerSummary = String(event.ownerSummary).trim().slice(0, 200)
    }

    let projectPatchInfo = null
    if (approved && log.projectId) {
      if (!project) {
        const projectRes = await transaction.collection('projects').doc(log.projectId).get()
        project = projectRes.data || null
      }
      if (!project) throw createError('PROJECT_NOT_FOUND', '日报对应工地不存在')
      if (!tenantMatches(project.tenantId, tenantId)) {
        throw createError('TENANT_MISMATCH', '无权审核该工地日报')
      }
      projectPatchInfo = buildProjectProgressPatch(project, log, now)
      Object.assign(updateData, {
        isHistoricalOrRework: projectPatchInfo.isHistoricalOrRework,
        projectStageAdvanced: projectPatchInfo.stageAdvanced,
        projectProgressAdvanced: projectPatchInfo.progressAdvanced
      })
      await transaction.collection('projects').doc(log.projectId).update({ data: projectPatchInfo.patch })
    }

    await transaction.collection('stage_logs').doc(stageLogId).update({ data: updateData })
    if (submissionKeyRef) {
      const keyUpdate = {
        currentStatus: approved ? 'approved' : 'rejected',
        updatedAt: now
      }
      if (!approved) keyUpdate.lastRejectedAt = now
      await submissionKeyRef.update({ data: keyUpdate })
    }
    const photoTenantScope = tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId
    await transaction.collection('photos').where({ stageLogId, tenantId: photoTenantScope }).update({
      data: {
        ownerVisible: approved,
        updatedAt: now
      }
    })

    return {
      ok: true,
      alreadyReviewed: false,
      ownerVisible: approved,
      reviewStatus: approved ? 'approved' : 'rejected',
      noticeRequired: approved && !!log.projectId,
      projectId: log.projectId || '',
      projectPatchInfo
    }
    })
  } catch (error) {
    throw reviewFailure(error)
  }

  if (!transactionResult.noticeRequired) return transactionResult

  const notice = await runApprovalNotice({
    now,
    sendNotice: () => sendOwnerNotice({
      projectId: transactionResult.projectId,
      stageLogId,
      tenantId
    }),
    updateStatus: (data) => db.collection('stage_logs').doc(stageLogId).update({ data })
  })
  return Object.assign({}, transactionResult, notice)
}

module.exports = {
  reviewStageLog
}
