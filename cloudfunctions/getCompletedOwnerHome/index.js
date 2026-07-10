const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'

function tenantMatches(resourceTenantId, tenantId) {
  return resourceTenantId ? resourceTenantId === tenantId : tenantId === DEFAULT_TENANT_ID
}
const COMPLETED_STATUS_CODES = ['completed', 'delivered']
const COMPLETED_STATUS = ['已完工', '完工', '已竣工', '竣工验收', '已交付']

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

function isCompleted(project) {
  return COMPLETED_STATUS_CODES.indexOf(project.statusCode || '') !== -1 ||
    COMPLETED_STATUS.indexOf(project.status || '') !== -1 ||
    Number(project.progress || 0) >= 100
}

async function assertOwnerProject(openid, tenantId, projectId) {
  let project = null
  if (projectId) {
    const res = await db.collection('projects').doc(projectId).get()
    project = res.data || null
  } else {
    const res = await db.collection('projects')
      .where({ ownerOpenids: openid, tenantId: tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId })
      .orderBy('updatedAt', 'desc')
      .limit(20)
      .get()
    project = (res.data || []).filter(isCompleted)[0] || null
    if (!project) {
      const legacy = await db.collection('projects')
        .where({ ownerOpenid: openid, tenantId: tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId })
        .orderBy('updatedAt', 'desc')
        .limit(20)
        .get()
      project = (legacy.data || []).filter(isCompleted)[0] || null
    }
  }
  if (!project) throw new Error('未找到已完工工地')
  if (!tenantMatches(project.tenantId, tenantId)) throw new Error('当前账号无权查看该工地')
  const ownerOpenids = Array.isArray(project.ownerOpenids) ? project.ownerOpenids : []
  if (project.ownerOpenid !== openid && ownerOpenids.indexOf(openid) === -1) {
    throw new Error('当前账号无权查看该工地')
  }
  return project
}

async function getProjectRecord(collection, tenantId, projectId, openid, ownerId) {
  const res = await db.collection(collection)
    .where({ tenantId: tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId, projectId })
    .orderBy('updatedAt', 'desc')
    .limit(20)
    .get()
  return (res.data || []).find((item) => {
    if (!item.ownerOpenid && !item.ownerId) return true
    return item.ownerOpenid === openid || item.ownerId === ownerId
  }) || null
}

async function getOne(collection, where) {
  const res = await db.collection(collection).where(where).limit(1).get()
  return (res.data && res.data.length) ? res.data[0] : null
}

async function getBenefits(tenantId, projectId, ownerId) {
  const res = await db.collection('customer_benefits')
    .where({ tenantId: tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId, status: 'active' })
    .orderBy('updatedAt', 'desc')
    .limit(20)
    .get()
  return (res.data || []).filter((item) => {
    const target = item.targetType || 'all'
    if (target === 'all' || target === 'completed_owner') return true
    if (target === 'project') return (item.projectIds || []).indexOf(projectId) !== -1
    if (target === 'owner') return (item.ownerIds || []).indexOf(ownerId) !== -1
    return false
  }).slice(0, 5)
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const project = await assertOwnerProject(openid, tenantId, String(event.projectId || '').trim())
    const ownerId = user._id || ''
    const ownerWhere = { tenantId: tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId, projectId: project._id, ownerOpenid: openid }

    const warrantyCard = await getProjectRecord('warranty_cards', tenantId, project._id, openid, ownerId)
    const authorization = await getOne('case_authorizations', ownerWhere)
    const latestTickets = await db.collection('after_sales_tickets')
      .where(ownerWhere)
      .orderBy('createdAt', 'desc')
      .limit(3)
      .get()
    const ticketCount = await db.collection('after_sales_tickets').where(ownerWhere).count()
    const openTicketCount = (latestTickets.data || []).filter((item) => ['submitted', 'accepted', 'processing'].indexOf(item.status) !== -1).length
    const benefits = await getBenefits(tenantId, project._id, ownerId)

    // 实时计算档案状态（不再依赖 owner_archives 空表）
    const [stageLogCount, drawingCount, photoCount] = await Promise.all([
      db.collection('stage_logs').where({ projectId: project._id, tenantId: tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId, reviewStatus: 'approved', ownerVisible: true }).count().then((r) => r.total || 0).catch(() => 0),
      db.collection('design_drawings').where({ projectId: project._id, tenantId: tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId, type: 'render', ownerVisible: true }).count().then((r) => r.total || 0).catch(() => 0),
      db.collection('photos').where({ projectId: project._id, tenantId: tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId, ownerVisible: true }).count().then((r) => r.total || 0).catch(() => 0)
    ])
    const hasHouseInfo = !!(project.community || project.communityName || project.address)
    const hasTeam = !!(project.foremanName || project.managerName || project.designerName)
    const hasStages = stageLogCount > 0
    const hasDrawings = drawingCount > 0
    const hasPhotos = photoCount > 0
    const hasWarranty = !!warrantyCard
    const sections = { houseInfo: hasHouseInfo, teamInfo: hasTeam, designFiles: hasDrawings, hydroFiles: hasStages, materialList: false, acceptanceRecords: hasStages, constructionPhotos: hasPhotos, completionPhotos: hasPhotos }
    const archivedCount = Object.values(sections).filter(Boolean).length
    const missingCount = Object.keys(sections).length - archivedCount
    let archiveStatus = 'pending'
    if (archivedCount > 0 && missingCount > 0) archiveStatus = 'organizing'
    else if (archivedCount === Object.keys(sections).length) archiveStatus = 'completed'
    const archive = { archivedCount, missingCount, archiveStatus, drawingCount, stageLogCount, photoCount }

    return {
      project,
      archive,
      warrantyCard,
      authorization,
      benefits,
      latestTickets: latestTickets.data || [],
      ticketStats: {
        total: ticketCount.total || 0,
        open: openTicketCount
      }
    }
  } catch (error) {
    return { error: { message: error.message || '获取完工服务首页失败' } }
  }
}
