/**
 * 品牌参考案例（本地直出版本）
 *
 * 设计目的：
 *   - 不依赖 listPublicCases 云函数部署即可展示案例
 *   - 图片为本地路径，打包进小程序，首次加载即显示
 *   - 云函数部署后，真实授权案例会与参考案例合并（真实在前）
 *
 * 与 cloudfunctions/listPublicCases/index.js 中的 REFERENCE_CASES 保持同步
 * （云函数那份用于"真实+参考合并返回"场景，本文件用于前端兜底直出）
 */

const DEFAULT_REGION = '交城本地'

const REFERENCE_CASES = [
  {
    _id: 'ref_wanshuo_yishi',
    projectId: '',
    isReference: true,
    isAuthorized: true,
    allowShowCommunity: true,
    communityName: '万硕花园',
    regionName: DEFAULT_REGION,
    area: 128,
    layout: '三室两厅',
    style: '意式轻奢',
    planType: '品质舒适型',
    designHighlights: ['无主灯设计', '质感墙面', '收纳优化'],
    coverImage: '/images/cases/case-1-cover.jpg',
    completionPhotos: ['/images/cases/case-1-cover.jpg', '/images/cases/case-1-2.jpg', '/images/cases/case-1-3.jpg'],
    photos: ['/images/cases/case-1-cover.jpg', '/images/cases/case-1-2.jpg', '/images/cases/case-1-3.jpg']
  },
  {
    _id: 'ref_wanshuo_meishi',
    projectId: '',
    isReference: true,
    isAuthorized: true,
    allowShowCommunity: true,
    communityName: '万硕花园',
    regionName: DEFAULT_REGION,
    area: 168,
    layout: '四卧改善型',
    style: '经典美式',
    planType: '轻奢改善型',
    designHighlights: ['品质定制', '沉稳质感', '实用收纳'],
    coverImage: '/images/cases/case-2-cover.jpg',
    completionPhotos: ['/images/cases/case-2-cover.jpg', '/images/cases/case-2-2.jpg', '/images/cases/case-2-3.jpg'],
    photos: ['/images/cases/case-2-cover.jpg', '/images/cases/case-2-2.jpg', '/images/cases/case-2-3.jpg']
  },
  {
    _id: 'ref_gongyuanli_yishi',
    projectId: '',
    isReference: true,
    isAuthorized: true,
    allowShowCommunity: true,
    communityName: '公园里',
    regionName: DEFAULT_REGION,
    area: 148,
    layout: '四室两厅',
    style: '意式轻奢',
    planType: '轻奢改善型',
    designHighlights: ['无主灯设计', '质感墙面', '收纳优化'],
    coverImage: '/images/cases/case-3-cover.jpg',
    completionPhotos: ['/images/cases/case-3-cover.jpg', '/images/cases/case-3-2.jpg', '/images/cases/case-3-3.jpg'],
    photos: ['/images/cases/case-3-cover.jpg', '/images/cases/case-3-2.jpg', '/images/cases/case-3-3.jpg']
  },
  {
    _id: 'ref_tiantai_fashi',
    projectId: '',
    isReference: true,
    isAuthorized: true,
    allowShowCommunity: true,
    communityName: '天泰',
    regionName: DEFAULT_REGION,
    area: 135,
    layout: '三室两厅',
    style: '法式中古风',
    planType: '品质舒适型',
    designHighlights: ['复古配色', '质感材质', '氛围营造'],
    coverImage: '/images/cases/case-4-cover.jpg',
    completionPhotos: ['/images/cases/case-4-cover.jpg', '/images/cases/case-4-2.jpg', '/images/cases/case-4-3.jpg'],
    photos: ['/images/cases/case-4-cover.jpg', '/images/cases/case-4-2.jpg', '/images/cases/case-4-3.jpg']
  },
  {
    _id: 'ref_xiandai',
    projectId: '',
    isReference: true,
    isAuthorized: true,
    allowShowCommunity: false,
    communityName: '',
    regionName: DEFAULT_REGION,
    area: 120,
    layout: '三室两厅',
    style: '现代简约',
    planType: '品质舒适型',
    designHighlights: ['简洁动线', '实用收纳', '明亮空间'],
    coverImage: '/images/cases/case-5-cover.jpg',
    completionPhotos: ['/images/cases/case-5-cover.jpg', '/images/cases/case-5-2.jpg', '/images/cases/case-5-3.jpg'],
    photos: ['/images/cases/case-5-cover.jpg', '/images/cases/case-5-2.jpg', '/images/cases/case-5-3.jpg']
  }
]

/**
 * 取所有参考案例（原始数据，未经 formatPublicCases 处理）
 */
function getReferenceCases() {
  return REFERENCE_CASES
}

/**
 * 按 _id 取单条参考案例
 */
function getReferenceCaseById(caseId) {
  return REFERENCE_CASES.find((c) => c._id === caseId) || null
}

/**
 * 判断 caseId 是否为本地参考案例
 */
function isReferenceCaseId(caseId) {
  return REFERENCE_CASES.some((c) => c._id === caseId)
}

module.exports = {
  REFERENCE_CASES,
  getReferenceCases,
  getReferenceCaseById,
  isReferenceCaseId
}
