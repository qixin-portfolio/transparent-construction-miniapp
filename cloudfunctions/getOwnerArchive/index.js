const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'

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
  if (project.tenantId && project.tenantId !== tenantId) throw new Error('当前账号无权查看该工地')
  const ownerOpenids = Array.isArray(project.ownerOpenids) ? project.ownerOpenids : []
  if (project.ownerOpenid !== openid && ownerOpenids.indexOf(openid) === -1) {
    throw new Error('当前账号无权查看该工地')
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

// 关键施工节点（业主可见 + 已审核），取最近 5 条
async function getMilestones(projectId, tenantId) {
  const KEY_STAGES = [
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

  // 优先取关键节点
  const keyLogs = logs.filter((log) => KEY_STAGES.indexOf(log.stage) !== -1)
  const picked = keyLogs.length >= 3 ? keyLogs.slice(0, 5) : logs.slice(0, 5)

  const logIds = picked.map((log) => log._id)
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
    (log.photoFileIDs || []).forEach((fileID) => fileIDs.push(fileID))
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
      date: log.logDate || log.createdAt || '',
      status: log.reviewStatus === 'approved' ? '已通过' : (log.reviewStatus || ''),
      description: log.summary || log.content || '',
      photos: photos.slice(0, 3),
      photoCount: photos.length
    }
  })
}

// 完工照片：优先读 project.completionPhotoFileIDs，其次从竣工验收节点照片取
async function getCompletionPhotos(projectId, tenantId, project) {
  // 优先读交付时上传的完工照片
  if (Array.isArray(project.completionPhotoFileIDs) && project.completionPhotoFileIDs.length) {
    const tempUrlMap = await getTempUrlMap(project.completionPhotoFileIDs)
    return project.completionPhotoFileIDs.map((fileID) => tempUrlMap[fileID] || fileID).slice(0, 6)
  }

  // 回退：从竣工验收节点的照片里取
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

  const logIds = logs.map((log) => log._id)
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
    (log.photoFileIDs || []).forEach((fileID) => inlineFileIDs.push(fileID))
  })
  const recordFileIDs = photoRecords.map((p) => p.fileID || p.fileId || p.cloudFileId).filter(Boolean)
  const allFileIDs = [...inlineFileIDs, ...recordFileIDs]

  const tempUrlMap = await getTempUrlMap(allFileIDs)
  const urls = allFileIDs.map((fileID) => tempUrlMap[fileID] || fileID)
  return Array.from(new Set(urls)).slice(0, 6)
}

// 服务团队
async function getTeamInfo(project, projectId, tenantId) {
  const team = {
    designer: { name: project.designerName || '', phone: project.designerPhone || '', role: '设计师' },
    projectManager: { name: project.managerName || '', phone: project.managerPhone || '', role: '项目经理' },
    foreman: { name: project.foremanName || '', phone: project.foremanPhone || '', role: '工长' },
    customerService: { name: '', phone: '', role: '客服' }
  }

  // 从 project_members 补全
  try {
    const membersRes = await db.collection('project_members')
      .where({ projectId, tenantId: _.in([tenantId, '', null]) })
      .limit(20)
      .get()
    const members = membersRes.data || []
    members.forEach((m) => {
      const role = m.role || ''
      const name = m.name || m.userName || ''
      const phone = m.phone || m.userPhone || ''
      if (role === 'designer' && !team.designer.name) {
        team.designer.name = name
        team.designer.phone = phone
      } else if (role === 'project_manager' && !team.projectManager.name) {
        team.projectManager.name = name
        team.projectManager.phone = phone
      } else if ((role === 'worker' || role === 'foreman') && !team.foreman.name) {
        team.foreman.name = name
        team.foreman.phone = phone
      } else if (role === 'customer_service' && !team.customerService.name) {
        team.customerService.name = name
        team.customerService.phone = phone
      }
    })
  } catch (e) {
    // project_members 可能不存在，忽略
  }

  return team
}

// 设计图纸数量（业主可见效果图）
async function getDrawingCount(projectId, tenantId) {
  try {
    const res = await db.collection('design_drawings')
      .where({
        projectId,
        tenantId: _.in([tenantId, '', null]),
        type: 'render',
        ownerVisible: true
      })
      .count()
    return res.total || 0
  } catch (e) {
    return 0
  }
}

// 质保卡
async function getWarrantyCard(projectId, tenantId) {
  try {
    const res = await db.collection('warranty_cards')
      .where({ projectId, tenantId: _.in([tenantId, '', null]) })
      .limit(1)
      .get()
    return res.data[0] || null
  } catch (e) {
    return null
  }
}

// 施工节点总数
async function getStageLogCount(projectId, tenantId) {
  try {
    const res = await db.collection('stage_logs')
      .where({
        projectId,
        tenantId: _.in([tenantId, '', null]),
        reviewStatus: 'approved',
        ownerVisible: true
      })
      .count()
    return res.total || 0
  } catch (e) {
    return 0
  }
}

// 施工照片总数
async function getPhotoCount(projectId, tenantId) {
  try {
    const res = await db.collection('photos')
      .where({
        projectId,
        tenantId: _.in([tenantId, '', null]),
        ownerVisible: true
      })
      .count()
    return res.total || 0
  } catch (e) {
    return 0
  }
}

// 业主上传的补充资料统计
async function getOwnerSupplementStats(projectId, tenantId) {
  try {
    const res = await db.collection('owner_supplements')
      .where({
        projectId,
        tenantId: _.in([tenantId, '', null]),
        status: 'active'
      })
      .get()
    const records = res.data || []
    const counts = { hydro: 0, material: 0, completion: 0 }
    records.forEach((r) => {
      if (counts[r.category] !== undefined) counts[r.category] += 1
    })
    return counts
  } catch (e) {
    return { hydro: 0, material: 0, completion: 0 }
  }
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const projectId = String(event.projectId || '').trim()
    const project = await assertOwnerProject(openid, tenantId, projectId)

    // 并行查询所有数据源
    const [milestones, completionPhotos, team, drawingCount, warrantyCard, stageLogCount, photoCount, supplementStats] = await Promise.all([
      getMilestones(projectId, tenantId),
      getCompletionPhotos(projectId, tenantId, project),
      getTeamInfo(project, projectId, tenantId),
      getDrawingCount(projectId, tenantId),
      getWarrantyCard(projectId, tenantId),
      getStageLogCount(projectId, tenantId),
      getPhotoCount(projectId, tenantId),
      getOwnerSupplementStats(projectId, tenantId)
    ])

    // 房屋信息
    const houseInfo = {
      community: project.community || project.communityName || '',
      building: project.building || '',
      room: project.room || project.houseNo || '',
      address: project.address || '',
      area: project.area || '',
      layout: project.layout || '',
      style: project.style || '',
      decorateType: project.decorateType || '',
      startDate: project.startDate || '',
      completedAt: project.completedAt || '',
      deliveredAt: project.deliveredAt || ''
    }

    // 资料分类统计（业主上传的补充资料也算入 hasData）
    const sections = {
      houseInfo: !!(houseInfo.community || houseInfo.address),
      teamInfo: !!(team.designer.name || team.foreman.name || team.projectManager.name),
      designFiles: drawingCount > 0,
      hydroFiles: milestones.some((m) => m.stage && m.stage.indexOf('水电') !== -1) || supplementStats.hydro > 0,
      materialList: supplementStats.material > 0,
      acceptanceRecords: milestones.some((m) => m.stage && m.stage.indexOf('验收') !== -1),
      constructionPhotos: photoCount > 0,
      completionPhotos: completionPhotos.length > 0 || supplementStats.completion > 0
    }

    const archivedCount = Object.values(sections).filter(Boolean).length
    const totalCount = Object.keys(sections).length
    const missingCount = totalCount - archivedCount
    const completenessPercent = Math.round((archivedCount / totalCount) * 100)

    let archiveStatus = 'pending'
    let statusText = '档案待整理'
    if (archivedCount > 0 && missingCount > 0) {
      archiveStatus = 'organizing'
      statusText = '整理中'
    } else if (archivedCount === totalCount) {
      archiveStatus = 'completed'
      statusText = '已整理完成'
    }

    return {
      project,
      archive: {
        houseInfo,
        teamInfo: team,
        milestones,
        completionPhotos,
        sections,
        archivedCount,
        missingCount,
        totalCount,
        completenessPercent,
        archiveStatus,
        statusText,
        drawingCount,
        stageLogCount,
        photoCount,
        supplementStats,
        warrantyCard: warrantyCard ? {
          warrantyNo: warrantyCard.warrantyNo || '',
          warrantyStartAt: warrantyCard.warrantyStartAt || warrantyCard.startDate || '',
          warrantyEndAt: warrantyCard.warrantyEndAt || warrantyCard.endDate || '',
          servicePhone: warrantyCard.servicePhone || warrantyCard.contactPhone || ''
        } : null,
        lastUpdatedAt: project.updatedAt || project.deliveredAt || ''
      }
    }
  } catch (error) {
    return { error: { message: error.message || '获取装修档案失败' } }
  }
}
