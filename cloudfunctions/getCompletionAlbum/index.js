const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'
const DEFAULT_SERVICE_PHONE = '13935842860'

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
    ['已交付', '已完工', '完工', '竣工验收', '竣工交付'].indexOf(status) !== -1
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
      .where({ projectId, tenantId: _.in([tenantId, '', null]) })
      .limit(1)
      .get()
    return res.data[0] || null
  } catch (error) {
    return null
  }
}

async function getAuthorization(projectId, tenantId) {
  try {
    const res = await db.collection('case_authorizations')
      .where({
        projectId,
        tenantId: _.in([tenantId, '', null]),
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
      tenantId: _.in([tenantId, '', null]),
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
        tenantId: _.in([tenantId, '', null]),
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
    map[logId].push(tempUrlMap[fileID] || fileID)
    return map
  }, {})

  return picked.map((log) => {
    const inlinePhotos = (log.photoFileIDs || log.photos || [])
      .filter(Boolean)
      .map((fileID) => tempUrlMap[fileID] || fileID)
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
    return project.completionPhotoFileIDs.map((fileID) => tempUrlMap[fileID] || fileID).slice(0, 6)
  }

  const logsRes = await db.collection('stage_logs')
    .where({
      projectId,
      tenantId: _.in([tenantId, '', null]),
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
      tenantId: _.in([tenantId, '', null]),
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
  const urls = allFileIDs.map((fileID) => tempUrlMap[fileID] || fileID)
  return Array.from(new Set(urls)).slice(0, 6)
}

function buildPublicProject(project) {
  return {
    _id: project._id || '',
    name: project.name || '',
    status: project.status || '',
    statusCode: project.statusCode || ''
  }
}

function buildPublicHouseInfo(project, authorization) {
  const allowedMaterials = Array.isArray(authorization && authorization.allowedMaterials) ? authorization.allowedMaterials : []
  const canShowHouseInfo = !authorization || allowedMaterials.length === 0 || allowedMaterials.indexOf('house_info') !== -1
  return {
    community: canShowHouseInfo ? inferCommunity(project) : '',
    building: '',
    room: '',
    address: '',
    area: canShowHouseInfo ? project.area || '' : '',
    layout: canShowHouseInfo ? text(project.layout) : '',
    style: canShowHouseInfo ? text(project.style) : '',
    decorateType: canShowHouseInfo ? text(project.decorateType) : '',
    startDate: formatDate(project.startDate),
    completedAt: formatDate(project.completedAt),
    deliveredAt: formatDate(project.deliveredAt)
  }
}

exports.main = async (event) => {
  try {
    const projectId = text(event.projectId)
    if (!projectId) throw new Error('缺少工地 ID')

    const projectRes = await db.collection('projects').doc(projectId).get()
    const project = projectRes.data || null
    if (!project || project.deleted === true || project.status === 'deleted') throw new Error('纪念册不存在')
    if (!isCompletedProject(project)) throw new Error('纪念册暂未开放')

    const tenantId = project.tenantId || DEFAULT_TENANT_ID
    const [milestones, completionPhotos, warrantyCard, authorization] = await Promise.all([
      getMilestones(projectId, tenantId),
      getCompletionPhotos(projectId, tenantId, project),
      getWarrantyCard(projectId, tenantId),
      getAuthorization(projectId, tenantId)
    ])
    const servicePhone = (warrantyCard && (warrantyCard.servicePhone || warrantyCard.contactPhone)) || await getServicePhone(tenantId)
    const houseInfo = buildPublicHouseInfo(project, authorization)
    const archive = {
      houseInfo,
      milestones,
      completionPhotos,
      warrantyCard: {
        servicePhone
      }
    }

    return {
      project: buildPublicProject(project),
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
      authorization
    }
  } catch (error) {
    return { error: { message: error.message || '获取完工纪念册失败' } }
  }
}
