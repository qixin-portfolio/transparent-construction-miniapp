const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const VERSION = 'v1'
const SOURCE = 'real-evidence-summary'
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'
const ALLOWED_ROLES = ['admin', 'boss_qi', 'boss_hu']
const COMPLETED_PROJECT_CODES = ['completed', 'delivered']
const COMPLETED_PROJECT_STATUS = ['已完工', '完工', '已竣工', '竣工验收', '已交付']
const CLOSED_TICKET_STATUS = ['completed', 'done', 'closed', 'rejected']

const ERROR_MESSAGES = {
  INVALID_PARAM: '缺少客户 ID',
  UNAUTHENTICATED: '请先登录',
  FORBIDDEN: '当前账号无权查看该客户证据摘要',
  CUSTOMER_NOT_FOUND: '客户不存在',
  TENANT_MISMATCH: '客户或证据不属于当前门店',
  PROJECT_NOT_FOUND: '工地不存在或不属于该客户',
  NO_PROJECT: '该客户暂无关联工地',
  NO_EVIDENCE: '暂无可用证据摘要',
  NO_AUTHORIZATION: '存在证据但暂无公开案例授权',
  READ_FAILED: '读取证据摘要失败'
}

function getPrivacyGuard() {
  return {
    noRawPhotos: true,
    noFileIds: true,
    noTempFileURLs: true,
    noPersonalInfo: true,
    noConstructionDrawings: true,
    noDiaryBody: true,
    summaryOnly: true
  }
}

function getEmptyProjectSummary() {
  return {
    projectCount: 0,
    activeProjectCount: 0,
    completedProjectCount: 0,
    latestStage: null
  }
}

function getEmptyEvidenceSummary() {
  return {
    approvedStageCount: 0,
    ownerVisiblePhotoCount: 0,
    renderDrawingCount: 0,
    warrantyCardCount: 0,
    afterSalesTicketCount: 0,
    afterSalesClosedCount: 0,
    stageCoverage: [],
    availableProofTypes: [],
    dataConfidenceLevel: 'none',
    evidenceCompletenessScore: 0
  }
}

function getEmptyAuthorizationSummary() {
  return {
    hasApprovedCase: false,
    canUseForMarketing: false,
    allowedPlatforms: [],
    allowedMaterials: [],
    blockedReasons: []
  }
}

function getEmptyRecommendedUse() {
  return {
    internalTrustMaterials: [],
    publicCaseAssets: [],
    blockedReasons: []
  }
}

function makeBase(eventIds) {
  const base = {
    version: VERSION,
    source: SOURCE,
    customerId: eventIds.customerId || ''
  }
  if (eventIds.projectId) base.projectId = eventIds.projectId
  return base
}

function makeError(code, eventIds, overrides = {}) {
  const message = ERROR_MESSAGES[code] || ERROR_MESSAGES.READ_FAILED
  return Object.assign(makeBase(eventIds), {
    ok: false,
    code,
    projectSummary: overrides.projectSummary || getEmptyProjectSummary(),
    evidenceSummary: overrides.evidenceSummary || getEmptyEvidenceSummary(),
    authorizationSummary: overrides.authorizationSummary || getEmptyAuthorizationSummary(),
    recommendedUse: overrides.recommendedUse || getEmptyRecommendedUse(),
    privacyGuard: getPrivacyGuard(),
    error: {
      code,
      message
    }
  })
}

function makeSuccess(eventIds, payload) {
  return Object.assign(makeBase(eventIds), {
    ok: true,
    code: 'OK',
    projectSummary: payload.projectSummary,
    evidenceSummary: payload.evidenceSummary,
    authorizationSummary: payload.authorizationSummary,
    recommendedUse: payload.recommendedUse,
    privacyGuard: getPrivacyGuard()
  })
}

function toId(value) {
  return String(value || '').trim()
}

function createError(code) {
  const error = new Error(ERROR_MESSAGES[code] || ERROR_MESSAGES.READ_FAILED)
  error.code = code
  return error
}

function getErrorCode(error) {
  return ERROR_MESSAGES[error && error.code] ? error.code : 'READ_FAILED'
}

async function getCurrentUser() {
  const wxContext = cloud.getWXContext()
  const res = await db.collection('users')
    .where({ openid: wxContext.OPENID, status: 'active' })
    .field({
      _id: true,
      tenantId: true,
      tenantName: true,
      role: true,
      status: true
    })
    .limit(1)
    .get()
  const user = res.data[0] || null
  if (user && !user.tenantId) {
    user.tenantId = DEFAULT_TENANT_ID
    user.tenantName = DEFAULT_TENANT_NAME
  }
  return user
}

function assertUser(user) {
  if (!user) throw createError('UNAUTHENTICATED')
  if (ALLOWED_ROLES.indexOf(user.role) === -1) throw createError('FORBIDDEN')
}

async function getCustomerForAccess(customerId) {
  const res = await db.collection('customers')
    .where({ _id: customerId })
    .field({
      _id: true,
      tenantId: true,
      deleted: true
    })
    .limit(1)
    .get()
  return res.data[0] || null
}

function assertCustomer(customer, tenantId) {
  if (!customer || customer.deleted === true) throw createError('CUSTOMER_NOT_FOUND')
  if (customer.tenantId !== tenantId) throw createError('TENANT_MISMATCH')
}

function projectFields() {
  return {
    _id: true,
    tenantId: true,
    customerId: true,
    deleted: true,
    status: true,
    statusCode: true,
    currentStage: true,
    stage: true,
    progress: true,
    updatedAt: true,
    createdAt: true
  }
}

async function getProjectById(projectId) {
  const res = await db.collection('projects')
    .where({ _id: projectId })
    .field(projectFields())
    .limit(1)
    .get()
  return res.data[0] || null
}

async function listProjects(tenantId, customerId, projectId) {
  if (projectId) {
    const project = await getProjectById(projectId)
    if (!project || project.deleted === true || project.status === 'deleted') {
      throw createError('PROJECT_NOT_FOUND')
    }
    if (project.tenantId !== tenantId) throw createError('TENANT_MISMATCH')
    if (project.customerId !== customerId) throw createError('PROJECT_NOT_FOUND')
    return [project]
  }

  const res = await db.collection('projects')
    .where({
      tenantId,
      customerId,
      status: _.neq('deleted')
    })
    .field(projectFields())
    .orderBy('updatedAt', 'desc')
    .limit(1000)
    .get()
  return (res.data || []).filter((project) => project.deleted !== true)
}

function toTime(value) {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  if (value.$date && value.$date.$numberLong) return Number(value.$date.$numberLong)
  if (value.$numberLong) return Number(value.$numberLong)
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function isCompletedProject(project) {
  if (COMPLETED_PROJECT_CODES.indexOf(project.statusCode || '') !== -1) return true
  if (COMPLETED_PROJECT_STATUS.indexOf(project.status || '') !== -1) return true
  return Number(project.progress || 0) >= 100
}

function isActiveProject(project) {
  if (isCompletedProject(project)) return false
  return ['cancelled', 'paused'].indexOf(project.statusCode || '') === -1 && project.status !== '已取消'
}

function makeProjectSummary(projects) {
  const latestProject = projects
    .slice()
    .sort((a, b) => toTime(b.updatedAt || b.createdAt) - toTime(a.updatedAt || a.createdAt))[0]
  return {
    projectCount: projects.length,
    activeProjectCount: projects.filter(isActiveProject).length,
    completedProjectCount: projects.filter(isCompletedProject).length,
    latestStage: latestProject ? (latestProject.currentStage || latestProject.stage || latestProject.status || null) : null
  }
}

function chunk(items, size) {
  const chunks = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

async function countByProjectIds(collectionName, tenantId, projectIds, extraWhere = {}) {
  if (!projectIds.length) return 0
  let total = 0
  const batches = chunk(projectIds, 20)
  for (let index = 0; index < batches.length; index += 1) {
    const res = await db.collection(collectionName)
      .where(Object.assign({
        tenantId,
        projectId: _.in(batches[index])
      }, extraWhere))
      .count()
    total += res.total || 0
  }
  return total
}

async function listByProjectIds(collectionName, tenantId, projectIds, extraWhere = {}, fields = {}) {
  if (!projectIds.length) return []
  const items = []
  const batches = chunk(projectIds, 20)
  for (let index = 0; index < batches.length; index += 1) {
    let query = db.collection(collectionName)
      .where(Object.assign({
        tenantId,
        projectId: _.in(batches[index])
      }, extraWhere))
    if (fields && Object.keys(fields).length) query = query.field(fields)
    const res = await query.limit(1000).get()
    items.push(...(res.data || []))
  }
  return items
}

async function countByStageIds(collectionName, tenantId, stageIds, extraWhere = {}) {
  if (!stageIds.length) return 0
  let total = 0
  const batches = chunk(stageIds, 20)
  for (let index = 0; index < batches.length; index += 1) {
    const res = await db.collection(collectionName)
      .where(Object.assign({
        tenantId,
        stageLogId: _.in(batches[index])
      }, extraWhere))
      .count()
    total += res.total || 0
  }
  return total
}

function normalizeStage(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  return text.slice(0, 40)
}

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)))
}

function collectStageCoverage(stageLogs) {
  return unique(stageLogs.map((item) => normalizeStage(item.stage || item.stageName || item.currentStage))).slice(0, 20)
}

function getConfidenceLevel(score) {
  if (score <= 0) return 'none'
  if (score < 35) return 'low'
  if (score < 70) return 'medium'
  return 'high'
}

function makeAvailableProofTypes(summary, authorizationSummary) {
  const types = []
  if (summary.approvedStageCount > 0) types.push('approved_stage_log')
  if (summary.ownerVisiblePhotoCount > 0) types.push('owner_visible_photo')
  if (summary.renderDrawingCount > 0) types.push('render_drawing')
  if (summary.warrantyCardCount > 0) types.push('warranty_card')
  if (summary.afterSalesClosedCount > 0) types.push('after_sales_closed')
  if (authorizationSummary.hasApprovedCase) types.push('case_authorization')
  return types
}

function makeCompletenessScore(summary, authorizationSummary) {
  let score = 0
  if (summary.approvedStageCount > 0) score += 25
  if (summary.ownerVisiblePhotoCount > 0) score += 20
  if (summary.renderDrawingCount > 0) score += 15
  if (summary.warrantyCardCount > 0) score += 15
  if (summary.afterSalesClosedCount > 0) score += 10
  if (authorizationSummary.canUseForMarketing) score += 15
  return Math.min(score, 100)
}

function flatten(values) {
  return (values || []).reduce((result, item) => {
    if (Array.isArray(item)) return result.concat(item)
    if (item) result.push(item)
    return result
  }, [])
}

function isApprovedAuthorization(item) {
  if (!item) return false
  if (item.status !== 'approved') return false
  if (item.authorizationScope === 'private') return false
  if (item.revokedAt) return false
  return true
}

function isMarketingAuthorization(item) {
  return isApprovedAuthorization(item) && item.authorizationScope === 'public'
}

function makeAuthorizationSummary(authorizations) {
  const approvedItems = (authorizations || []).filter(isApprovedAuthorization)
  const marketingItems = approvedItems.filter(isMarketingAuthorization)
  const allowedPlatforms = unique(flatten(marketingItems.map((item) => item.allowedPlatforms || []))).slice(0, 10)
  const allowedMaterials = unique(flatten(approvedItems.map((item) => item.allowedMaterials || []))).slice(0, 20)
  const hasApprovedCase = approvedItems.length > 0
  const canUseForMarketing = marketingItems.length > 0
  const blockedReasons = []
  if (!hasApprovedCase) blockedReasons.push('NO_AUTHORIZATION')
  else if (!canUseForMarketing) blockedReasons.push('AUTHORIZATION_NOT_PUBLIC')

  return {
    hasApprovedCase,
    canUseForMarketing,
    allowedPlatforms,
    allowedMaterials,
    blockedReasons
  }
}

async function makeEvidenceSummary(tenantId, projectIds, authorizationSummary) {
  const approvedStageWhere = {
    reviewStatus: 'approved',
    ownerVisible: true
  }
  const stageLogs = await listByProjectIds('stage_logs', tenantId, projectIds, approvedStageWhere, {
    _id: true,
    projectId: true,
    stage: true,
    stageName: true,
    currentStage: true
  })
  const stageLogIds = stageLogs.map((item) => item._id).filter(Boolean)
  const ownerVisiblePhotoCount = await countByStageIds('photos', tenantId, stageLogIds, { ownerVisible: true })
  const renderDrawingCount = await countByProjectIds('design_drawings', tenantId, projectIds, {
    type: 'render',
    ownerVisible: true
  })
  const warrantyCardCount = await countByProjectIds('warranty_cards', tenantId, projectIds)
  const afterSalesTicketCount = await countByProjectIds('after_sales_tickets', tenantId, projectIds)
  const afterSalesClosedCount = await countByProjectIds('after_sales_tickets', tenantId, projectIds, {
    status: _.in(CLOSED_TICKET_STATUS)
  })

  const summary = {
    approvedStageCount: stageLogs.length,
    ownerVisiblePhotoCount,
    renderDrawingCount,
    warrantyCardCount,
    afterSalesTicketCount,
    afterSalesClosedCount,
    stageCoverage: collectStageCoverage(stageLogs),
    availableProofTypes: [],
    dataConfidenceLevel: 'none',
    evidenceCompletenessScore: 0
  }
  summary.availableProofTypes = makeAvailableProofTypes(summary, authorizationSummary)
  summary.evidenceCompletenessScore = makeCompletenessScore(summary, authorizationSummary)
  summary.dataConfidenceLevel = getConfidenceLevel(summary.evidenceCompletenessScore)
  return summary
}

function makeRecommendedUse(evidenceSummary, authorizationSummary) {
  const internalTrustMaterials = []
  if (evidenceSummary.approvedStageCount > 0) internalTrustMaterials.push('approved_stage_summary')
  if (evidenceSummary.ownerVisiblePhotoCount > 0) internalTrustMaterials.push('visible_photo_count_summary')
  if (evidenceSummary.renderDrawingCount > 0) internalTrustMaterials.push('render_drawing_count_summary')
  if (evidenceSummary.warrantyCardCount > 0) internalTrustMaterials.push('warranty_count_summary')
  if (evidenceSummary.afterSalesClosedCount > 0) internalTrustMaterials.push('after_sales_closed_summary')

  const publicCaseAssets = authorizationSummary.canUseForMarketing
    ? (authorizationSummary.allowedMaterials.length ? authorizationSummary.allowedMaterials : ['public_case_summary'])
    : []

  const blockedReasons = authorizationSummary.blockedReasons.slice()
  if (!internalTrustMaterials.length) blockedReasons.push('NO_EVIDENCE')

  return {
    internalTrustMaterials,
    publicCaseAssets,
    blockedReasons: unique(blockedReasons)
  }
}

async function getAuthorizations(tenantId, projectIds) {
  return listByProjectIds('case_authorizations', tenantId, projectIds, {}, {
    _id: true,
    projectId: true,
    status: true,
    authorizationScope: true,
    allowedPlatforms: true,
    allowedMaterials: true,
    revokedAt: true
  })
}

exports.main = async (event = {}) => {
  const eventIds = {
    customerId: toId(event.customerId),
    projectId: toId(event.projectId)
  }

  try {
    if (!eventIds.customerId) throw createError('INVALID_PARAM')

    const user = await getCurrentUser()
    assertUser(user)
    const tenantId = user.tenantId || DEFAULT_TENANT_ID

    const customer = await getCustomerForAccess(eventIds.customerId)
    assertCustomer(customer, tenantId)

    const projects = await listProjects(tenantId, eventIds.customerId, eventIds.projectId)
    if (!projects.length) throw createError('NO_PROJECT')

    const projectIds = projects.map((project) => project._id).filter(Boolean)
    const projectSummary = makeProjectSummary(projects)
    const authorizations = await getAuthorizations(tenantId, projectIds)
    const authorizationSummary = makeAuthorizationSummary(authorizations)
    const evidenceSummary = await makeEvidenceSummary(tenantId, projectIds, authorizationSummary)
    const recommendedUse = makeRecommendedUse(evidenceSummary, authorizationSummary)

    if (!recommendedUse.internalTrustMaterials.length && !authorizationSummary.hasApprovedCase) {
      return makeError('NO_EVIDENCE', eventIds, {
        projectSummary,
        evidenceSummary,
        authorizationSummary,
        recommendedUse
      })
    }

    return makeSuccess(eventIds, {
      projectSummary,
      evidenceSummary,
      authorizationSummary,
      recommendedUse
    })
  } catch (error) {
    const code = getErrorCode(error)
    return makeError(code, eventIds)
  }
}
