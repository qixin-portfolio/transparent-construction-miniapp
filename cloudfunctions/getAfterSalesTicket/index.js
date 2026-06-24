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
  return Object.assign({}, ticket, {
    status: normalizeStatus(ticket.status),
    rawStatus: ticket.status || '',
    issueType: ticket.issueType || ticket.category || '其他问题',
    issueDescription: ticket.issueDescription || ticket.description || '',
    images: Array.isArray(ticket.images) ? ticket.images : (ticket.photoFileIDs || []),
    expectedVisitTime: ticket.expectedVisitTime || ticket.preferredTime || ''
  })
}

function canOwnerView(ticket, openid, userId) {
  return ticket.ownerOpenid === openid || (userId && (ticket.ownerUserId === userId || ticket.ownerId === userId))
}

exports.main = async (event) => {
  try {
    const ticketId = String(event.ticketId || '').trim()
    if (!ticketId) throw new Error('缺少工单 ID')
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const res = await db.collection('after_sales_tickets').doc(ticketId).get()
    const ticket = res.data || null
    if (!ticket) throw new Error('工单不存在')
    if (ticket.tenantId && ticket.tenantId !== tenantId) throw new Error('当前账号无权查看该工单')
    const isStaff = STAFF_ROLES.indexOf(user.role) !== -1
    if (!isStaff && !canOwnerView(ticket, openid, user._id || '')) throw new Error('当前账号无权查看该工单')
    let logs = []
    try {
      const logsRes = await db.collection('after_sales_ticket_logs')
        .where({ tenantId: _.in([tenantId, '', null]), ticketId })
        .orderBy('createdAt', 'asc')
        .limit(100)
        .get()
      logs = logsRes.data || []
    } catch (error) {
      logs = []
    }
    return { ticket: formatTicket(ticket), logs, isStaff }
  } catch (error) {
    return { error: { message: error.message || '获取售后工单详情失败' } }
  }
}
