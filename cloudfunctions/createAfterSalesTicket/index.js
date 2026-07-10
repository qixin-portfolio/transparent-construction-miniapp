const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'

function tenantMatches(resourceTenantId, tenantId) {
  return resourceTenantId ? resourceTenantId === tenantId : tenantId === DEFAULT_TENANT_ID
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

async function assertOwnerProject(openid, user, tenantId, projectId) {
  if (!projectId) throw new Error('缺少工地 ID')
  const res = await db.collection('projects').doc(projectId).get()
  const project = res.data || null
  if (!project) throw new Error('工地不存在')
  if (!tenantMatches(project.tenantId, tenantId)) throw new Error('当前账号无权提交该工地售后')
  const ownerOpenids = Array.isArray(project.ownerOpenids) ? project.ownerOpenids : []
  const ownerUserIds = Array.isArray(project.ownerUserIds) ? project.ownerUserIds : []
  const ownerUserId = (user && user._id) || ''
  const matchedByOpenid = project.ownerOpenid === openid || ownerOpenids.indexOf(openid) !== -1
  const matchedByUserId = ownerUserId && (project.ownerUserId === ownerUserId || ownerUserIds.indexOf(ownerUserId) !== -1)
  if (!matchedByOpenid && !matchedByUserId) {
    throw new Error('当前账号无权提交该工地售后')
  }
  return project
}

function makeTicketNo() {
  const now = new Date()
  const y = now.getFullYear()
  const m = `${now.getMonth() + 1}`.padStart(2, '0')
  const d = `${now.getDate()}`.padStart(2, '0')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `SH${y}${m}${d}${rand}`
}

async function findWarrantyCard(tenantId, projectId) {
  try {
    const res = await db.collection('warranty_cards')
      .where({ tenantId: tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId, projectId })
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get()
    return res.data[0] || null
  } catch (error) {
    return null
  }
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
    // 日志失败不阻断报修提交。
  }
}

async function writeOperationLog(eventType, tenantId, tenantName, user, openid, project, ticketId, extra, now) {
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
        projectId: project._id || '',
        projectName: project.name || '',
        ticketId,
        createdAt: now
      }, extra || {})
    })
  } catch (error) {
    // 埋点失败不影响主流程。
  }
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const tenantName = user.tenantName || DEFAULT_TENANT_NAME
    const projectId = String(event.projectId || '').trim()
    const project = await assertOwnerProject(openid, user, tenantId, projectId)
    const category = String(event.issueType || event.category || '其他问题').trim()
    const description = String(event.issueDescription || event.description || '').trim()
    const photoFileIDs = Array.isArray(event.images)
      ? event.images.filter(Boolean)
      : (Array.isArray(event.photoFileIDs) ? event.photoFileIDs.filter(Boolean) : [])
    const contactName = String(event.contactName || user.name || '').trim()
    const contactPhone = String(event.contactPhone || user.phone || '').trim()
    const preferredTime = String(event.expectedVisitTime || event.preferredTime || '').trim()

    if (!description && !photoFileIDs.length) throw new Error('请填写问题描述或上传现场照片')
    if (!contactPhone) throw new Error('请填写联系电话')

    const now = db.serverDate()
    const warrantyCard = await findWarrantyCard(tenantId, projectId)
    const ticket = {
      tenantId,
      tenantName,
      projectId,
      projectName: project.name || '',
      customerId: project.customerId || '',
      ownerUserId: user._id || '',
      ownerId: user._id || '',
      ownerOpenid: openid,
      warrantyCardId: warrantyCard ? warrantyCard._id : '',
      ticketNo: makeTicketNo(),
      issueType: category,
      issueDescription: description,
      images: photoFileIDs,
      category,
      description,
      photoFileIDs,
      contactName,
      contactPhone,
      expectedVisitTime: preferredTime,
      preferredTime,
      status: 'pending',
      assignedTo: '',
      acceptedAt: null,
      completedAt: null,
      ownerConfirmedAt: null,
      serviceResult: '',
      records: [{
        type: 'pending',
        content: '业主提交售后报修',
        operatorOpenid: openid,
        operatorName: contactName || '业主',
        createdAt: now
      }],
      createdAt: now,
      updatedAt: now
    }
    const res = await db.collection('after_sales_tickets').add({ data: ticket })
    await writeTicketLog(res._id, tenantId, user, openid, 'created', '', 'pending', '业主提交售后报修', photoFileIDs, now)
    await writeOperationLog('after_sales_ticket_created', tenantId, tenantName, user, openid, project, res._id, {
      issueType: category
    }, now)
    return { id: res._id, ticketId: res._id, ticketNo: ticket.ticketNo }
  } catch (error) {
    return { error: { message: error.message || '提交售后报修失败' } }
  }
}
