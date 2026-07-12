const {
  resolveSubmissionStage,
  buildProjectProgressPatch,
  isReviewRole,
  normalizeProgress,
  runApprovalNotice
} = require('./stage-flow')

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

async function createStageLog(options) {
  const {
    db,
    _,
    event,
    user,
    openid,
    tenantId,
    tenantName,
    project,
    existingLog,
    sendOwnerNotice,
    sendWecomMarkdown,
    now
  } = options

  const projectId = String(event.projectId || '').trim()
  const workContent = String(event.workContent || '').trim()
  if (!workContent) throw new Error('请填写今日完成')

  const stage = resolveSubmissionStage(event, project)
  if (existingLog) {
    throw new Error(`${stage.name} 节点今天已提交过日报，请勿重复操作`)
  }

  const photoFileIDs = Array.isArray(event.photoFileIDs) ? event.photoFileIDs.filter(Boolean) : []
  const sourceType = String(event.sourceType || 'manual').trim()
  const reviewerSelfUpload = isReviewRole(user.role)
  const progress = normalizeProgress(event.progress || stage.progress)
  const logData = {
    projectId,
    tenantId,
    tenantName,
    projectName: String(event.projectName || project.name || '').trim(),
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

  if (reviewerSelfUpload) {
    const projectPatchInfo = buildProjectProgressPatch(project, logData, now)
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

  const transactionResult = await db.runTransaction(async (transaction) => {
    const logRes = await transaction.collection('stage_logs').add({ data: logData })
    const logId = logRes._id
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
    let projectPatchInfo = null
    if (reviewerSelfUpload) {
      projectPatchInfo = buildProjectProgressPatch(project, logData, now)
      await transaction.collection('projects').doc(projectId).update({ data: projectPatchInfo.patch })
    }
    return {
      id: logId,
      stage,
      autoApproved: reviewerSelfUpload,
      projectPatchInfo
    }
  })

  if (reviewerSelfUpload) {
    const notice = await runApprovalNotice({
      now,
      sendNotice: () => sendOwnerNotice(transactionResult.id),
      updateStatus: (data) => db.collection('stage_logs').doc(transactionResult.id).update({ data })
    })
    return Object.assign({}, transactionResult, notice)
  }

  let noticeSent = false
  let noticeError = ''
  try {
    noticeSent = await sendWecomMarkdown([
      '### 新工地日报待审核',
      `> 工地：${project.name || logData.projectName || '未命名工地'}`,
      `> 工序：${stage.name}`,
      `> 提交人：${user.name || user.role || '内部人员'}`,
      `> 照片：${photoFileIDs.length} 张`,
      '',
      workContent.slice(0, 120)
    ].join('\n'))
  } catch (error) {
    noticeError = error.message || '企业微信提醒发送失败'
  }

  return {
    id: transactionResult.id,
    stage,
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
  createStageLog
}
