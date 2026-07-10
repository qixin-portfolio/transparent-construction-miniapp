const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'

function tenantMatches(resourceTenantId, tenantId) {
  return resourceTenantId ? resourceTenantId === tenantId : tenantId === DEFAULT_TENANT_ID
}
const STAFF_ROLES = ['admin', 'boss_qi', 'boss_hu', 'designer', 'worker']

const STATUS_ALIASES = {
  submitted: 'pending',
  done: 'completed',
  rejected: 'closed'
}

const ACTIONS = {
  accept: {
    roles: 'staff',
    from: ['pending', 'submitted'],
    to: 'accepted',
    logAction: 'accepted',
    eventType: 'after_sales_ticket_accepted',
    remark: '员工已受理售后工单',
    timeField: 'acceptedAt'
  },
  start_processing: {
    roles: 'staff',
    from: ['accepted', 'assigned'],
    to: 'processing',
    logAction: 'processing',
    eventType: 'after_sales_ticket_processing',
    remark: '售后工单处理中'
  },
  wait_owner_confirm: {
    roles: 'staff',
    from: ['processing'],
    to: 'waiting_owner_confirm',
    logAction: 'waiting_owner_confirm',
    eventType: 'after_sales_ticket_waiting_owner_confirm',
    remark: '售后处理完成，待业主确认'
  },
  close: {
    roles: 'staff',
    from: ['pending', 'submitted', 'accepted', 'assigned', 'processing', 'waiting_owner_confirm'],
    to: 'closed',
    logAction: 'closed',
    eventType: 'after_sales_ticket_closed',
    remark: '售后工单已关闭'
  },
  owner_confirm_complete: {
    roles: 'owner',
    from: ['waiting_owner_confirm'],
    to: 'completed',
    logAction: 'owner_confirmed',
    eventType: 'owner_confirmed_ticket',
    remark: '业主确认售后完成',
    timeField: 'ownerConfirmedAt',
    completed: true
  }
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

function isStaff(user) {
  return user && STAFF_ROLES.indexOf(user.role) !== -1
}

function canOwnerAccess(ticket, openid, userId) {
  return ticket.ownerOpenid === openid || (userId && (ticket.ownerUserId === userId || ticket.ownerId === userId))
}

async function writeTicketLog(ticketId, tenantId, user, openid, action, fromStatus, toStatus, remark, images, now) {
  try {
    await db.collection('after_sales_ticket_logs').add({
      data: {
        ticketId,
        tenantId,
        operatorUserId: (user && user._id) || '',
        operatorOpenid: openid,
        operatorRole: (user && user.role) || '',
        action,
        fromStatus,
        toStatus,
        remark: remark || '',
        images: images || [],
        createdAt: now
      }
    })
  } catch (error) {
    // 日志失败不阻断状态更新。
  }
}

async function writeOperationLog(eventType, tenantId, tenantName, user, openid, ticket, extra, now) {
  try {
    await db.collection('operation_logs').add({
      data: Object.assign({
        tenantId,
        tenantName,
        event: eventType,
        eventType,
        actorOpenid: openid,
        actorUserId: (user && user._id) || '',
        actorRole: (user && user.role) || '',
        projectId: ticket.projectId || '',
        projectName: ticket.projectName || '',
        ticketId: ticket._id || '',
        createdAt: now
      }, extra || {})
    })
  } catch (error) {
    // 埋点失败不影响主流程。
  }
}

exports.main = async (event) => {
  try {
    const ticketId = String(event.ticketId || '').trim()
    const action = String(event.action || '').trim()
    if (!ticketId) throw new Error('缺少工单 ID')
    if (!ACTIONS[action]) throw new Error('不支持的工单操作')

    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const tenantName = user.tenantName || DEFAULT_TENANT_NAME
    const ticketRes = await db.collection('after_sales_tickets').doc(ticketId).get()
    const ticket = ticketRes.data || null
    if (!ticket) throw new Error('工单不存在')
    if (!tenantMatches(ticket.tenantId, tenantId)) throw new Error('当前账号无权处理该工单')

    const rule = ACTIONS[action]
    if (rule.roles === 'staff' && !isStaff(user)) throw new Error('当前账号没有处理售后工单的权限')
    if (rule.roles === 'owner' && !canOwnerAccess(ticket, openid, user._id || '')) throw new Error('当前账号无权确认该工单')

    const fromStatus = normalizeStatus(ticket.status)
    if (rule.from.indexOf(ticket.status || '') === -1 && rule.from.indexOf(fromStatus) === -1) {
      throw new Error('当前工单状态不支持该操作')
    }

    const now = db.serverDate()
    const images = Array.isArray(event.images) ? event.images.filter(Boolean) : []
    const remark = String(event.remark || '').trim() || rule.remark
    const serviceResult = String(event.serviceResult || '').trim()
    const updateData = {
      status: rule.to,
      updatedAt: now
    }
    if (rule.timeField) updateData[rule.timeField] = now
    if (rule.completed) {
      updateData.completedAt = now
      updateData.ownerConfirmedAt = now
    }
    if (serviceResult || action === 'wait_owner_confirm') updateData.serviceResult = serviceResult || ticket.serviceResult || ''
    if (action === 'accept') updateData.assignedTo = ticket.assignedTo || user._id || openid
    if (images.length) updateData.processImages = _.push(images)
    updateData.records = _.push({
      type: rule.to,
      content: remark,
      operatorOpenid: openid,
      operatorName: user.name || user.nickName || user.role || '员工',
      createdAt: now
    })

    await db.collection('after_sales_tickets').doc(ticketId).update({ data: updateData })
    await writeTicketLog(ticketId, tenantId, user, openid, rule.logAction, fromStatus, rule.to, remark, images, now)
    await writeOperationLog(rule.eventType, tenantId, tenantName, user, openid, ticket, {
      fromStatus,
      toStatus: rule.to
    }, now)
    if (rule.completed) {
      await writeOperationLog('after_sales_ticket_completed', tenantId, tenantName, user, openid, ticket, {
        fromStatus,
        toStatus: rule.to
      }, now)
    }

    return {
      ok: true,
      ticketId,
      fromStatus,
      status: rule.to
    }
  } catch (error) {
    return { error: { message: error.message || '更新售后工单失败' } }
  }
}
