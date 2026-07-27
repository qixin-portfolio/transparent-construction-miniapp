// GENERATED FILE - DO NOT EDIT. Source: shared/
const { createError, tenantMatches } = require('./stage-flow')

function hasOwn(object, field) {
  return Object.prototype.hasOwnProperty.call(object || {}, field)
}

function isLegacyStageLog(stageLog) {
  return !hasOwn(stageLog, 'submissionKeyId') && !hasOwn(stageLog, 'submissionAttemptNo')
}

function submitterId(stageLog) {
  return String(stageLog.submittedBy || stageLog.createdBy || '').trim()
}

function stageLogStatus(stageLog) {
  return String(stageLog.reviewStatus || 'pending').trim()
}

function validateSubmissionSlotLinkage({
  stageLog,
  stageLogId,
  submissionKey,
  submissionKeyId,
  tenantId,
  project
}) {
  if (!stageLog || !submissionKey || !submissionKeyId) return 'missing_slot_data'
  if (String(stageLog.submissionKeyId || '').trim() !== submissionKeyId) return 'declared_key_id_mismatch'
  if (!tenantMatches(stageLog.tenantId, tenantId) || !tenantMatches(submissionKey.tenantId, tenantId)) return 'tenant_mismatch'
  if (!project || !tenantMatches(project.tenantId, tenantId)) return 'project_tenant_mismatch'
  if (stageLog.projectId !== project._id || submissionKey.projectId !== project._id) return 'project_mismatch'
  if (submissionKey.stageCode !== stageLog.stageCode) return 'stage_mismatch'
  if (!submitterId(stageLog) || submissionKey.submitterId !== submitterId(stageLog)) return 'submitter_mismatch'
  if (!stageLog.businessDate || submissionKey.businessDate !== stageLog.businessDate) return 'business_date_mismatch'
  if (submissionKey.currentStageLogId !== stageLogId) return 'current_stage_log_mismatch'
  if (!Number.isInteger(stageLog.submissionAttemptNo) || submissionKey.attemptNo !== stageLog.submissionAttemptNo) return 'attempt_mismatch'
  if (submissionKey.currentStatus !== stageLogStatus(stageLog)) return 'current_status_mismatch'
  return ''
}

function submissionStateInconsistent(submissionKeyId, reason) {
  console.warn('stage submission state inconsistent', { submissionKeyId, reason })
  return createError('SUBMISSION_STATE_INCONSISTENT', '日报提交状态异常，请联系管理员处理')
}

module.exports = {
  isLegacyStageLog,
  validateSubmissionSlotLinkage,
  submissionStateInconsistent
}
