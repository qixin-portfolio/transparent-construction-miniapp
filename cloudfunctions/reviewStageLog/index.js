const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const REVIEW_ROLES = ['admin', 'boss_qi', 'boss_hu']
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

function assertReviewRole(user) {
  if (!user || REVIEW_ROLES.indexOf(user.role) === -1) {
    throw new Error('当前账号没有审核日报的权限')
  }
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    assertReviewRole(user)
    const tenantId = user.tenantId || DEFAULT_TENANT_ID

    const stageLogId = String(event.stageLogId || '').trim()
    const action = String(event.action || '').trim()
    if (!stageLogId) throw new Error('缺少日报 ID')
    if (['approve', 'reject'].indexOf(action) === -1) throw new Error('审核动作不正确')

    const approved = action === 'approve'
    const rejectReason = String(event.rejectReason || event.comment || '').trim()
    const logRes = await db.collection('stage_logs').doc(stageLogId).get()
    const log = logRes.data
    if (log.tenantId && log.tenantId !== tenantId) throw new Error('无权审核该日报')
    const now = db.serverDate()

    await db.collection('stage_logs').doc(stageLogId).update({
      data: {
        reviewStatus: approved ? 'approved' : 'rejected',
        ownerVisible: approved,
        rejectReason: approved ? '' : rejectReason,
        auditComment: approved ? '' : rejectReason,
        reviewRecords: _.push({
          action,
          rejectReason,
          reviewedByOpenid: openid,
          reviewedByName: user.name || '',
          reviewedAt: now
        }),
        reviewedByOpenid: openid,
        reviewedByName: user.name || '',
        reviewedAt: now,
        updatedAt: now
      }
    })

    await db.collection('photos').where({ stageLogId, tenantId: _.in([tenantId, '', null]) }).update({
      data: {
        ownerVisible: approved,
        updatedAt: now
      }
    })

    if (approved && log.projectId) {
      const projectData = {
        currentStage: log.stage || '',
        updatedAt: now
      }
      if (Number(log.progress) > 0) {
        projectData.progress = Number(log.progress)
      }
      await db.collection('projects').doc(log.projectId).update({ data: projectData })

      // 发送订阅消息通知业主（不阻断审核流程，结果仍会记录日志）
      try {
        const noticeRes = await cloud.callFunction({
          name: 'sendOwnerNotice',
          data: {
            projectId: log.projectId,
            stageLogId
          }
        })
        if (noticeRes && noticeRes.result && !noticeRes.result.ok) {
          console.warn('[sendOwnerNotice 未成功通知业主]', JSON.stringify(noticeRes.result))
        }
      } catch (_) {
        // 通知发送失败不影响审核结果
      }
    }

    return {
      ok: true,
      ownerVisible: approved
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '审核日报失败'
      }
    }
  }
}
