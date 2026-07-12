const {
  buildProjectProgressPatch,
  runApprovalNotice
} = require('./stage-flow')

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
  const transactionResult = await db.runTransaction(async (transaction) => {
    const logRes = await transaction.collection('stage_logs').doc(stageLogId).get()
    const log = logRes.data
    if (!log) throw new Error('日报不存在')
    if (log.tenantId && log.tenantId !== tenantId) throw new Error('无权审核该日报')

    const currentReviewStatus = log.reviewStatus || 'pending'
    if (currentReviewStatus !== 'pending') {
      return {
        ok: true,
        alreadyReviewed: true,
        ownerVisible: log.ownerVisible === true,
        reviewStatus: currentReviewStatus,
        noticeRequired: false
      }
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
      const projectRes = await transaction.collection('projects').doc(log.projectId).get()
      const project = projectRes.data || {}
      if (project.tenantId && project.tenantId !== tenantId) throw new Error('无权审核该工地日报')
      projectPatchInfo = buildProjectProgressPatch(project, log, now)
      Object.assign(updateData, {
        isHistoricalOrRework: projectPatchInfo.isHistoricalOrRework,
        projectStageAdvanced: projectPatchInfo.stageAdvanced,
        projectProgressAdvanced: projectPatchInfo.progressAdvanced
      })
      await transaction.collection('projects').doc(log.projectId).update({ data: projectPatchInfo.patch })
    }

    await transaction.collection('stage_logs').doc(stageLogId).update({ data: updateData })
    await transaction.collection('photos').where({ stageLogId, tenantId: _.in([tenantId, '', null]) }).update({
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

  if (!transactionResult.noticeRequired) return transactionResult

  const notice = await runApprovalNotice({
    now,
    sendNotice: () => sendOwnerNotice(transactionResult.projectId, stageLogId),
    updateStatus: (data) => db.collection('stage_logs').doc(stageLogId).update({ data })
  })
  return Object.assign({}, transactionResult, notice)
}

module.exports = {
  reviewStageLog
}
