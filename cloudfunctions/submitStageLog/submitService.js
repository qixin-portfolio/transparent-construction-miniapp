const {
  createError,
  resolveSubmissionStage,
  buildProjectProgressPatch,
  isReviewRole,
  normalizeProgress,
  runApprovalNotice,
  tenantMatches
} = require('./stage-flow')
const {
  findStageLogsForBusinessDay,
  buildSubmissionIdempotencyKey,
  createSubmissionRequestContext
} = require('./guards')
const {
  isLegacyStageLog,
  validateSubmissionSlotLinkage,
  submissionStateInconsistent
} = require('./submission-slot')

function clipText(value, limit = 1200) {
  return String(value || '').trim().slice(0, limit)
}

function normalizeIssueText(value) {
  const text = clipText(value, 300)
  const compact = text.replace(/[，。！？；：,.!?;:\s]/g, '')
  const noIssueTexts = [
    '无',
    '无问题',
    '暂无问题',
    '没有问题',
    '无现场问题',
    '暂无现场问题',
    '没有现场问题',
    '无明显现场问题',
    '暂无明显现场问题',
    '没有明显现场问题',
    '暂未发现现场问题',
    '暂未发现明显现场问题',
    '未发现现场问题',
    '未发现明显现场问题',
    '无明显异常',
    '暂无明显异常',
    '没有明显异常',
    '现场验收合格'
  ]
  return noIssueTexts.indexOf(compact) !== -1 ? '' : text
}

function normalizeAiDraft(value) {
  if (!value || typeof value !== 'object') return null
  return {
    workContent: clipText(value.workContent, 600),
    issue: normalizeIssueText(value.issue),
    needConfirm: clipText(value.needConfirm, 300),
    tomorrowPlan: clipText(value.tomorrowPlan, 300),
    ownerSummary: clipText(value.ownerSummary, 300),
    reviewFocus: clipText(value.reviewFocus, 300),
    sourceType: clipText(value.sourceType, 40)
  }
}

function isBusinessError(error) {
  return error && [
    'PROJECT_NOT_FOUND',
    'TENANT_MISMATCH',
    'STAGE_REQUIRED',
    'INVALID_STAGE_CODE',
    'ALREADY_SUBMITTED',
    'SUBMISSION_STATE_INCONSISTENT'
  ].indexOf(error.code) !== -1
}

function submissionFailure(error) {
  if (isBusinessError(error)) return error
  const unavailableCodes = ['COLLECTION_NOT_FOUND', 'PERMISSION_DENIED', 'TRANSACTION_UNAVAILABLE']
  if (error && unavailableCodes.indexOf(error.code) !== -1) {
    return createError('IDEMPOTENCY_STORE_UNAVAILABLE', '日报提交去重存储不可用，请稍后重试')
  }
  return createError('SUBMISSION_TRANSACTION_FAILED', '日报提交事务失败，请稍后重试')
}

async function createStageLog(options) {
  const {
    db,
    _,
    event,
    user,
    openid,
    tenantId,
    tenantName,
    sendOwnerNotice,
    sendWecomMarkdown,
    now
  } = options

  const projectId = String(event.projectId || '').trim()
  const workContent = String(event.workContent || '').trim()
  if (!workContent) throw new Error('请填写今日完成')

  const photoFileIDs = Array.isArray(event.photoFileIDs) ? event.photoFileIDs.filter(Boolean) : []
  const sourceType = String(event.sourceType || 'manual').trim()
  const reviewerSelfUpload = isReviewRole(user.role)
  const requestContext = options.requestContext || createSubmissionRequestContext(options.requestNow || new Date())

  let transactionResult
  try {
    transactionResult = await db.runTransaction(async (transaction) => {
    const freshProjectRes = await transaction.collection('projects').doc(projectId).get()
    const freshProject = freshProjectRes.data || null
    if (!freshProject) throw createError('PROJECT_NOT_FOUND', '工地不存在')
    if (!tenantMatches(freshProject.tenantId, tenantId)) {
      throw createError('TENANT_MISMATCH', '当前账号无权提交该工地日报')
    }

    const stage = resolveSubmissionStage(event, freshProject)
    const businessDate = requestContext.businessDate
    const submissionKeyId = buildSubmissionIdempotencyKey({
      tenantId,
      projectId,
      stageCode: stage.code,
      openid,
      userId: user._id || '',
      businessDate
    })
    const submissionKeyRef = transaction.collection('stage_log_submission_keys').doc(submissionKeyId)
    const existingKey = (await submissionKeyRef.get()).data || null
    let attemptNo = 1
    let lastRejectedAt = null

    if (existingKey) {
      const currentStageLogId = String(existingKey.currentStageLogId || '').trim()
      if (!currentStageLogId) {
        throw submissionStateInconsistent(submissionKeyId, 'key_schema_incomplete')
      }
      const currentLog = (await transaction.collection('stage_logs').doc(currentStageLogId).get()).data || null
      const linkageReason = validateSubmissionSlotLinkage({
        stageLog: currentLog,
        stageLogId: currentStageLogId,
        submissionKey: existingKey,
        submissionKeyId,
        tenantId,
        project: freshProject
      })
      if (linkageReason) throw submissionStateInconsistent(submissionKeyId, linkageReason)
      if (existingKey.currentStatus === 'pending' || existingKey.currentStatus === 'approved') {
        throw createError('ALREADY_SUBMITTED', `${stage.name} 节点今天已提交过日报，请勿重复操作`)
      }
      if (existingKey.currentStatus !== 'rejected') {
        throw submissionStateInconsistent(submissionKeyId, 'unsupported_current_status')
      }
      attemptNo = existingKey.attemptNo + 1
      lastRejectedAt = existingKey.lastRejectedAt || currentLog.reviewedAt || currentLog.updatedAt || now
    } else {
      const businessDayLogs = await findStageLogsForBusinessDay(
        transaction,
        _,
        projectId,
        tenantId,
        stage.code,
        stage.name,
        openid,
        user._id || '',
        requestContext
      )
      const partialNewLog = businessDayLogs.find((log) => !isLegacyStageLog(log))
      if (partialNewLog) {
        throw submissionStateInconsistent(String(partialNewLog.submissionKeyId || '').trim(), 'missing_or_partial_key')
      }
      const existingLog = businessDayLogs.find((log) => (log.reviewStatus || 'pending') !== 'rejected')
      if (existingLog) {
        throw createError('ALREADY_SUBMITTED', `${stage.name} 节点今天已提交过日报，请勿重复操作`)
      }
    }

    const progress = normalizeProgress(event.progress || stage.progress)
    const logData = {
      projectId,
      tenantId,
      tenantName,
      projectName: String(event.projectName || freshProject.name || '').trim(),
      stage: stage.name,
      stageCode: stage.code,
      progress,
      workContent,
      issue: normalizeIssueText(event.issue),
      needConfirm: String(event.needConfirm || '').trim(),
      tomorrowPlan: String(event.tomorrowPlan || '').trim(),
      photoFileIDs,
      voiceFileID: String(event.voiceFileID || '').trim(),
      voiceDuration: Number(event.voiceDuration || 0),
      voiceTranscript: clipText(event.voiceTranscript, 1200),
      ownerSummary: clipText(event.ownerSummary, 500),
      reviewFocus: clipText(event.reviewFocus, 500),
      aiDraft: normalizeAiDraft(event.aiDraft),
      aiGenerated: /^ai_/.test(sourceType),
      sourceType,
      submissionKey: submissionKeyId,
      submissionKeyId,
      submissionAttemptNo: attemptNo,
      businessDate,
      submissionBusinessDate: businessDate,
      reviewStatus: reviewerSelfUpload ? 'approved' : 'pending',
      ownerVisible: reviewerSelfUpload,
      submittedByOpenid: openid,
      submittedBy: user._id || openid,
      submittedByName: user.name || '',
      reviewRecords: reviewerSelfUpload ? [{
        action: 'approve',
        approvalMode: 'reviewer_self_upload',
        reviewedByOpenid: openid,
        reviewedByName: user.name || '',
        reviewedAt: now
      }] : [],
      createdAt: now,
      updatedAt: now
    }

    let projectPatchInfo = null
    if (reviewerSelfUpload) {
      projectPatchInfo = buildProjectProgressPatch(freshProject, logData, now)
      Object.assign(logData, {
        reviewedByOpenid: openid,
        reviewedBy: user._id || openid,
        reviewedByName: user.name || '',
        reviewedAt: now,
        approvalMode: 'reviewer_self_upload',
        isHistoricalOrRework: projectPatchInfo.isHistoricalOrRework,
        projectStageAdvanced: projectPatchInfo.stageAdvanced,
        projectProgressAdvanced: projectPatchInfo.progressAdvanced
      })
    }

    const logRes = await transaction.collection('stage_logs').add({ data: logData })
    const logId = logRes._id
    const currentStatus = reviewerSelfUpload ? 'approved' : 'pending'
    const keyData = {
      tenantId,
      projectId,
      stageCode: stage.code,
      submitterId: user._id || openid,
      businessDate,
      currentStageLogId: logId,
      currentStatus,
      attemptNo,
      updatedAt: now
    }
    if (existingKey) {
      keyData.lastRejectedAt = lastRejectedAt
      await submissionKeyRef.update({ data: keyData })
    } else {
      await submissionKeyRef.set({
        data: Object.assign({}, keyData, {
          createdAt: now,
          lastRejectedAt: null
        })
      })
    }
    for (const fileID of photoFileIDs) {
      await transaction.collection('photos').add({
        data: {
          projectId,
          tenantId,
          tenantName,
          stageLogId: logId,
          fileID,
          stage: stage.name,
          stageCode: stage.code,
          ownerVisible: reviewerSelfUpload,
          createdByOpenid: openid,
          createdBy: user._id || openid,
          createdAt: now,
          updatedAt: now
        }
      })
    }
    if (reviewerSelfUpload) {
      await transaction.collection('projects').doc(projectId).update({ data: projectPatchInfo.patch })
    }
    return {
      id: logId,
      stage,
      autoApproved: reviewerSelfUpload,
      reviewStatus: currentStatus,
      projectPatchInfo,
      projectName: freshProject.name || '',
      photoCount: photoFileIDs.length
    }
    })
  } catch (error) {
    throw submissionFailure(error)
  }

  if (reviewerSelfUpload) {
    const notice = await runApprovalNotice({
      now,
      sendNotice: () => sendOwnerNotice({
        projectId,
        stageLogId: transactionResult.id,
        tenantId
      }),
      updateStatus: (data) => db.collection('stage_logs').doc(transactionResult.id).update({ data })
    })
    return Object.assign({}, transactionResult, notice)
  }

  let noticeSent = false
  let noticeError = ''
  try {
    noticeSent = await sendWecomMarkdown([
      '### 新工地日报待审核',
      `> 工地：${transactionResult.projectName || '未命名工地'}`,
      `> 工序：${transactionResult.stage.name}`,
      `> 提交人：${user.name || user.role || '内部人员'}`,
      `> 照片：${transactionResult.photoCount} 张`,
      '',
      workContent.slice(0, 120)
    ].join('\n'))
  } catch (error) {
    noticeError = error.message || '企业微信提醒发送失败'
  }

  return {
    id: transactionResult.id,
    stage: transactionResult.stage,
    autoApproved: false,
    reviewStatus: 'pending',
    noticeSent,
    noticeError
  }
}

module.exports = {
  clipText,
  normalizeIssueText,
  normalizeAiDraft,
  createSubmissionRequestContext,
  createStageLog
}
