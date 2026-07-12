const cloud = require('wx-server-sdk')
const { reviewStageLog } = require('./reviewService')

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

    const now = db.serverDate()

    return reviewStageLog({
      db,
      _,
      event,
      user,
      openid,
      tenantId,
      now,
      sendOwnerNotice: (projectId) => cloud.callFunction({
        name: 'sendOwnerNotice',
        data: {
          projectId,
          stageLogId
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
