// GENERATED FILE - DO NOT EDIT. Source: shared/
const { createError, tenantMatches } = require('./stage-flow')
const crypto = require('node:crypto')

const MAX_IDENTIFIER_LENGTH = 128
const SLOT_STATUSES = new Set(['pending', 'approved', 'rejected'])

function hasOwn(object, field) {
  return Object.prototype.hasOwnProperty.call(object || {}, field)
}

function isLegacyStageLog(stageLog) {
  return !hasOwn(stageLog, 'submissionKeyId') && !hasOwn(stageLog, 'submissionAttemptNo')
}

function submitterId(stageLog) {
  return stageLog && (stageLog.submittedBy || stageLog.createdBy)
}

function stageLogStatus(stageLog) {
  return stageLog && stageLog.reviewStatus
}

function isCanonicalIdentifier(value) {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_IDENTIFIER_LENGTH &&
    value.trim() === value
}

function isBusinessDate(value) {
  if (typeof value !== 'string') return false
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-') === value
}

function buildSubmissionKeyId({ tenantId, projectId, stageCode, submitterId, businessDate }) {
  const payload = JSON.stringify([tenantId, projectId, stageCode, submitterId, businessDate])
  const digest = crypto.createHash('sha256').update(payload).digest('hex')
  return `stage-log-submission:v1:${digest}`
}

function validateSubmissionKeyRecord(submissionKey) {
  if (!submissionKey) return 'missing_submission_key'
  if (!isCanonicalIdentifier(submissionKey._id) ||
    !isCanonicalIdentifier(submissionKey.tenantId) ||
    !isCanonicalIdentifier(submissionKey.projectId) ||
    !isCanonicalIdentifier(submissionKey.stageCode) ||
    !isCanonicalIdentifier(submissionKey.submitterId) ||
    !isCanonicalIdentifier(submissionKey.currentStageLogId)) return 'invalid_slot_identifier'
  if (!isBusinessDate(submissionKey.businessDate)) return 'invalid_business_date'
  if (!Number.isInteger(submissionKey.attemptNo) || submissionKey.attemptNo < 1) return 'invalid_attempt_number'
  if (!SLOT_STATUSES.has(submissionKey.currentStatus)) return 'invalid_slot_status'
  const expectedKeyId = buildSubmissionKeyId(submissionKey)
  return submissionKey._id === expectedKeyId ? '' : 'non_canonical_submission_key'
}

function validateStageLogSubmissionFields(stageLog, stageLogId) {
  if (!stageLog || !isCanonicalIdentifier(stageLogId) || stageLog._id !== stageLogId) return 'invalid_slot_identifier'
  if (!isCanonicalIdentifier(stageLog.submissionKeyId) ||
    !isCanonicalIdentifier(stageLog.tenantId) ||
    !isCanonicalIdentifier(stageLog.projectId) ||
    !isCanonicalIdentifier(stageLog.stageCode) ||
    !isCanonicalIdentifier(submitterId(stageLog))) return 'invalid_slot_identifier'
  if (!isBusinessDate(stageLog.businessDate)) return 'invalid_business_date'
  if (!Number.isInteger(stageLog.submissionAttemptNo) || stageLog.submissionAttemptNo < 1) return 'invalid_attempt_number'
  return SLOT_STATUSES.has(stageLogStatus(stageLog)) ? '' : 'invalid_slot_status'
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
  const keyReason = validateSubmissionKeyRecord(submissionKey)
  if (keyReason) return keyReason
  const stageLogReason = validateStageLogSubmissionFields(stageLog, stageLogId)
  if (stageLogReason) return stageLogReason
  if (!isCanonicalIdentifier(submissionKeyId)) return 'invalid_slot_identifier'
  if (stageLog.submissionKeyId !== submissionKeyId) return 'declared_key_id_mismatch'
  if (submissionKey._id !== submissionKeyId) return 'declared_key_id_mismatch'
  if (!isCanonicalIdentifier(tenantId)) return 'invalid_slot_identifier'
  if (!tenantMatches(stageLog.tenantId, tenantId) || !tenantMatches(submissionKey.tenantId, tenantId)) return 'tenant_mismatch'
  if (!project || !isCanonicalIdentifier(project._id) || !isCanonicalIdentifier(project.tenantId) || !tenantMatches(project.tenantId, tenantId)) return 'project_tenant_mismatch'
  if (stageLog.projectId !== project._id || submissionKey.projectId !== project._id) return 'project_mismatch'
  if (submissionKey.stageCode !== stageLog.stageCode) return 'stage_mismatch'
  if (submissionKey.submitterId !== submitterId(stageLog)) return 'submitter_mismatch'
  if (submissionKey.businessDate !== stageLog.businessDate) return 'business_date_mismatch'
  if (submissionKey.currentStageLogId !== stageLogId) return 'current_stage_log_mismatch'
  if (submissionKey.attemptNo !== stageLog.submissionAttemptNo) return 'attempt_mismatch'
  if (submissionKey.currentStatus !== stageLogStatus(stageLog)) return 'current_status_mismatch'
  return ''
}

function submissionStateInconsistent(submissionKeyId, reason) {
  console.warn('stage submission state inconsistent', { reason })
  return createError('SUBMISSION_STATE_INCONSISTENT', '日报提交状态异常，请联系管理员处理')
}

module.exports = {
  isLegacyStageLog,
  isBusinessDate,
  isCanonicalIdentifier,
  buildSubmissionKeyId,
  validateSubmissionKeyRecord,
  validateStageLogSubmissionFields,
  validateSubmissionSlotLinkage,
  submissionStateInconsistent
}
