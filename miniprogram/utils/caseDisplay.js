/**
 * 公开完工案例展示模板 + 自动脱敏规则
 *
 * 用法：前端展示前统一调用 formatPublicCase(caseItem)
 * 页面只读 format 后的字段，原始数据保持不变
 *
 * 永远不展示：楼栋/单元/门牌号/业主姓名/电话/精确合同金额/内部备注/合同内容
 */

const DEFAULT_REGION = '交城本地'

const STYLE_HIGHLIGHTS = {
  '意式轻奢': '无主灯设计 + 质感墙面 + 收纳优化',
  '现代简约': '简洁动线 + 实用收纳 + 明亮空间',
  '新中式': '东方韵味 + 木色质感 + 稳重大气',
  '奶油风': '柔和配色 + 温馨氛围 + 轻盈软装',
  '旧房改造': '空间优化 + 动线调整 + 收纳升级',
  '经典美式': '品质定制 + 沉稳质感 + 实用收纳',
  '北欧': '原木质感 + 简约配色 + 实用主义',
  '日式': '原木质感 + 收纳充足 + 简洁动线',
  '轻奢': '质感材料 + 灯光层次 + 收纳优化',
  '工业风': '原始质感 + 开放动线 + 个性表达',
  '混搭': '多元融合 + 实用为主 + 个性表达'
}

const DEFAULT_HIGHLIGHTS = '空间优化 + 实用收纳 + 细节升级'

/**
 * 根据 exactPrice 推断 planType
 */
function inferPlanType(exactPrice) {
  const price = Number(exactPrice)
  if (!price || Number.isNaN(price)) return '品质舒适型'
  if (price < 80000) return '经济实用型'
  if (price < 150000) return '品质舒适型'
  if (price < 300000) return '轻奢改善型'
  return '高配定制型'
}

/**
 * 主格式化方法
 * @param {Object} caseItem 原始案例数据
 *   isAuthorized / allowShowCommunity / communityName / regionName
 *   area / layout (houseType) / style / planType / exactPrice
 *   allowShowBudgetRange / budgetRange / designHighlights / coverImage
 *   completionPhotos / photos
 * @returns {Object} 公开展示用字段
 */
function formatPublicCase(caseItem) {
  const item = caseItem || {}

  // 未授权案例不展示
  if (item.isAuthorized !== true) {
    return { canShow: false }
  }

  const allowShowCommunity = item.allowShowCommunity === true
  const communityName = String(item.communityName || '').trim()
  const regionName = String(item.regionName || DEFAULT_REGION).trim()

  // 1. 标题
  let displayTitle
  if (allowShowCommunity && communityName) {
    displayTitle = `${communityName}同小区案例`
  } else if (regionName) {
    // 避免 regionName 已含"本地"时重复（如 "交城本地" + "本地完工案例"）
    const suffix = regionName.indexOf('本地') !== -1 ? '完工案例' : '本地完工案例'
    displayTitle = `${regionName}${suffix}`
  } else {
    displayTitle = '本地真实完工案例'
  }

  // 2. 副标题：area + houseType + style
  const area = item.area ? Number(item.area) : ''
  const houseType = String(item.layout || item.houseType || '').trim()
  const style = String(item.style || '').trim()

  const subtitleParts = []
  if (area) subtitleParts.push(`${area}㎡`)
  if (houseType) subtitleParts.push(houseType)
  if (style) subtitleParts.push(style)
  // 至少有风格，没风格就显示"风格案例"
  if (!subtitleParts.length) subtitleParts.push('风格案例')
  else if (!style) subtitleParts.push('案例')
  const displaySubtitle = subtitleParts.join(' · ')

  // 3. 方案类型
  const displayPlanType = String(item.planType || '').trim() || inferPlanType(item.exactPrice)

  // 4. 预算区间（默认不展示）
  let displayBudgetText = ''
  if (item.allowShowBudgetRange === true && item.budgetRange) {
    displayBudgetText = `参考预算：${item.budgetRange}\n实际费用以户型、材料和现场情况为准。`
  }

  // 5. 设计亮点
  let displayHighlights = ''
  if (Array.isArray(item.designHighlights) && item.designHighlights.length) {
    displayHighlights = item.designHighlights.slice(0, 3).join(' + ')
  } else if (style && STYLE_HIGHLIGHTS[style]) {
    displayHighlights = STYLE_HIGHLIGHTS[style]
  } else {
    displayHighlights = DEFAULT_HIGHLIGHTS
  }

  // 6. 标签
  const displayTags = [style].filter(Boolean)

  // 7. 位置（脱敏：只到区域级别，永不显示具体门牌）
  const displayLocation = regionName ? `${regionName}本地` : ''

  // 8. 授权标签
  let authorizationLabel = ''
  if (item.isAuthorized === true) {
    if (allowShowCommunity || item.allowShowBudgetRange) {
      authorizationLabel = '真实完工 · 业主授权展示'
    } else {
      authorizationLabel = '真实完工 · 隐私保护展示'
    }
  }

  // 9. 封面图
  let coverImage = ''
  if (item.coverImage) {
    coverImage = item.coverImage
  } else if (Array.isArray(item.completionPhotos) && item.completionPhotos.length) {
    coverImage = item.completionPhotos[0]
  } else if (Array.isArray(item.photos) && item.photos.length) {
    coverImage = item.photos[0]
  }

  // 10. 照片集
  let photos = []
  if (Array.isArray(item.completionPhotos) && item.completionPhotos.length) {
    photos = item.completionPhotos.slice(0, 9)
  } else if (Array.isArray(item.photos) && item.photos.length) {
    photos = item.photos.slice(0, 9)
  }

  // 11. 适合人群（基于 planType 推断）
  const audienceMap = {
    '经济实用型': '首次置业 · 预算敏感型业主',
    '品质舒适型': '改善居住 · 注重性价比的业主',
    '轻奢改善型': '改善型置业 · 追求品质感的业主',
    '高配定制型': '品质定制 · 追求个性与高端体验的业主'
  }
  const displayAudience = audienceMap[displayPlanType] || '注重生活品质的业主'

  return {
    canShow: true,
    displayTitle,
    displaySubtitle,
    displayPlanType,
    displayHighlights,
    displayTags,
    displayLocation,
    displayBudgetText,
    displayAudience,
    authorizationLabel,
    coverImage,
    photos,
    // 原始 id 用于跳详情页
    _id: item._id || '',
    projectId: item.projectId || '',
    // 标记是否为参考案例
    isReference: item.isReference === true
  }
}

/**
 * 批量格式化
 * @param {Array} cases
 * @returns {Array} 只返回 canShow=true 的格式化结果
 */
function formatPublicCases(cases) {
  if (!Array.isArray(cases)) return []
  return cases
    .map(formatPublicCase)
    .filter((item) => item.canShow === true)
}

module.exports = {
  formatPublicCase,
  formatPublicCases,
  inferPlanType,
  STYLE_HIGHLIGHTS,
  DEFAULT_HIGHLIGHTS,
  DEFAULT_REGION
}
