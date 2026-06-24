const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'
const INTERNAL_ROLES = ['boss_qi', 'boss_hu', 'designer', 'sales', 'project_manager', 'worker']

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

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    if (user.role !== 'admin') throw new Error('仅管理员可修改员工备注')

    const memberId = String(event.memberId || '').trim()
    const staffRemark = String(event.staffRemark || '').trim().slice(0, 50)
    if (!memberId) throw new Error('缺少员工ID')

    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const memberRes = await db.collection('users').doc(memberId).get()
    const member = memberRes.data
    if (!member) throw new Error('员工不存在')
    if (member.tenantId && member.tenantId !== tenantId) throw new Error('不能修改其他门店员工')
    if (member.openid === openid || member.role === 'admin') throw new Error('不能修改管理员账号备注')
    if (INTERNAL_ROLES.indexOf(member.role) === -1) throw new Error('该账号不是内部员工')

    await db.collection('users').doc(memberId).update({
      data: {
        staffRemark,
        updatedByOpenid: openid,
        updatedBy: user._id || openid,
        updatedAt: db.serverDate()
      }
    })

    return { updated: true, staffRemark }
  } catch (error) {
    return {
      error: {
        message: error.message || '修改员工备注失败'
      }
    }
  }
}
