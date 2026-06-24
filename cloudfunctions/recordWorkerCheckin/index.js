const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'

function tenantWhere(tenantId, extra = {}) {
  return Object.assign({}, extra, {
    tenantId: _.in([tenantId || DEFAULT_TENANT_ID, '', null])
  })
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

async function getBoundProject(openid, tenantId, projectId) {
  const memberRes = await db.collection('project_members')
    .where(tenantWhere(tenantId, { userOpenid: openid }))
    .limit(20)
    .get()
  const members = memberRes.data || []
  const boundIds = members.map((item) => item.projectId).filter(Boolean)
  const targetProjectId = projectId || boundIds[0] || ''
  if (!targetProjectId || boundIds.indexOf(targetProjectId) === -1) {
    throw new Error('当前工长还未绑定工地，不能打卡')
  }

  const projectRes = await db.collection('projects').doc(targetProjectId).get()
  const project = projectRes.data || null
  if (!project) throw new Error('绑定工地不存在')
  if (project.tenantId && project.tenantId !== tenantId) {
    throw new Error('当前账号无权在该工地打卡')
  }
  return project
}

function getChinaDayRange(date = new Date()) {
  const dayMs = 24 * 60 * 60 * 1000
  const chinaOffsetMs = 8 * 60 * 60 * 1000
  const chinaDate = new Date(date.getTime() + chinaOffsetMs)
  const startTime = Date.UTC(
    chinaDate.getUTCFullYear(),
    chinaDate.getUTCMonth(),
    chinaDate.getUTCDate()
  ) - chinaOffsetMs
  return {
    start: new Date(startTime),
    end: new Date(startTime + dayMs)
  }
}

async function findTodayCheckin(openid, tenantId, projectId) {
  const range = getChinaDayRange()
  const res = await db.collection('activity_logs')
    .where({
      tenantId: _.in([tenantId, '', null]),
      type: 'worker_checkin',
      projectId,
      userOpenid: openid,
      createdAt: _.gte(range.start)
    })
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get()
  return (res.data || []).find((item) => {
    const time = new Date(item.createdAt || 0).getTime()
    return time >= range.start.getTime() && time < range.end.getTime()
  }) || null
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    if (['worker', 'project_manager'].indexOf(user.role) === -1) throw new Error('仅工长或项目经理可以使用到场打卡')

    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const tenantName = user.tenantName || DEFAULT_TENANT_NAME
    const projectId = String(event.projectId || '').trim()
    const project = await getBoundProject(openid, tenantId, projectId)
    const todayCheckin = await findTodayCheckin(openid, tenantId, project._id)
    if (todayCheckin) {
      return {
        id: todayCheckin._id,
        item: todayCheckin,
        alreadyChecked: true
      }
    }
    const now = db.serverDate()

    const data = {
      tenantId,
      tenantName,
      type: 'worker_checkin',
      title: user.role === 'project_manager' ? '项目经理到场打卡' : '工长到场打卡',
      projectId: project._id,
      projectName: project.name || '',
      userOpenid: openid,
      userId: user._id || '',
      userName: user.name || '',
      userRole: user.role,
      note: String(event.note || '').trim().slice(0, 120),
      createdAt: now,
      updatedAt: now
    }

    const res = await db.collection('activity_logs').add({ data })
    return {
      id: res._id,
      item: Object.assign({ _id: res._id }, data),
      alreadyChecked: false
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '工长打卡失败'
      }
    }
  }
}
