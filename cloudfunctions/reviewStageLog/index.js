const cloud = require('wx-server-sdk')
const { executeStageLogReview } = require('./reviewService')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const REVIEW_ROLES = ['admin', 'boss_qi', 'boss_hu']
const _ = db.command
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'
const SUBSCRIBE_TEMPLATE_ID = 'CSnZXzPW_Qe9Nor3NR7__Z0dHlQaItFPpb6X1-Sd4bY'

function tenantScope(tenantId) {
  return tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId
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

function assertReviewRole(user) {
  if (!user || REVIEW_ROLES.indexOf(user.role) === -1) {
    throw new Error('当前账号没有审核日报的权限')
  }
}

function formatNoticeDate(value) {
  const date = value instanceof Date ? value : new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function sendApprovedNotice(project, log) {
  const ownerOpenids = Array.isArray(project.ownerOpenids)
    ? project.ownerOpenids.filter(Boolean)
    : (project.ownerOpenid ? [project.ownerOpenid] : [])
  const uniqueOpenids = Array.from(new Set(ownerOpenids))
  if (!uniqueOpenids.length) return { sentCount: 0, totalCount: 0 }

  const results = []
  for (const ownerOpenid of uniqueOpenids) {
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: ownerOpenid,
        templateId: SUBSCRIBE_TEMPLATE_ID,
        page: 'subpackages/owner/pages/owner/owner',
        miniprogramState: 'formal',
        data: {
          thing1: { value: String(project.name || '工地').slice(0, 20) },
          phrase2: { value: String(log.stage || '进度更新').slice(0, 5) },
          thing3: { value: `${Number(log.progress || project.progress || 0)}%` },
          date4: { value: formatNoticeDate(new Date()) }
        }
      })
      results.push(true)
    } catch (error) {
      results.push(false)
    }
  }
  return { sentCount: results.filter(Boolean).length, totalCount: uniqueOpenids.length }
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    assertReviewRole(user)
    const tenantId = user.tenantId || DEFAULT_TENANT_ID

    const stageLogId = String(event.stageLogId || '').trim()
    const action = String(event.action || '').trim()
    if (!stageLogId) throw new Error('缺少日报 ID')
    const rejectReason = String(event.rejectReason || event.comment || '').trim()
    const now = db.serverDate()
    return await executeStageLogReview({
      stageLogId,
      action,
      tenantId,
      rejectReason,
      ownerSummary: String(event.ownerSummary || '').trim().slice(0, 200),
      reviewer: {
        userId: user._id || '',
        openid,
        name: user.name || '',
        role: user.role || ''
      },
      now,
      runTransaction: (work) => db.runTransaction(async (transaction) => work({
        getStageLog: async () => {
          const res = await transaction.collection('stage_logs').doc(stageLogId).get()
          return res.data || null
        },
        getProject: async (projectId) => {
          const res = await transaction.collection('projects').doc(projectId).get()
          return res.data || null
        },
        updateStageLog: (patch, reviewRecord) => transaction.collection('stage_logs').doc(stageLogId).update({
          data: Object.assign({}, patch, { reviewRecords: _.push(reviewRecord) })
        }),
        updatePhotos: (patch) => transaction.collection('photos')
          .where({ stageLogId, tenantId: tenantScope(tenantId) })
          .update({ data: patch }),
        updateProject: (projectId, patch) => transaction.collection('projects').doc(projectId).update({ data: patch })
      })),
      sendNotice: sendApprovedNotice,
      updateNoticeStatus: (noticeStatus, noticeError) => db.collection('stage_logs').doc(stageLogId).update({
        data: {
          noticeStatus,
          noticeError,
          noticeUpdatedAt: db.serverDate()
        }
      })
    })
  } catch (error) {
    return {
      error: {
        code: error.code || '',
        message: error.message || '审核日报失败'
      }
    }
  }
}
