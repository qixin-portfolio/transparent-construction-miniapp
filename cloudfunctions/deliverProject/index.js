const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DELIVER_ROLES = ['admin', 'boss_qi', 'boss_hu']
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'
const DEFAULT_SERVICE_PHONE = '13935842860'

const WARRANTY_ITEMS = [
  { name: '基础工程质保', period: '以合同约定为准', description: '基础施工相关质量问题' },
  { name: '水电工程质保', period: '以合同约定为准', description: '水路、电路隐蔽工程' },
  { name: '防水工程质保', period: '以合同约定为准', description: '防水、闭水相关工程' },
  { name: '木作 / 柜体质保', period: '以合同约定为准', description: '木作、柜体及相关安装' },
  { name: '安装 / 五金质保', period: '以合同约定为准', description: '安装件、五金件及收口' },
  { name: '其他约定质保', period: '以合同约定为准', description: '其他以合同约定为准' }
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

function assertRole(user) {
  if (!user || DELIVER_ROLES.indexOf(user.role) === -1) {
    throw new Error('当前账号没有确认竣工交付的权限')
  }
}

function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return value
  if (value.$date && value.$date.$numberLong) return new Date(Number(value.$date.$numberLong))
  if (value.$numberLong) return new Date(Number(value.$numberLong))
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value) {
  const date = toDate(value)
  if (!date) return ''
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getPrimaryOwner(project) {
  const ownerOpenids = Array.isArray(project.ownerOpenids) ? project.ownerOpenids.filter(Boolean) : []
  const ownerUserIds = Array.isArray(project.ownerUserIds) ? project.ownerUserIds.filter(Boolean) : []
  const ownerNames = Array.isArray(project.ownerNames) ? project.ownerNames.filter(Boolean) : []
  return {
    ownerOpenid: project.ownerOpenid || ownerOpenids[0] || '',
    ownerUserId: project.ownerUserId || ownerUserIds[0] || '',
    ownerName: project.ownerName || ownerNames[0] || ''
  }
}

function makeWarrantyNo(projectId) {
  const now = new Date()
  const y = now.getFullYear()
  const m = `${now.getMonth() + 1}`.padStart(2, '0')
  const d = `${now.getDate()}`.padStart(2, '0')
  const suffix = String(projectId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || Math.random().toString(36).slice(2, 8).toUpperCase()
  return `SJZB${y}${m}${d}${suffix}`
}

async function getOptionalDoc(collectionName, id) {
  if (!id) return null
  try {
    const res = await db.collection(collectionName).doc(id).get()
    return res.data || null
  } catch (error) {
    return null
  }
}

async function getServicePhone(tenantId) {
  const branding = await getOptionalDoc('tenant_branding', tenantId)
  if (branding && branding.contactPhone) return branding.contactPhone
  const tenant = await getOptionalDoc('tenants', tenantId)
  if (tenant && tenant.contactPhone) return tenant.contactPhone
  return DEFAULT_SERVICE_PHONE
}

async function findWarrantyCard(tenantId, projectId) {
  const res = await db.collection('warranty_cards')
    .where({ tenantId: _.in([tenantId, '', null]), projectId })
    .orderBy('updatedAt', 'desc')
    .limit(1)
    .get()
  return res.data[0] || null
}

async function createWarrantyCard(project, user, tenantId, tenantName, deliveredDate, deliveredAt) {
  const owner = getPrimaryOwner(project)
  const servicePhone = await getServicePhone(tenantId)
  const terms = '具体质保期限与范围以合同约定为准。'
  const dateText = formatDate(deliveredDate)
  const data = {
    tenantId,
    tenantName,
    projectId: project._id,
    customerId: project.customerId || '',
    ownerUserId: owner.ownerUserId,
    ownerId: owner.ownerUserId,
    ownerOpenid: owner.ownerOpenid,
    ownerName: owner.ownerName,
    projectName: project.name || '',
    projectAddress: project.address || '',
    deliveredAt,
    warrantyStartAt: deliveredAt,
    warrantyEndAt: null,
    warrantyScope: WARRANTY_ITEMS.map((item) => item.name),
    servicePhone,
    warrantyTerms: terms,
    status: 'active',
    warrantyNo: makeWarrantyNo(project._id),
    startDate: dateText || '以交付日期为准',
    endDate: '以合同约定为准',
    contactName: tenantName || DEFAULT_TENANT_NAME,
    contactPhone: servicePhone,
    items: WARRANTY_ITEMS,
    createdBy: (user && user._id) || '',
    createdByOpenid: (user && user.openid) || '',
    createdAt: deliveredAt,
    updatedAt: deliveredAt
  }
  const res = await db.collection('warranty_cards').add({ data })
  return Object.assign({ _id: res._id }, data)
}

async function ensureWarrantyCard(project, user, tenantId, tenantName, deliveredDate, deliveredAt) {
  const existing = await findWarrantyCard(tenantId, project._id)
  if (existing) return { warrantyCard: existing, created: false }
  const warrantyCard = await createWarrantyCard(project, user, tenantId, tenantName, deliveredDate, deliveredAt)
  return { warrantyCard, created: true }
}

async function updateCustomerLifecycle(project, tenantId, now) {
  const customerId = String(project.customerId || '').trim()
  if (!customerId) return { skipped: true, reason: 'missing_customer_id' }
  const customer = await getOptionalDoc('customers', customerId)
  if (!customer || customer.deleted === true) return { skipped: true, reason: 'customer_not_found' }
  if (customer.tenantId && customer.tenantId !== tenantId) return { skipped: true, reason: 'tenant_mismatch' }
  await db.collection('customers').doc(customerId).update({
    data: {
      lifecycleStatus: 'delivered',
      updatedAt: now
    }
  })
  return { updated: true, customerId }
}

async function recordOperationLog(eventType, tenantId, tenantName, user, openid, project, extra = {}) {
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
        createdAt: db.serverDate()
      }, extra)
    })
  } catch (error) {
    // 日志失败不影响交付主流程。
  }
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    assertRole(user)

    const projectId = String(event.projectId || '').trim()
    if (!projectId) throw new Error('缺少工地 ID')

    const projectRes = await db.collection('projects').doc(projectId).get()
    const project = projectRes.data
    if (!project) throw new Error('工地不存在')

    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const tenantName = user.tenantName || project.tenantName || DEFAULT_TENANT_NAME
    if (project.tenantId && project.tenantId !== tenantId) {
      throw new Error('无权交付该工地')
    }

    const deliveredDate = new Date()
    const now = db.serverDate()
    const existingDeliveredAt = project.deliveredAt || null
    const deliveredAt = existingDeliveredAt || now
    const alreadyDelivered = project.statusCode === 'delivered' || project.status === '已交付'
    const needsProjectDeliveryUpdate = project.statusCode !== 'delivered' || project.status !== '已交付' || !existingDeliveredAt

    // 方案C：交付时补全房屋档案信息 + 完工照片
    const houseInfo = event.houseInfo || {}
    const completionPhotoFileIDs = Array.isArray(event.completionPhotoFileIDs) ? event.completionPhotoFileIDs.filter(Boolean) : []

    const warrantyResult = await ensureWarrantyCard(project, Object.assign({}, user, { openid }), tenantId, tenantName, deliveredDate, deliveredAt)

    if (needsProjectDeliveryUpdate) {
      const updateData = {
        tenantId,
        tenantName,
        statusCode: 'delivered',
        status: '已交付',
        deliveredAt,
        deliveredBy: user._id || openid,
        deliveredByOpenid: openid,
        updatedBy: user._id || openid,
        updatedByOpenid: openid,
        updatedAt: now
      }
      // 补全房屋档案字段（仅写入非空值，不覆盖已有值）
      if (houseInfo.layout && !project.layout) updateData.layout = houseInfo.layout
      if (houseInfo.area && !project.area) updateData.area = houseInfo.area
      if (houseInfo.style && !project.style) updateData.style = houseInfo.style
      if (houseInfo.decorateType && !project.decorateType) updateData.decorateType = houseInfo.decorateType
      if (houseInfo.startDate && !project.startDate) updateData.startDate = houseInfo.startDate
      if (houseInfo.completedAt && !project.completedAt) updateData.completedAt = houseInfo.completedAt
      // 完工照片单独存储
      if (completionPhotoFileIDs.length) {
        updateData.completionPhotoFileIDs = completionPhotoFileIDs
      }
      await db.collection('projects').doc(projectId).update({ data: updateData })
    }

    const customerResult = await updateCustomerLifecycle(project, tenantId, now)

    if (!alreadyDelivered) {
      await recordOperationLog('project_delivered', tenantId, tenantName, user, openid, project, {
        warrantyCardId: warrantyResult.warrantyCard._id || '',
        warrantyCreated: warrantyResult.created,
        customerId: project.customerId || ''
      })
    }
    await recordOperationLog(warrantyResult.created ? 'warranty_card_created' : 'warranty_card_reused', tenantId, tenantName, user, openid, project, {
      warrantyCardId: warrantyResult.warrantyCard._id || ''
    })

    return {
      ok: true,
      projectId,
      statusCode: 'delivered',
      status: '已交付',
      warrantyCard: warrantyResult.warrantyCard,
      warrantyCreated: warrantyResult.created,
      alreadyDelivered,
      customerResult
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '确认竣工交付失败'
      }
    }
  }
}
