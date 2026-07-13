const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const ALLOWED_ROLES = ['admin', 'boss_qi', 'boss_hu']
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const SUBSCRIBE_TEMPLATE_ID = 'CSnZXzPW_Qe9Nor3NR7__Z0dHlQaItFPpb6X1-Sd4bY'

function createError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function tenantMatches(resourceTenantId, tenantId) {
  return resourceTenantId ? resourceTenantId === tenantId : tenantId === DEFAULT_TENANT_ID
}

async function getAllowedCaller() {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) throw createError('UNAUTHORIZED', '无法识别当前调用者')
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  const user = res.data[0] || null
  if (!user || ALLOWED_ROLES.indexOf(user.role) === -1) {
    throw createError('ROLE_NOT_ALLOWED', '当前账号无权发送业主通知')
  }
  return user
}

function formatDate(value) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

exports.main = async (event = {}) => {
  try {
    const user = await getAllowedCaller()
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const projectId = String(event.projectId || '').trim()
    const stageLogId = String(event.stageLogId || '').trim()
    if (!projectId) throw createError('PROJECT_REQUIRED', '缺少工地 ID')
    if (!stageLogId) throw createError('STAGE_LOG_REQUIRED', '缺少日报 ID')

    const projectRes = await db.collection('projects').doc(projectId).get()
    const project = projectRes.data || null
    if (!project) return { skipped: true, reason: 'project_not_found' }
    if (!tenantMatches(project.tenantId, tenantId)) {
      throw createError('TENANT_MISMATCH', '无权发送该工地通知')
    }

    const logRes = await db.collection('stage_logs').doc(stageLogId).get()
    const log = logRes.data || null
    if (!log || log.projectId !== projectId) {
      throw createError('STAGE_LOG_PROJECT_MISMATCH', '日报与工地不匹配')
    }
    if (!tenantMatches(log.tenantId, tenantId)) {
      throw createError('TENANT_MISMATCH', '无权发送该日报通知')
    }
    if (log.reviewStatus !== 'approved' || log.ownerVisible !== true) {
      throw createError('STAGE_LOG_NOT_APPROVED', '日报尚未审核通过，不能通知业主')
    }

    const ownerOpenids = Array.from(new Set(
      (Array.isArray(project.ownerOpenids) ? project.ownerOpenids : [project.ownerOpenid])
        .filter(Boolean)
    ))
    if (!ownerOpenids.length) return { skipped: true, reason: 'no_owner' }

    const results = []
    for (const ownerOpenid of ownerOpenids) {
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
            date4: { value: formatDate(Date.now()) }
          }
        })
        results.push(true)
      } catch (_) {
        results.push(false)
      }
    }

    const sentCount = results.filter(Boolean).length
    return {
      ok: sentCount === ownerOpenids.length,
      sentCount,
      totalCount: ownerOpenids.length
    }
  } catch (error) {
    return {
      ok: false,
      errorCode: error.code || 'NOTICE_SEND_FAILED',
      reason: String(error.message || '通知发送失败').slice(0, 200)
    }
  }
}
