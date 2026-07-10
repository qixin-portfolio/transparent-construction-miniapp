const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'
const DEFAULT_SERVICE_PHONE = '13935842860'
const STAFF_ROLES = ['admin', 'boss_qi', 'boss_hu']

function tenantScope(tenantId) {
  return tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId
}

function tenantMatches(resourceTenantId, tenantId) {
  return resourceTenantId
    ? resourceTenantId === tenantId
    : tenantId === DEFAULT_TENANT_ID
}

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return { openid: '', user: null }
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  return { openid: OPENID, user: res.data[0] || null }
}

function canAccessPrivately(openid, user, project, tenantId) {
  if (!user || !openid) return false
  const ownerOpenids = Array.isArray(project.ownerOpenids) ? project.ownerOpenids : []
  const isOwner = project.ownerOpenid === openid || ownerOpenids.indexOf(openid) !== -1
  const isTenantStaff = STAFF_ROLES.indexOf(user.role) !== -1 &&
    tenantMatches(project.tenantId, user.tenantId || DEFAULT_TENANT_ID)
  return isOwner || isTenantStaff
}

function text(value) {
  return String(value || '').trim()
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
  if (!date) return typeof value === 'string' ? text(value).slice(0, 10) : ''
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function inferCommunity(project) {
  const explicit = text(project.community || project.communityName || project.address)
  if (explicit) return explicit
  return text(project.name).replace(/透明工地/g, '').replace(/工地/g, '').trim()
}

function isCompletedProject(project) {
  const statusCode = text(project.statusCode)
  const status = text(project.status)
  return ['delivered', 'completed'].indexOf(statusCode) !== -1 ||
    ['已交付', '已完工', '完工', '竣工验收', '竣工交付'].indexOf(status) !== -1 ||
    Number(project.progress || 0) >= 100
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

async function getTempUrlMap(fileIDs) {
  const unique = Array.from(new Set(fileIDs.filter(Boolean)))
  if (!unique.length) return {}
  try {
    const res = await cloud.getTempFileURL({ fileList: unique })
    return (res.fileList || []).reduce((map, item) => {
      map[item.fileID] = item.tempFileURL || ''
      return map
    }, {})
  } catch (error) {
    return {}
  }
}

async function getServicePhone(tenantId) {
  const branding = await getOptionalDoc('tenant_branding', tenantId)
  if (branding && branding.contactPhone) return branding.contactPhone
  const tenant = await getOptionalDoc('tenants', tenantId)
  if (tenant && tenant.contactPhone) return tenant.contactPhone
  return DEFAULT_SERVICE_PHONE
}

async function getWarrantyCard(projectId, tenantId) {
  try {
    const res = await db.collection('warranty_cards')
      .where({ projectId, tenantId: tenantScope(tenantId) })
      .limit(1)
      .get()
    return res.data[0] || null
  } catch (error) {
    return null
  }
}

async function getAuthorization(projectId, tenantId, shareToken = '') {
  try {
    if (shareToken) {
      const tokenRes = await db.collection('case_authorizations').doc(shareToken).get()
      const tokenAuthorization = tokenRes.data || null
      if (!tokenAuthorization ||
        tokenAuthorization.projectId !== projectId ||
        tokenAuthorization.authorizationScope !== 'public' ||
        tokenAuthorization.status !== 'approved' ||
        !tenantMatches(tokenAuthorization.tenantId, tenantId)) {
        return null
      }
      return tokenAuthorization
    }
    const res = await db.collection('case_authorizations')
      .where({
        projectId,
        tenantId: tenantScope(tenantId),
        authorizationScope: 'public',
        status: 'approved'
      })
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get()
    return res.data[0] || null
  } catch (error) {
    return null
  }
}

async function getMilestones(projectId, tenantId) {
  const keyStages = [
    '开工交底',
    '拆改',
    '水电定位',
    '水电施工',
    '水电验收',
    '防水施工',
    '防水/闭水',
    '防水验收',
    '瓦工',
    '瓦工验收',
    '美缝',
    '木工施工',
    '木工验收',
    '木工/吊顶',
    '油漆验收',
    '油工/刮墙',
    '定制安装',
    '主材-木门',
    '主材-衣柜',
    '主材-橱柜',
    '主材-石材',
    '铝扣板吊顶',
    '开关插座',
    '灯具',
    '窗帘',
    '安装收尾',
    '竣工验收',
    '竣工交付'
  ]
  const logsRes = await db.collection('stage_logs')
    .where({
      projectId,
      tenantId: tenantScope(tenantId),
      reviewStatus: 'approved',
      ownerVisible: true
    })
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get()
  const logs = logsRes.data || []
  const keyLogs = logs.filter((log) => keyStages.indexOf(log.stage) !== -1)
  const picked = keyLogs.length >= 3 ? keyLogs.slice(0, 5) : logs.slice(0, 5)
  const logIds = picked.map((log) => log._id).filter(Boolean)

  let photoRecords = []
  if (logIds.length) {
    const photosRes = await db.collection('photos')
      .where({
        stageLogId: _.in(logIds),
        tenantId: tenantScope(tenantId),
        ownerVisible: true
      })
      .limit(50)
      .get()
    photoRecords = photosRes.data || []
  }

  const fileIDs = []
  picked.forEach((log) => {
    ;(log.photoFileIDs || []).forEach((fileID) => fileIDs.push(fileID))
  })
  photoRecords.forEach((photo) => {
    const fileID = photo.fileID || photo.fileId || photo.cloudFileId
    if (fileID) fileIDs.push(fileID)
  })
  const tempUrlMap = await getTempUrlMap(fileIDs)
  const photosByLog = photoRecords.reduce((map, photo) => {
    const fileID = photo.fileID || photo.fileId || photo.cloudFileId
    const logId = photo.stageLogId
    if (!map[logId]) map[logId] = []
    const url = tempUrlMap[fileID]
    if (url) map[logId].push(url)
    return map
  }, {})

  return picked.map((log) => {
    const inlinePhotos = (log.photoFileIDs || log.photos || [])
      .filter(Boolean)
      .map((fileID) => tempUrlMap[fileID] || '')
      .filter(Boolean)
    const recordPhotos = photosByLog[log._id] || []
    const photos = recordPhotos.length ? recordPhotos : inlinePhotos
    return {
      _id: log._id,
      title: log.stage || log.title || '施工节点',
      stage: log.stage || '',
      date: formatDate(log.logDate || log.createdAt),
      status: '已通过',
      description: text(log.summary || log.content),
      photos: photos.slice(0, 3),
      photoCount: photos.length
    }
  })
}

async function getCompletionPhotos(projectId, tenantId, project) {
  if (Array.isArray(project.completionPhotoFileIDs) && project.completionPhotoFileIDs.length) {
    const tempUrlMap = await getTempUrlMap(project.completionPhotoFileIDs)
    return project.completionPhotoFileIDs.map((fileID) => tempUrlMap[fileID] || '').filter(Boolean).slice(0, 6)
  }

  const logsRes = await db.collection('stage_logs')
    .where({
      projectId,
      tenantId: tenantScope(tenantId),
      reviewStatus: 'approved',
      ownerVisible: true,
      stage: _.in(['竣工验收', '竣工交付', '完工'])
    })
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get()
  const logs = logsRes.data || []
  if (!logs.length) return []

  const logIds = logs.map((log) => log._id).filter(Boolean)
  const photosRes = await db.collection('photos')
    .where({
      stageLogId: _.in(logIds),
      tenantId: tenantScope(tenantId),
      ownerVisible: true
    })
    .limit(30)
    .get()
  const photoRecords = photosRes.data || []
  const inlineFileIDs = []
  logs.forEach((log) => {
    ;(log.photoFileIDs || []).forEach((fileID) => inlineFileIDs.push(fileID))
  })
  const recordFileIDs = photoRecords.map((p) => p.fileID || p.fileId || p.cloudFileId).filter(Boolean)
  const allFileIDs = [...inlineFileIDs, ...recordFileIDs]
  const tempUrlMap = await getTempUrlMap(allFileIDs)
  const urls = allFileIDs.map((fileID) => tempUrlMap[fileID] || '').filter(Boolean)
  return Array.from(new Set(urls)).slice(0, 6)
}

function buildPublicProject(project, canShowHouseInfo) {
  return {
    _id: project._id || '',
    name: canShowHouseInfo ? project.name || '' : '完工纪念册',
    status: project.status || '',
    statusCode: project.statusCode || ''
  }
}

function buildPublicHouseInfo(project, canShowHouseInfo) {
  return {
    community: canShowHouseInfo ? inferCommunity(project) : '',
    building: '',
    room: '',
    address: '',
    area: canShowHouseInfo ? project.area || '' : '',
    layout: canShowHouseInfo ? text(project.layout) : '',
    style: canShowHouseInfo ? text(project.style) : '',
    decorateType: canShowHouseInfo ? text(project.decorateType) : '',
    startDate: canShowHouseInfo ? formatDate(project.startDate) : '',
    completedAt: canShowHouseInfo ? formatDate(project.completedAt) : '',
    deliveredAt: canShowHouseInfo ? formatDate(project.deliveredAt) : ''
  }
}

function sanitizeAuthorization(authorization) {
  if (!authorization) return null
  return {
    authorizationScope: authorization.authorizationScope || '',
    allowedMaterials: Array.isArray(authorization.allowedMaterials) ? authorization.allowedMaterials : [],
    ownerNameDisplay: authorization.ownerNameDisplay || 'anonymous',
    status: authorization.status || '',
    updatedAt: authorization.updatedAt || null,
    shareToken: authorization.authorizationScope === 'public' && authorization.status === 'approved'
      ? authorization._id
      : ''
  }
}

exports.main = async (event = {}) => {
  try {
    const projectId = text(event.projectId)
    const shareToken = text(event.shareToken)
    if (!projectId) throw new Error('缺少工地 ID')

    const projectRes = await db.collection('projects').doc(projectId).get()
    const project = projectRes.data || null
    if (!project || project.deleted === true || project.status === 'deleted') throw new Error('纪念册不存在')
    if (!isCompletedProject(project)) throw new Error('纪念册暂未开放')

    const tenantId = project.tenantId || DEFAULT_TENANT_ID
    const { openid, user } = await getCurrentUser()
    const privateAccess = canAccessPrivately(openid, user, project, tenantId)
    const authorization = await getAuthorization(projectId, tenantId, shareToken)
    if (!privateAccess && (!shareToken || !authorization || authorization.authorizationScope !== 'public')) {
      throw new Error('纪念册不存在或未公开')
    }

    const allowedMaterials = Array.isArray(authorization && authorization.allowedMaterials)
      ? authorization.allowedMaterials
      : []
    const canShowHouseInfo = privateAccess || allowedMaterials.indexOf('house_info') !== -1
    const canShowProcessPhotos = privateAccess || allowedMaterials.indexOf('process_photos') !== -1
    const canShowCompletionPhotos = privateAccess || allowedMaterials.indexOf('completion_photos') !== -1

    const [milestones, completionPhotos, warrantyCard] = await Promise.all([
      canShowProcessPhotos ? getMilestones(projectId, tenantId) : Promise.resolve([]),
      canShowCompletionPhotos ? getCompletionPhotos(projectId, tenantId, project) : Promise.resolve([]),
      getWarrantyCard(projectId, tenantId),
    ])
    const servicePhone = (warrantyCard && (warrantyCard.servicePhone || warrantyCard.contactPhone)) || await getServicePhone(tenantId)
    const houseInfo = buildPublicHouseInfo(project, canShowHouseInfo)
    const archive = {
      houseInfo,
      milestones,
      completionPhotos,
      warrantyCard: {
        servicePhone
      },
      permissions: {
        houseInfo: canShowHouseInfo,
        processPhotos: canShowProcessPhotos,
        completionPhotos: canShowCompletionPhotos
      }
    }

    return {
      project: buildPublicProject(project, canShowHouseInfo),
      archive,
      album: {
        title: `${project.name || '我的新家'}完工纪念册`,
        summary: '',
        coverUrl: completionPhotos[0] || '',
        style: houseInfo.style,
        area: houseInfo.area,
        completedAt: houseInfo.completedAt || houseInfo.deliveredAt,
        milestones
      },
      authorization: sanitizeAuthorization(authorization),
      accessMode: privateAccess ? 'private' : 'public_share'
    }
  } catch (error) {
    return { error: { message: error.message || '获取完工纪念册失败' } }
  }
}
