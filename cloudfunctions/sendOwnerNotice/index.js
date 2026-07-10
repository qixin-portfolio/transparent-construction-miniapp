const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const ALLOWED_ROLES = ['admin', 'boss_qi', 'boss_hu']
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'

function tenantMatches(resourceTenantId, tenantId) {
  return resourceTenantId ? resourceTenantId === tenantId : tenantId === DEFAULT_TENANT_ID
}

// ⚠️ 替换为你在 mp 后台创建的订阅消息模板 ID
const SUBSCRIBE_TEMPLATE_ID = 'CSnZXzPW_Qe9Nor3NR7__Z0dHlQaItFPpb6X1-Sd4bY'

async function getAllowedCaller() {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) throw new Error('无法识别当前调用者')
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  const user = res.data[0] || null
  if (!user || ALLOWED_ROLES.indexOf(user.role) === -1) {
    throw new Error('当前账号无权发送业主通知')
  }
  return user
}

function assertStageLogProject(log, projectId, tenantId) {
  if (!log || log.projectId !== projectId) {
    const error = new Error('日报与工地不匹配')
    error.code = 'STAGE_LOG_PROJECT_MISMATCH'
    throw error
  }
  if (!tenantMatches(log.tenantId, tenantId)) throw new Error('无权发送该日报通知')
  if (log.reviewStatus !== 'approved' || log.ownerVisible !== true) {
    throw new Error('日报尚未审核通过，不能通知业主')
  }
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function fmtDate(ts) {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 向业主发送「施工进度更新」订阅消息
 *
 * @param {string} event.projectId   - 工地 ID
 * @param {string} event.stageLogId  - 日报 ID
 */
exports.main = async (event = {}) => {
  try {
    const user = await getAllowedCaller()
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const projectId = String(event.projectId || '').trim()
    const stageLogId = String(event.stageLogId || '').trim()

    if (!projectId) throw new Error('缺少工地 ID')
    if (!stageLogId) throw new Error('缺少日报 ID')

    // 1. 查询工地信息，获取业主 openid
    let project
    try {
      const projectRes = await db.collection('projects').doc(projectId).get()
      project = projectRes.data
    } catch (_) {
      return { skipped: true, reason: 'project_not_found' }
    }

    if (!project) {
      return { skipped: true, reason: 'no_owner' }
    }
    if (!tenantMatches(project.tenantId, tenantId)) {
      throw new Error('无权发送该工地通知')
    }

    // 兼容新旧字段：优先用 ownerOpenids 数组，回退到 ownerOpenid 单值
    const ownerOpenids = project.ownerOpenids || (project.ownerOpenid ? [project.ownerOpenid] : [])
    if (!ownerOpenids.length) {
      return { skipped: true, reason: 'no_owner' }
    }

    // 2. 查询日报详情
    let stage = '施工进度更新'
    let progress = 0
    let workContent = ''

    const logRes = await db.collection('stage_logs').doc(stageLogId).get()
    const log = logRes.data || null
    assertStageLogProject(log, projectId, tenantId)
    stage = (log.stage || stage).slice(0, 5)
    progress = Number(log.progress) || 0
    workContent = (log.workContent || '').slice(0, 50)

    // 3. 向所有业主发送订阅消息（夫妻都收到）
    const projectName = (project.name || '工地').slice(0, 20)
    const sendResults = []

    for (const ownerOpenid of ownerOpenids) {
      try {
        const result = await cloud.openapi.subscribeMessage.send({
          touser: ownerOpenid,
          templateId: SUBSCRIBE_TEMPLATE_ID,
          page: 'subpackages/owner/pages/owner/owner',
          miniprogramState: 'formal',
          data: {
            thing1: { value: projectName },
            phrase2: { value: stage },
            thing3: { value: `${progress}%` },
            date4: { value: fmtDate(Date.now()) }
          }
        })
        sendResults.push({ openid: ownerOpenid.slice(0, 8) + '***', ok: true })
      } catch (err) {
        sendResults.push({ openid: ownerOpenid.slice(0, 8) + '***', ok: false, errCode: err.errCode || 0 })
      }
    }

    return {
      ok: true,
      sentCount: sendResults.filter(r => r.ok).length,
      totalCount: ownerOpenids.length,
      results: sendResults,
      stage
    }
  } catch (error) {
    // 常见错误码：
    // 43101 — 用户未订阅 / 拒绝接收
    // 47003 — 模板参数不正确
    // 40037 — 模板 ID 不正确
    const errCode = error.errCode || 0
    const reasonMap = {
      43101: 'user_not_subscribed',
      47003: 'template_param_error',
      40037: 'invalid_template_id'
    }

    return {
      skipped: true,
      reason: reasonMap[errCode] || error.message || 'send_failed',
      errCode
    }
  }
}
