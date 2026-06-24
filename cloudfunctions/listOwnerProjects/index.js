const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'

const PROJECT_STATUS_LABELS = {
  pending_start: '待开工',
  in_progress: '施工中',
  completed: '已完工',
  delivered: '已交付',
  after_sales: '售后中',
  paused: '暂停中',
  cancelled: '已取消'
}

const PROJECT_STATUS_BY_TEXT = {
  '待开工': 'pending_start',
  '施工中': 'in_progress',
  '已完工': 'completed',
  '完工': 'completed',
  '已竣工': 'completed',
  '竣工验收': 'completed',
  '已交付': 'delivered',
  '售后中': 'after_sales',
  '暂停中': 'paused',
  '已取消': 'cancelled'
}

const ACTIVE_TICKET_STATUS = [
  'pending',
  'submitted',
  'accepted',
  'assigned',
  'processing',
  'waiting_owner_confirm'
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

function tenantWhere(tenantId, extra = {}) {
  return Object.assign({}, extra, {
    tenantId: _.in([tenantId || DEFAULT_TENANT_ID, '', null])
  })
}

function getProjectStatusCode(project) {
  const statusCode = String((project && project.statusCode) || '').trim()
  if (PROJECT_STATUS_LABELS[statusCode]) return statusCode

  const status = String((project && project.status) || '').trim()
  if (PROJECT_STATUS_BY_TEXT[status]) return PROJECT_STATUS_BY_TEXT[status]

  return 'in_progress'
}

function getProjectStatusLabel(project) {
  const code = getProjectStatusCode(project)
  return PROJECT_STATUS_LABELS[code] || String((project && project.status) || '') || '施工中'
}

function getInitialGroupKey(statusCode) {
  if (statusCode === 'in_progress') return 'inProgress'
  if (statusCode === 'after_sales') return 'afterSales'
  if (statusCode === 'completed' || statusCode === 'delivered') return 'delivered'
  return 'others'
}

function isActiveTicket(ticket) {
  return ACTIVE_TICKET_STATUS.indexOf(String((ticket && ticket.status) || '').trim()) !== -1
}

function toTime(value) {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  if (value.$date && value.$date.$numberLong) return Number(value.$date.$numberLong)
  if (value.$numberLong) return Number(value.$numberLong)
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function chunk(items, size) {
  const chunks = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

async function safeGetCollectionByProjectIds(collectionName, tenantId, projectIds) {
  if (!projectIds.length) return []
  const results = []
  const idChunks = chunk(projectIds, 20)

  for (const ids of idChunks) {
    try {
      const res = await db.collection(collectionName)
        .where(tenantWhere(tenantId, { projectId: _.in(ids) }))
        .orderBy('updatedAt', 'desc')
        .limit(100)
        .get()
      results.push(...(res.data || []))
    } catch (error) {
      return results
    }
  }

  return results
}

function isOwnerProject(project, openid, userId) {
  if (!project) return false
  const ownerOpenids = Array.isArray(project.ownerOpenids) ? project.ownerOpenids : []
  const ownerUserIds = Array.isArray(project.ownerUserIds) ? project.ownerUserIds : []
  return project.ownerOpenid === openid ||
    ownerOpenids.indexOf(openid) !== -1 ||
    (userId && project.ownerUserId === userId) ||
    (userId && ownerUserIds.indexOf(userId) !== -1)
}

async function queryOwnerProjects(openid, user, tenantId) {
  const userId = String((user && user._id) || '').trim()
  const queries = [
    { ownerOpenid: openid },
    { ownerOpenids: typeof _.all === 'function' ? _.all([openid]) : openid }
  ]
  if (userId) {
    queries.push({ ownerUserId: userId })
    queries.push({ ownerUserIds: typeof _.all === 'function' ? _.all([userId]) : userId })
  }

  const projectMap = {}
  const mergeProjects = (items) => {
    ;(items || []).forEach((project) => {
      if (project && project._id && isOwnerProject(project, openid, userId)) {
        projectMap[project._id] = project
      }
    })
  }

  for (const query of queries) {
    try {
      const res = await db.collection('projects')
        .where(tenantWhere(tenantId, query))
        .orderBy('updatedAt', 'desc')
        .limit(100)
        .get()
      mergeProjects(res.data)
    } catch (error) {
      // 数组字段查询在旧数据上失败时，继续走下方兜底过滤。
    }
  }

  try {
    const fallbackRes = await db.collection('projects')
      .where(tenantWhere(tenantId))
      .orderBy('updatedAt', 'desc')
      .limit(200)
      .get()
    mergeProjects(fallbackRes.data)
  } catch (error) {
    // 兜底失败不影响前面已经命中的项目。
  }

  return Object.keys(projectMap)
    .map((id) => projectMap[id])
    .sort((a, b) => toTime(b.updatedAt || b.createdAt) - toTime(a.updatedAt || a.createdAt))
    .slice(0, 100)
}

function buildWarrantyMap(cards, openid, userId) {
  const map = {}
  ;(cards || []).forEach((card) => {
    if (!card || !card.projectId) return
    const hasOwnerLimit = !!(card.ownerOpenid || card.ownerId || card.ownerUserId)
    const ownerMatched = card.ownerOpenid === openid || card.ownerId === userId || card.ownerUserId === userId
    if (hasOwnerLimit && !ownerMatched) return

    const existing = map[card.projectId]
    if (!existing || toTime(card.updatedAt || card.createdAt) > toTime(existing.updatedAt || existing.createdAt)) {
      map[card.projectId] = card
    }
  })
  return map
}

function buildTicketMap(tickets) {
  const map = {}
  ;(tickets || []).forEach((ticket) => {
    if (!ticket || !ticket.projectId) return
    if (!map[ticket.projectId]) {
      map[ticket.projectId] = {
        activeCount: 0,
        latestTicket: null
      }
    }
    if (isActiveTicket(ticket)) map[ticket.projectId].activeCount += 1
    const latest = map[ticket.projectId].latestTicket
    if (!latest || toTime(ticket.createdAt || ticket.updatedAt) > toTime(latest.createdAt || latest.updatedAt)) {
      map[ticket.projectId].latestTicket = ticket
    }
  })
  return map
}

function normalizeProject(project, warrantyMap, ticketMap) {
  const projectId = project._id || ''
  const statusCode = getProjectStatusCode(project)
  const statusLabel = getProjectStatusLabel(project)
  const warrantyCard = warrantyMap[projectId] || null
  const ticketSummary = ticketMap[projectId] || { activeCount: 0, latestTicket: null }
  const activeAfterSalesTicketCount = ticketSummary.activeCount || 0
  const latestAfterSalesTicket = ticketSummary.latestTicket || null
  const groupKey = activeAfterSalesTicketCount > 0
    ? 'afterSales'
    : getInitialGroupKey(statusCode)

  return {
    projectId,
    projectName: project.name || '',
    community: project.community || project.communityName || '',
    building: project.building || '',
    room: project.room || project.houseNo || '',
    address: project.address || '',
    status: project.status || statusLabel,
    statusCode,
    statusLabel,
    groupKey,
    progress: Number(project.progress || 0),
    currentStage: project.currentStage || '',
    foremanName: project.foremanName || project.workerName || project.managerName || '',
    foremanPhone: project.foremanPhone || project.workerPhone || project.managerPhone || '',
    deliveredAt: project.deliveredAt || '',
    warrantyCardId: warrantyCard ? warrantyCard._id : '',
    warrantyStatus: warrantyCard ? (warrantyCard.status || '') : '',
    activeAfterSalesTicketCount,
    latestAfterSalesTicketId: latestAfterSalesTicket ? latestAfterSalesTicket._id : '',
    updatedAt: project.updatedAt || project.createdAt || ''
  }
}

function makeGroups(items) {
  const groups = {
    inProgress: [],
    delivered: [],
    afterSales: [],
    others: []
  }
  ;(items || []).forEach((item) => {
    const key = groups[item.groupKey] ? item.groupKey : 'others'
    groups[key].push(item)
  })
  return groups
}

async function recordOwnerProjectHomeViewed(openid, user, tenantId, projectCount) {
  try {
    await db.collection('operation_logs').add({
      data: {
        tenantId,
        tenantName: (user && user.tenantName) || DEFAULT_TENANT_NAME,
        event: 'owner_project_home_viewed',
        eventType: 'owner_project_home_viewed',
        actorOpenid: openid,
        actorUserId: (user && user._id) || '',
        actorRole: (user && user.role) || '',
        projectCount,
        createdAt: db.serverDate()
      }
    })
  } catch (error) {
    // 埋点不能影响业主打开页面。
  }
}

exports.main = async () => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')

    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const projects = await queryOwnerProjects(openid, user, tenantId)
    const projectIds = projects.map((item) => item._id).filter(Boolean)
    const userId = String(user._id || '').trim()

    const [warrantyCards, afterSalesTickets] = await Promise.all([
      safeGetCollectionByProjectIds('warranty_cards', tenantId, projectIds),
      safeGetCollectionByProjectIds('after_sales_tickets', tenantId, projectIds)
    ])

    const warrantyMap = buildWarrantyMap(warrantyCards, openid, userId)
    const ticketMap = buildTicketMap(afterSalesTickets)
    const items = projects.map((project) => normalizeProject(project, warrantyMap, ticketMap))
    const groups = makeGroups(items)
    await recordOwnerProjectHomeViewed(openid, user, tenantId, items.length)

    return {
      items,
      groups,
      stats: {
        total: items.length,
        inProgress: groups.inProgress.length,
        delivered: groups.delivered.length,
        afterSales: groups.afterSales.length,
        others: groups.others.length
      }
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '获取我的项目失败'
      }
    }
  }
}
