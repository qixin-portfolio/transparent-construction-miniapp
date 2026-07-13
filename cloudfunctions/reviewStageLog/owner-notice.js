// GENERATED FILE - DO NOT EDIT. Source: shared/
const { DEFAULT_TENANT_ID, tenantMatches } = require('./stage-flow')

const SUBSCRIBE_TEMPLATE_ID = 'CSnZXzPW_Qe9Nor3NR7__Z0dHlQaItFPpb6X1-Sd4bY'

function formatDate(value) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function createOwnerNoticeSender({ cloud, db }) {
  return async function sendOwnerNotice({ projectId, stageLogId, tenantId }) {
    const projectRes = await db.collection('projects').doc(projectId).get()
    const project = projectRes.data || null
    if (!project) return { skipped: true, reason: 'project_not_found' }
    if (!tenantMatches(project.tenantId, tenantId)) {
      return { ok: false, errorCode: 'TENANT_MISMATCH', reason: 'project_tenant_mismatch' }
    }

    const logRes = await db.collection('stage_logs').doc(stageLogId).get()
    const log = logRes.data || null
    if (!log || log.projectId !== projectId || !tenantMatches(log.tenantId, tenantId)) {
      return { ok: false, errorCode: 'STAGE_LOG_PROJECT_MISMATCH', reason: 'stage_log_project_mismatch' }
    }
    if (log.reviewStatus !== 'approved' || log.ownerVisible !== true) {
      return { ok: false, errorCode: 'STAGE_LOG_NOT_APPROVED', reason: 'stage_log_not_approved' }
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
  }
}

module.exports = {
  createOwnerNoticeSender
}
