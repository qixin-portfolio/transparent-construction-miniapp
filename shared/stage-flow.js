const STAGES = [
  { code: 'start_briefing', name: '开工交底', progress: 10 },
  { code: 'demolition', name: '拆改', progress: 15 },
  { code: 'water_electric_position', name: '水电定位', progress: 20 },
  { code: 'water_electric_acceptance', name: '水电验收', progress: 30 },
  { code: 'waterproof', name: '防水/闭水', progress: 40 },
  { code: 'tile_work', name: '瓦工', progress: 50 },
  { code: 'tile_grouting', name: '美缝', progress: 55 },
  { code: 'carpentry_ceiling', name: '木工/吊顶', progress: 65 },
  { code: 'painting', name: '油工/刮墙', progress: 75 },
  { code: 'custom_install', name: '定制安装', progress: 80 },
  { code: 'main_material_door', name: '主材-木门', progress: 84 },
  { code: 'main_material_wardrobe', name: '主材-衣柜', progress: 86 },
  { code: 'main_material_cabinet', name: '主材-橱柜', progress: 88 },
  { code: 'main_material_stone', name: '主材-石材', progress: 90 },
  { code: 'aluminum_ceiling', name: '铝扣板吊顶', progress: 92 },
  { code: 'switch_socket', name: '开关插座', progress: 95 },
  { code: 'lighting', name: '灯具', progress: 97 },
  { code: 'curtain', name: '窗帘', progress: 98 },
  { code: 'final_acceptance', name: '竣工验收', progress: 100 }
]

const REVIEW_ROLES = ['admin', 'boss_qi', 'boss_hu']
const DELIVERED_STATUS_CODES = ['completed', 'delivered', 'after_sales']
const DELIVERED_STATUS_TEXTS = ['已完工', '已交付', '竣工验收', '售后中']
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'

function createError(code, message) {
  const error = new Error(message || code)
  error.code = code
  return error
}

function tenantMatches(resourceTenantId, tenantId) {
  return resourceTenantId ? resourceTenantId === tenantId : tenantId === DEFAULT_TENANT_ID
}

function normalizeText(value) {
  return String(value || '').trim()
}

function normalizeProgress(value) {
  const progress = Number(value)
  if (!Number.isFinite(progress)) return 0
  if (progress < 0) return 0
  if (progress > 100) return 100
  return progress
}

function findStageByCode(code) {
  const normalized = normalizeText(code)
  if (!normalized) return null
  return STAGES.find((stage) => stage.code === normalized) || null
}

function findStageByName(name) {
  const normalized = normalizeText(name)
  if (!normalized) return null
  return STAGES.find((stage) => stage.name === normalized) || null
}

function resolveStage(input) {
  if (!input) return null
  return findStageByCode(input.stageCode || input.currentStageCode || input.code) ||
    findStageByName(input.stage || input.currentStage || input.name)
}

function getStageOrder(stageLike) {
  const stage = resolveStage(stageLike)
  return stage ? STAGES.findIndex((item) => item.code === stage.code) : -1
}

function isReviewRole(role) {
  return REVIEW_ROLES.indexOf(normalizeText(role)) !== -1
}

function isDeliveredProject(project = {}) {
  const statusCode = normalizeText(project.statusCode)
  const status = normalizeText(project.status)
  return DELIVERED_STATUS_CODES.indexOf(statusCode) !== -1 || DELIVERED_STATUS_TEXTS.indexOf(status) !== -1
}

function resolveSubmissionStage(event = {}, project = {}) {
  const eventStage = findStageByCode(event.stageCode)
  if (eventStage) {
    return Object.assign({}, eventStage, { source: 'event' })
  }

  const projectStage = resolveStage({
    stageCode: project.currentStageCode || project.stageCode,
    stage: project.currentStage || project.stage
  })
  if (projectStage) {
    return Object.assign({}, projectStage, { source: 'project_current' })
  }

  throw createError('STAGE_REQUIRED', '请选择本次施工工序')
}

function getLogStage(log = {}) {
  const stage = resolveStage(log)
  if (!stage) {
    throw createError('INVALID_STAGE', '日报工序无效')
  }
  return stage
}

function buildProjectProgressPatch(project = {}, log = {}, now) {
  const logStage = getLogStage(log)
  const currentStage = resolveStage({
    stageCode: project.currentStageCode || project.stageCode,
    stage: project.currentStage || project.stage
  })
  const logOrder = getStageOrder(logStage)
  const currentOrder = currentStage ? getStageOrder(currentStage) : -1
  const shouldAdvanceStage = currentOrder < 0 || logOrder > currentOrder
  const currentProgress = normalizeProgress(project.progress)
  const logProgress = normalizeProgress(log.progress || logStage.progress)
  const nextProgress = Math.max(currentProgress, logProgress)
  const patch = { updatedAt: now }

  if (shouldAdvanceStage) {
    patch.currentStage = logStage.name
    patch.currentStageCode = logStage.code
  }
  if (nextProgress !== currentProgress) {
    patch.progress = nextProgress
  }

  return {
    patch,
    logStage,
    currentStage,
    isHistoricalOrRework: currentOrder >= 0 && logOrder < currentOrder,
    stageAdvanced: shouldAdvanceStage,
    progressAdvanced: nextProgress > currentProgress,
    projectWasDelivered: isDeliveredProject(project)
  }
}

function safeNoticeText(value) {
  return String(value || '')
    .replace(/(openid|token|secret|fileid|phone|mobile)[^\s,;，；]*/gi, '$1:[redacted]')
    .trim()
    .slice(0, 200)
}

function summarizeNoticeResults(noticeResponse) {
  const result = noticeResponse && noticeResponse.result ? noticeResponse.result : noticeResponse
  if (!result || result.skipped) {
    return {
      status: 'not_requested',
      requestedCount: 0,
      successCount: 0,
      failureCount: 0,
      errorSummary: result && result.reason ? safeNoticeText(result.reason) : ''
    }
  }

  const hasCounts = Number.isFinite(Number(result.totalCount)) || Number.isFinite(Number(result.sentCount))
  const requestedCount = hasCounts ? Math.max(0, Number(result.totalCount) || 0) : (result.ok ? 1 : 1)
  const successCount = hasCounts ? Math.min(requestedCount, Math.max(0, Number(result.sentCount) || 0)) : (result.ok ? 1 : 0)
  const failureCount = Math.max(0, requestedCount - successCount)
  let status = 'failed'
  if (requestedCount === 0) status = 'not_requested'
  else if (failureCount === 0) status = 'sent'
  else if (successCount > 0) status = 'partial'

  return {
    status,
    requestedCount,
    successCount,
    failureCount,
    errorSummary: status === 'sent' ? '' : safeNoticeText(result.message || result.reason || result.errMsg || '通知发送失败')
  }
}

function buildNoticeStatusData(summary, now) {
  return {
    noticeStatus: summary.status,
    noticeRequestedCount: summary.requestedCount,
    noticeSuccessCount: summary.successCount,
    noticeFailureCount: summary.failureCount,
    noticeAttemptedAt: now,
    noticeErrorSummary: summary.errorSummary,
    noticeStatusUpdatedAt: now
  }
}

async function runApprovalNotice(options = {}) {
  const { sendNotice, updateStatus } = options
  const now = options.now
  if (!sendNotice) {
    return {
      noticeStatus: 'not_requested',
      noticeExecutionStatus: 'not_requested',
      noticeError: ''
    }
  }

  let summary
  try {
    summary = summarizeNoticeResults(await sendNotice())
  } catch (error) {
    summary = {
      status: 'failed',
      requestedCount: 1,
      successCount: 0,
      failureCount: 1,
      errorSummary: safeNoticeText(error && error.message) || '通知发送失败'
    }
  }

  const statusData = buildNoticeStatusData(summary, now)
  if (!updateStatus) {
    return Object.assign({}, statusData, {
      noticeExecutionStatus: summary.status,
      noticeError: summary.errorSummary
    })
  }

  try {
    await updateStatus(statusData)
    return Object.assign({}, statusData, {
      noticeExecutionStatus: summary.status,
      noticeError: summary.errorSummary
    })
  } catch (error) {
    return Object.assign({}, statusData, {
      noticeStatus: 'persist_failed',
      noticeExecutionStatus: summary.status,
      noticeError: summary.errorSummary,
      warningCode: 'NOTICE_STATUS_PERSIST_FAILED',
      warningMessage: '审核已完成，但通知状态未能记录'
    })
  }
}

module.exports = {
  STAGES,
  REVIEW_ROLES,
  DEFAULT_TENANT_ID,
  createError,
  tenantMatches,
  normalizeProgress,
  findStageByCode,
  findStageByName,
  resolveStage,
  resolveSubmissionStage,
  getLogStage,
  getStageOrder,
  isReviewRole,
  isDeliveredProject,
  buildProjectProgressPatch,
  safeNoticeText,
  summarizeNoticeResults,
  buildNoticeStatusData,
  runApprovalNotice
}
