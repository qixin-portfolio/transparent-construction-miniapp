const { createOwnerNoticeSender } = require('./owner-notice')

const ALLOWED_ROLES = ['admin', 'boss_qi', 'boss_hu']
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'

function createError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function createSendOwnerNoticeService({ cloud, db, getCurrentUser, environment }) {
  const sender = createOwnerNoticeSender({ cloud, db, environment })
  return async function sendOwnerNotice(event = {}) {
    try {
      const { openid, user } = await getCurrentUser()
      if (!openid) throw createError('UNAUTHORIZED', '无法识别当前调用者')
      if (!user || ALLOWED_ROLES.indexOf(user.role) === -1) {
        throw createError('ROLE_NOT_ALLOWED', '当前账号无权发送业主通知')
      }
      const projectId = String(event.projectId || '').trim()
      const stageLogId = String(event.stageLogId || '').trim()
      if (!projectId) throw createError('PROJECT_REQUIRED', '缺少工地 ID')
      if (!stageLogId) throw createError('STAGE_LOG_REQUIRED', '缺少日报 ID')
      return sender({
        projectId,
        stageLogId,
        tenantId: user.tenantId || DEFAULT_TENANT_ID
      })
    } catch (error) {
      return {
        ok: false,
        errorCode: error.code || 'NOTICE_SEND_FAILED',
        reason: String(error.message || '通知发送失败').slice(0, 200)
      }
    }
  }
}

module.exports = {
  ALLOWED_ROLES,
  createSendOwnerNoticeService
}
