const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'
const DEFAULT_REGION = '交城本地'

function tenantScope(tenantId) {
  return tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId
}

function authorizationTenantMatchesProject(authorization, project) {
  const projectTenantId = project.tenantId || DEFAULT_TENANT_ID
  return authorization.tenantId
    ? authorization.tenantId === projectTenantId
    : projectTenantId === DEFAULT_TENANT_ID
}

// 品牌参考案例（与 store-config.js 同步，业主未授权时兜底展示）
// 图片为本地路径，压缩后放在 miniprogram/images/cases/
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

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  const user = res.data[0] || null
  if (user && !user.tenantId) {
    user.tenantId = DEFAULT_TENANT_ID
    user.tenantName = DEFAULT_TENANT_NAME
  }
  return { openid: OPENID, user }
}

async function getTempUrlMap(fileIDs) {
  const unique = Array.from(new Set(fileIDs.filter(Boolean)))
  if (!unique.length) return {}
  try {
    const res = await cloud.getTempFileURL({ fileList: unique })
    return (res.fileList || []).reduce((map, item) => {
      if (item.tempFileURL) map[item.fileID] = item.tempFileURL
      return map
    }, {})
  } catch (e) {
    return {}
  }
}

// 查询所有授权公开的 case_authorizations
async function getPublicAuthorizations(tenantId) {
  const res = await db.collection('case_authorizations')
    .where({
      tenantId: tenantScope(tenantId),
      authorizationScope: 'public',
      status: 'approved'
    })
    .orderBy('updatedAt', 'desc')
    .limit(50)
    .get()
  return res.data || []
}

// 根据 projectId 批量取 projects（仅 delivered 状态）
async function getDeliveredProjects(projectIds, tenantId) {
  if (!projectIds.length) return []
  const res = await db.collection('projects')
    .where({
      _id: _.in(projectIds),
      tenantId: tenantScope(tenantId),
      statusCode: _.in(['delivered', 'completed'])
    })
    .limit(50)
    .get()
  return res.data || []
}

// 从竣工验收 stage_logs 取照片
async function getCompletionPhotosFromStageLogs(projectId, tenantId) {
  try {
    const logsRes = await db.collection('stage_logs')
      .where({
        projectId,
        tenantId: tenantScope(tenantId),
        reviewStatus: 'approved',
        ownerVisible: true,
        stage: _.in(['竣工验收', '竣工交付', '完工'])
      })
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get()
    const logs = logsRes.data || []
    if (!logs.length) return []

    const logIds = logs.map((log) => log._id)
    const photosRes = await db.collection('photos')
      .where({
        stageLogId: _.in(logIds),
        tenantId: tenantScope(tenantId),
        ownerVisible: true
      })
      .limit(20)
      .get()
    const photoRecords = photosRes.data || []

    const inlineFileIDs = []
    logs.forEach((log) => {
      (log.photoFileIDs || []).forEach((id) => inlineFileIDs.push(id))
    })
    const recordFileIDs = photoRecords.map((p) => p.fileID || p.fileId || p.cloudFileId).filter(Boolean)
    return [...inlineFileIDs, ...recordFileIDs]
  } catch (e) {
    return []
  }
}

// 把 projects + authorizations 聚合成 caseItem
async function buildPublicCases(authorizations, projects, tenantId) {
  const projectMap = {}
  projects.forEach((p) => { projectMap[p._id] = p })

  const allCompletionFileIDs = []
  projects.forEach((p) => {
    if (Array.isArray(p.completionPhotoFileIDs)) {
      p.completionPhotoFileIDs.forEach((id) => allCompletionFileIDs.push(id))
    }
  })

  // 也查 stage_logs 补照片
  const stagePhotoResults = await Promise.all(
    projects.map((p) => getCompletionPhotosFromStageLogs(p._id, tenantId))
  )
  projects.forEach((p, idx) => {
    (stagePhotoResults[idx] || []).forEach((id) => allCompletionFileIDs.push(id))
  })

  const tempUrlMap = await getTempUrlMap(allCompletionFileIDs)

  const cases = []
  authorizations.forEach((auth) => {
    const project = projectMap[auth.projectId]
    if (!project || !authorizationTenantMatchesProject(auth, project)) return

    const allowedMaterials = Array.isArray(auth.allowedMaterials) ? auth.allowedMaterials : []
    const allowShowCommunity = allowedMaterials.indexOf('house_info') !== -1
    const allowShowBudget = allowedMaterials.indexOf('budget') !== -1
    const allowCompletionPhotos = allowedMaterials.indexOf('completion_photos') !== -1
    const allowProcessPhotos = allowedMaterials.indexOf('process_photos') !== -1

    // 完工照片 URL 列表
    const completionPhotos = []
    if (allowCompletionPhotos && Array.isArray(project.completionPhotoFileIDs) && project.completionPhotoFileIDs.length) {
      project.completionPhotoFileIDs.forEach((id) => {
        const url = tempUrlMap[id] || ''
        if (url) completionPhotos.push(url)
      })
    }
    // stage_logs 补充
    const stagePhotos = allowProcessPhotos ? (stagePhotoResults[projects.indexOf(project)] || []) : []
    stagePhotos.forEach((id) => {
      const url = tempUrlMap[id] || ''
      if (url && completionPhotos.indexOf(url) === -1) completionPhotos.push(url)
    })

    cases.push({
      _id: auth._id,
      projectId: project._id,
      isReference: false,
      isAuthorized: true,
      allowShowCommunity,
      allowShowBudgetRange: allowShowBudget,
      communityName: allowShowCommunity ? (project.community || project.communityName || '') : '',
      regionName: DEFAULT_REGION,
      area: allowShowCommunity ? (project.area || '') : '',
      layout: allowShowCommunity ? (project.layout || '') : '',
      houseType: allowShowCommunity ? (project.layout || '') : '',
      style: allowShowCommunity ? (project.style || '') : '',
      planType: project.planType || '',
      exactPrice: allowShowBudget ? (project.exactPrice || project.contractAmount || '') : '',
      budgetRange: allowShowBudget ? (project.budgetRange || '') : '',
      designHighlights: project.designHighlights || [],
      coverImage: completionPhotos[0] || '',
      completionPhotos: completionPhotos.slice(0, 9),
      photos: completionPhotos,
      deliveredAt: project.deliveredAt || ''
    })
  })

  return cases
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    // 公开案例页允许游客浏览（未登录用户只看品牌参考案例）
    const tenantId = (user && user.tenantId) || DEFAULT_TENANT_ID

    const action = event.action || 'list'
    const projectId = String(event.projectId || '').trim()
    const caseId = String(event.caseId || '').trim()

    // 详情：根据 caseId 取单条
    if (action === 'detail') {
      // 先判断是否为品牌参考案例
      const refCase = REFERENCE_CASES.find((c) => c._id === caseId)
      if (refCase) {
        return { case: refCase }
      }

      // 真实案例：通过 caseId 取 authorization + project
      const authRes = await db.collection('case_authorizations').doc(caseId).get().catch(() => ({ data: null }))
      const auth = authRes.data
      if (!auth || auth.authorizationScope !== 'public' || auth.status !== 'approved') {
        return { error: { message: '案例不存在或未公开' } }
      }
      const projectRes = await db.collection('projects').doc(auth.projectId).get().catch(() => ({ data: null }))
      const project = projectRes.data
      if (!project) return { error: { message: '案例数据不存在' } }

      if (!authorizationTenantMatchesProject(auth, project)) {
        return { error: { message: '案例数据不存在' } }
      }
      const publicTenantId = project.tenantId || DEFAULT_TENANT_ID
      const cases = await buildPublicCases([auth], [project], publicTenantId)
      if (!cases.length) return { error: { message: '案例数据不存在' } }
      return { case: cases[0] }
    }

    // 列表：先查真实授权案例
    const authorizations = await getPublicAuthorizations(tenantId)
    const projectIds = authorizations.map((a) => a.projectId).filter(Boolean)
    const projects = await getDeliveredProjects(projectIds, tenantId)

    const realCases = await buildPublicCases(authorizations, projects, tenantId)

    // 真实案例为空时降级到品牌参考案例
    if (realCases.length === 0) {
      return {
        cases: REFERENCE_CASES,
        source: 'reference',
        realCount: 0
      }
    }

    // 真实案例 + 参考案例合并（真实在前）
    return {
      cases: realCases,
      source: 'real',
      realCount: realCases.length
    }
  } catch (error) {
    return { error: { message: error.message || '获取案例失败' } }
  }
}
