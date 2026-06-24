const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'
const STAFF_ROLES = ['admin', 'boss_qi', 'boss_hu', 'designer', 'worker']
const STATUS_ALIASES = {
  submitted: 'pending',
  done: 'completed',
  rejected: 'closed'
}
const STATUS_GROUPS = {
  pending: ['pending', 'submitted'],
  processing: ['accepted', 'assigned', 'processing'],
  waiting_owner_confirm: ['waiting_owner_confirm'],
  completed: ['completed', 'done'],
  closed: ['closed', 'rejected']
}

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

function normalizeStatus(status) {
  const raw = String(status || 'pending').trim()
  return STATUS_ALIASES[raw] || raw || 'pending'
}

function formatTicket(ticket) {
  const status = normalizeStatus(ticket.status)
  return Object.assign({}, ticket, {
    status,
    rawStatus: ticket.status || '',
    issueType: ticket.issueType || ticket.category || '其他问题',
    issueDescription: ticket.issueDescription || ticket.description || '',
    images: Array.isArray(ticket.images) ? ticket.images : (ticket.photoFileIDs || []),
    expectedVisitTime: ticket.expectedVisitTime || ticket.preferredTime || ''
  })
}

function matchStatus(ticket, statusFilter) {
  const filter = String(statusFilter || 'all').trim()
  if (!filter || filter === 'all') return true
  const group = STATUS_GROUPS[filter] || [filter]
  return group.indexOf(ticket.status) !== -1 || group.indexOf(ticket.rawStatus) !== -1
}

async function listOwnerTickets(tenantId, openid, userId, projectId) {
  const queries = []
  const base = { tenantId: _.in([tenantId, '', null]) }
  if (projectId) base.projectId = projectId
  queries.push(db.collection('after_sales_tickets').where(Object.assign({}, base, { ownerOpenid: openid })).limit(100).get())
  if (userId) {
    queries.push(db.collection('after_sales_tickets').where(Object.assign({}, base, { ownerUserId: userId })).limit(100).get())
    queries.push(db.collection('after_sales_tickets').where(Object.assign({}, base, { ownerId: userId })).limit(100).get())
  }
  const results = await Promise.all(queries.map((task) => task.catch(() => ({ data: [] }))))
  const map = {}
  results.forEach((res) => {
    ;(res.data || []).forEach((item) => {
      if (item && item._id) map[item._id] = item
    })
  })
  return Object.values(map)
}

async function listStaffTickets(tenantId, projectId) {
  const where = { tenantId: _.in([tenantId, '', null]) }
  if (projectId) where.projectId = projectId
  const res = await db.collection('after_sales_tickets')
    .where(where)
    .orderBy('updatedAt', 'desc')
    .limit(200)
    .get()
  return res.data || []
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const projectId = String(event.projectId || '').trim()
    const scope = String(event.scope || '').trim()
    const status = String(event.status || 'all').trim()
    const isStaff = STAFF_ROLES.indexOf(user.role) !== -1
    const rawItems = isStaff && scope === 'staff'
      ? await listStaffTickets(tenantId, projectId)
      : await listOwnerTickets(tenantId, openid, user._id || '', projectId)
    const items = rawItems
      .map(formatTicket)
      .filter((item) => matchStatus(item, status))
      .sort((a, b) => {
        const at = new Date(a.updatedAt || a.createdAt || 0).getTime() || 0
        const bt = new Date(b.updatedAt || b.createdAt || 0).getTime() || 0
        return bt - at
      })
    return { items }
  } catch (error) {
    return { error: { message: error.message || '获取售后工单失败' } }
  }
}
