const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'
const BOSS_ROLES = ['admin', 'boss_qi', 'boss_hu']

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

function toTime(value) {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  if (value.$date && value.$date.$numberLong) return Number(value.$date.$numberLong)
  if (value.$numberLong) return Number(value.$numberLong)
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function startOfChinaDay() {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  const china = new Date(utc + 8 * 60 * 60000)
  china.setHours(0, 0, 0, 0)
  return new Date(china.getTime() - 8 * 60 * 60000)
}

function formatDate(value) {
  const time = toTime(value)
  if (!time) return ''
  const date = new Date(time)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${month}月${day}日 ${hour}:${minute}`
}

function normalizeIssueText(value) {
  const text = String(value || '').trim().slice(0, 300)
  const compact = text.replace(/[，。！？；：,.!?;:\s]/g, '')
  const noIssueTexts = [
    '无',
    '无问题',
    '暂无问题',
    '没有问题',
    '无现场问题',
    '暂无现场问题',
    '没有现场问题',
    '无明显现场问题',
    '暂无明显现场问题',
    '没有明显现场问题',
    '暂未发现现场问题',
    '暂未发现明显现场问题',
    '未发现现场问题',
    '未发现明显现场问题',
    '无明显异常',
    '暂无明显异常',
    '没有明显异常',
    '现场验收合格'
  ]
  return noIssueTexts.indexOf(compact) !== -1 ? '' : text
}

function makeStaffRank(logs) {
  const map = {}
  logs.forEach((log) => {
    const key = log.submittedByOpenid || log.submittedByName || 'unknown'
    if (!map[key]) {
      map[key] = {
        openid: log.submittedByOpenid || '',
        name: log.submittedByName || '未命名员工',
        count: 0,
        approved: 0,
        pending: 0
      }
    }
    map[key].count += 1
    if (log.reviewStatus === 'approved') map[key].approved += 1
    if ((log.reviewStatus || 'pending') === 'pending') map[key].pending += 1
  })
  return Object.keys(map)
    .map((key) => map[key])
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
}

function makeRecentActivities(projects, logs, customers) {
  const activities = []
  logs.slice(0, 10).forEach((log) => {
    activities.push({
      activityId: `log-${log._id || toTime(log.createdAt || log.updatedAt)}`,
      type: '日报',
      title: `${log.projectName || '工地'}提交了${log.stage || '施工'}日报`,
      meta: `${log.submittedByName || '内部人员'} · ${formatDate(log.createdAt || log.updatedAt)}`,
      time: toTime(log.createdAt || log.updatedAt)
    })
  })
  customers.slice(0, 8).forEach((customer) => {
    activities.push({
      activityId: `customer-${customer._id || toTime(customer.updatedAt || customer.createdAt)}`,
      type: '客户',
      title: `${customer.name || '客户'}进入${customer.stage || '咨询'}阶段`,
      meta: `${customer.source || '客户库'} · ${formatDate(customer.updatedAt || customer.createdAt)}`,
      time: toTime(customer.updatedAt || customer.createdAt)
    })
  })
  projects.slice(0, 8).forEach((project) => {
    activities.push({
      activityId: `project-${project._id || toTime(project.updatedAt || project.createdAt)}`,
      type: '工地',
      title: `${project.name || '工地'}更新到${project.currentStage || '施工中'}`,
      meta: `${project.status || '施工中'} · ${formatDate(project.updatedAt || project.createdAt)}`,
      time: toTime(project.updatedAt || project.createdAt)
    })
  })
  return activities
    .filter((item) => item.time)
    .sort((a, b) => b.time - a.time)
    .slice(0, 8)
}

exports.main = async () => {
  try {
    const { user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    if (BOSS_ROLES.indexOf(user.role) === -1) {
      throw new Error('当前账号没有查看老板驾驶舱的权限')
    }

    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const todayStart = startOfChinaDay()
    const staleBefore = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

    const [projectsRes, pendingRes, logsRes, todayLogsRes, customersRes, newCustomersRes] = await Promise.all([
      db.collection('projects').where(tenantWhere(tenantId)).orderBy('updatedAt', 'desc').limit(200).get(),
      db.collection('stage_logs').where(tenantWhere(tenantId, { reviewStatus: 'pending' })).orderBy('createdAt', 'desc').limit(100).get(),
      db.collection('stage_logs').where(tenantWhere(tenantId)).orderBy('createdAt', 'desc').limit(200).get(),
      db.collection('stage_logs').where(tenantWhere(tenantId, { createdAt: _.gte(todayStart) })).orderBy('createdAt', 'desc').limit(100).get(),
      db.collection('customers').where(tenantWhere(tenantId, { deleted: _.neq(true) })).orderBy('updatedAt', 'desc').limit(200).get(),
      db.collection('customers').where(tenantWhere(tenantId, { deleted: _.neq(true), createdAt: _.gte(todayStart) })).orderBy('createdAt', 'desc').limit(100).get()
    ])

    const projects = projectsRes.data || []
    const logs = logsRes.data || []
    const customers = customersRes.data || []
    const pendingLogs = pendingRes.data || []
    const todayLogs = todayLogsRes.data || []
    const newCustomers = newCustomersRes.data || []

    const activeProjects = projects.filter((item) => (item.status || '施工中') === '施工中')
    const staleProjects = activeProjects
      .filter((item) => toTime(item.updatedAt || item.createdAt) < staleBefore.getTime())
      .slice(0, 10)
    const issueLogs = logs
      .map((item) => Object.assign({}, item, { issue: normalizeIssueText(item.issue) }))
      .filter((item) => item.issue)
      .slice(0, 10)
    const signedCustomers = customers.filter((item) => item.dealStatus === '已成交' || item.stage === '已签单')
    const conversionRate = customers.length ? Math.round((signedCustomers.length / customers.length) * 100) : 0

    return {
      dashboard: {
        tenantId,
        tenantName: user.tenantName || DEFAULT_TENANT_NAME,
        metrics: {
          projectCount: projects.length,
          activeProjectCount: activeProjects.length,
          pendingReviewCount: pendingLogs.length,
          todayUploadedCount: todayLogs.length,
          staleProjectCount: staleProjects.length,
          issueLogCount: issueLogs.length,
          newCustomerCount: newCustomers.length,
          signedCustomerCount: signedCustomers.length,
          conversionRate
        },
        alerts: staleProjects.map((project) => ({
          projectId: project._id,
          projectName: project.name || '未命名工地',
          reason: '超过 3 天未更新',
          lastUpdatedText: formatDate(project.updatedAt || project.createdAt)
        })),
        issueLogs: issueLogs.map((log) => ({
          logId: log._id,
          projectId: log.projectId,
          projectName: log.projectName || '未命名工地',
          issue: log.issue,
          stage: log.stage || '施工中',
          dateText: formatDate(log.createdAt || log.updatedAt)
        })),
        staffRank: makeStaffRank(logs),
        recentActivities: makeRecentActivities(projects, logs, customers)
      }
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '获取老板驾驶舱失败'
      }
    }
  }
}
