const ERROR_COPY = {
  UNAUTHENTICATED: '请先登录后再查看证据摘要。',
  FORBIDDEN: '当前账号暂无查看证据摘要权限。',
  NOT_FOUND: '未找到可用工地证据，请返回客户列表重新打开。',
  NO_EVIDENCE: '暂无可用证据摘要，可继续使用示例素材。',
  NO_MARKETING_AUTHORIZATION: '可内部参考，暂不可公开发布。',
  READ_FAILED: '证据摘要读取失败，请稍后重试。'
}

const CONFIDENCE_LABELS = {
  none: '暂无',
  low: '低',
  medium: '中',
  high: '高'
}

const PROOF_TYPE_LABELS = {
  approved_stage_log: '已审核日报',
  owner_visible_photo: '可见照片',
  render_drawing: '效果图',
  warranty_card: '质保卡',
  after_sales_closed: '已关闭售后',
  case_authorization: '案例授权'
}

const PLATFORM_LABELS = {
  internal: '内部',
  xiaohongshu: '小红书',
  douyin: '抖音',
  website: '官网',
  geo: 'GEO'
}

function toNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function toArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function mapLabels(values, dictionary) {
  return toArray(values).map((item) => dictionary[item]).filter(Boolean)
}

function joinText(values, fallback) {
  const list = toArray(values)
  return list.length ? list.join('、') : fallback
}

function buildEmptyEvidenceView(overrides = {}) {
  return Object.assign({
    code: '',
    hasSummary: false,
    statusLabel: '未读取真实证据摘要',
    statusClass: 'mock',
    statusHint: '提供真实客户 ID 后读取只读证据摘要。',
    authLabel: '仅内部参考',
    authClass: 'internal',
    metrics: [],
    stageCoverageText: '暂无阶段覆盖',
    proofTypesText: '暂无证据类型',
    platformText: '暂不可公开发布',
    blockedReasonText: '',
    safetyItems: [
      '仅摘要统计',
      '不含原始素材',
      '不含个人信息',
      '不含施工图',
      '不含详细记录'
    ]
  }, overrides)
}

function buildMetrics(projectSummary, evidenceSummary) {
  return [
    {
      label: '项目数量',
      value: `${toNumber(projectSummary.projectCount)}个`
    },
    {
      label: '已审核可见日报',
      value: `${toNumber(evidenceSummary.approvedStageCount)}条`
    },
    {
      label: '可见照片',
      value: `${toNumber(evidenceSummary.ownerVisiblePhotoCount)}张`
    },
    {
      label: '效果图',
      value: `${toNumber(evidenceSummary.renderDrawingCount)}张`
    },
    {
      label: '质保卡',
      value: `${toNumber(evidenceSummary.warrantyCardCount)}张`
    },
    {
      label: '证据等级',
      value: CONFIDENCE_LABELS[evidenceSummary.dataConfidenceLevel] || '暂无'
    }
  ]
}

function buildEvidenceSummaryView(result) {
  const source = result || {}
  const code = source.code || 'READ_FAILED'
  const projectSummary = source.projectSummary || {}
  const evidenceSummary = source.evidenceSummary || {}
  const authorizationSummary = source.authorizationSummary || {}
  const hasSummary = source.ok === true
  const canUseForMarketing = authorizationSummary.canUseForMarketing === true && code === 'OK'
  const noMarketingAuthorization = code === 'NO_MARKETING_AUTHORIZATION'

  if (!hasSummary) {
    const isNoEvidence = code === 'NO_EVIDENCE'
    const isReadFailed = code === 'READ_FAILED'
    return buildEmptyEvidenceView({
      code,
      statusLabel: isNoEvidence ? '暂无真实证据摘要' : '真实证据摘要不可用',
      statusClass: isNoEvidence ? 'empty' : (isReadFailed ? 'error' : 'warning'),
      statusHint: ERROR_COPY[code] || ERROR_COPY.READ_FAILED,
      authLabel: '仅内部参考',
      authClass: 'internal',
      blockedReasonText: ERROR_COPY[code] || ERROR_COPY.READ_FAILED
    })
  }

  const proofTypeLabels = mapLabels(evidenceSummary.availableProofTypes, PROOF_TYPE_LABELS)
  const platformLabels = canUseForMarketing
    ? mapLabels(authorizationSummary.allowedPlatforms, PLATFORM_LABELS)
    : []
  const blockedReasonText = noMarketingAuthorization
    ? ERROR_COPY.NO_MARKETING_AUTHORIZATION
    : ''

  return buildEmptyEvidenceView({
    code,
    hasSummary: true,
    statusLabel: '真实证据摘要',
    statusClass: 'real',
    statusHint: '仅统计已审核、业主可见、已脱敏的工地证据。',
    authLabel: canUseForMarketing ? '可公开使用' : '仅内部参考，暂不可公开发布',
    authClass: canUseForMarketing ? 'public' : 'internal',
    metrics: buildMetrics(projectSummary, evidenceSummary),
    stageCoverageText: joinText(evidenceSummary.stageCoverage, '暂无阶段覆盖'),
    proofTypesText: joinText(proofTypeLabels, '暂无证据类型'),
    platformText: canUseForMarketing ? joinText(platformLabels, '已授权公开使用') : '暂不可公开发布',
    blockedReasonText
  })
}

module.exports = {
  ERROR_COPY,
  buildEmptyEvidenceView,
  buildEvidenceSummaryView
}
