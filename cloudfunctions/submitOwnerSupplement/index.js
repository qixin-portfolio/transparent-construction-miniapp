const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'

function tenantMatches(resourceTenantId, tenantId) {
  return resourceTenantId ? resourceTenantId === tenantId : tenantId === DEFAULT_TENANT_ID
}

// 允许业主补充的资料类型
const VALID_CATEGORIES = {
  hydro: '水电隐蔽工程',
  material: '材料清单/票据',
  completion: '完工实景'
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

async function assertOwnerProject(openid, tenantId, projectId) {
  if (!projectId) throw new Error('缺少工地 ID')
  const res = await db.collection('projects').doc(projectId).get()
  const project = res.data || null
  if (!project) throw new Error('工地不存在')
  if (!tenantMatches(project.tenantId, tenantId)) throw new Error('当前账号无权操作该工地')
  const ownerOpenids = Array.isArray(project.ownerOpenids) ? project.ownerOpenids : []
  if (project.ownerOpenid !== openid && ownerOpenids.indexOf(openid) === -1) {
    throw new Error('当前账号无权操作该工地')
  }
  return project
}

async function getTempUrlMap(fileIDs) {
  const unique = Array.from(new Set(fileIDs.filter(Boolean)))
  if (!unique.length) return {}
  try {
    const res = await cloud.getTempFileURL({ fileList: unique })
    return (res.fileList || []).reduce((map, item) => {
      map[item.fileID] = item.tempFileURL || item.fileID
      return map
    }, {})
  } catch (error) {
    return unique.reduce((map, fileID) => {
      map[fileID] = fileID
      return map
    }, {})
  }
}

// 查询业主补充资料列表
async function listSupplements(projectId, tenantId, category) {
  const where = {
    projectId,
    tenantId: tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId,
    status: _.neq('deleted')
  }
  if (category) where.category = category

  const res = await db.collection('owner_supplements')
    .where(where)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get()

  const records = res.data || []
  const allFileIDs = []
  records.forEach((r) => {
    (r.fileIDs || []).forEach((id) => allFileIDs.push(id))
  })
  const tempUrlMap = await getTempUrlMap(allFileIDs)

  return records.map((r) => ({
    _id: r._id,
    category: r.category,
    categoryLabel: VALID_CATEGORIES[r.category] || r.category,
    fileIDs: r.fileIDs || [],
    fileUrls: (r.fileIDs || []).map((id) => tempUrlMap[id] || id),
    remark: r.remark || '',
    createdAt: r.createdAt,
    uploadedBy: r.uploadedBy || {}
  }))
}

// 保存业主补充资料
async function submitSupplement(openid, user, tenantId, projectId, category, fileIDs, remark) {
  if (VALID_CATEGORIES[category] === undefined) throw new Error('资料类型无效')
  if (!fileIDs || !fileIDs.length) throw new Error('请先上传图片')
  if (fileIDs.length > 9) throw new Error('单次最多上传 9 张')

  const now = db.serverDate()
  const record = {
    projectId,
    tenantId,
    tenantName: user.tenantName || DEFAULT_TENANT_NAME,
    category,
    categoryLabel: VALID_CATEGORIES[category],
    fileIDs: fileIDs.slice(0, 9),
    remark: (remark || '').slice(0, 200),
    status: 'active',
    uploadedBy: {
      openid,
      name: user.name || user.nickName || '业主',
      role: user.role || 'owner'
    },
    createdAt: now,
    updatedAt: now
  }

  const res = await db.collection('owner_supplements').add({ data: record })

  // 更新项目 updateTime
  try {
    await db.collection('projects').doc(projectId).update({
      data: { updatedAt: now }
    })
  } catch (e) {
    // 忽略
  }

  return { _id: res._id }
}

// 删除一条业主补充资料
async function deleteSupplement(openid, tenantId, supplementId) {
  if (!supplementId) throw new Error('缺少资料 ID')
  const res = await db.collection('owner_supplements').doc(supplementId).get()
  const record = res.data || null
  if (!record) throw new Error('资料不存在')
  if (!tenantMatches(record.tenantId, tenantId)) throw new Error('无权操作')
  if (record.uploadedBy && record.uploadedBy.openid !== openid) {
    throw new Error('只能删除自己上传的资料')
  }

  await db.collection('owner_supplements').doc(supplementId).update({
    data: { status: 'deleted', updatedAt: db.serverDate() }
  })

  return { ok: true }
}

// 统计某项目的业主补充资料（按类型分组）
async function countSupplements(projectId, tenantId) {
  const res = await db.collection('owner_supplements')
    .where({
      projectId,
      tenantId: tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId,
      status: 'active'
    })
    .get()
  const records = res.data || []
  const counts = { hydro: 0, material: 0, completion: 0 }
  const fileCount = { hydro: 0, material: 0, completion: 0 }
  records.forEach((r) => {
    if (counts[r.category] !== undefined) {
      counts[r.category] += 1
      fileCount[r.category] += (r.fileIDs || []).length
    }
  })
  return { counts, fileCount }
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const projectId = String(event.projectId || '').trim()
    const project = await assertOwnerProject(openid, tenantId, projectId)

    const action = event.action || 'list'

    if (action === 'list') {
      const category = event.category ? String(event.category).trim() : ''
      const supplements = await listSupplements(projectId, tenantId, category)
      return { project, supplements }
    }

    if (action === 'submit') {
      const category = String(event.category || '').trim()
      const fileIDs = Array.isArray(event.fileIDs) ? event.fileIDs : []
      const remark = String(event.remark || '').trim()
      const result = await submitSupplement(openid, user, tenantId, projectId, category, fileIDs, remark)
      const supplements = await listSupplements(projectId, tenantId, category)
      return { ...result, supplements }
    }

    if (action === 'delete') {
      const supplementId = String(event.supplementId || '').trim()
      await deleteSupplement(openid, tenantId, supplementId)
      const category = event.category ? String(event.category).trim() : ''
      const supplements = await listSupplements(projectId, tenantId, category)
      return { ok: true, supplements }
    }

    if (action === 'count') {
      const stats = await countSupplements(projectId, tenantId)
      return { project, stats }
    }

    throw new Error('未知操作')
  } catch (error) {
    return { error: { message: error.message || '操作失败' } }
  }
}
