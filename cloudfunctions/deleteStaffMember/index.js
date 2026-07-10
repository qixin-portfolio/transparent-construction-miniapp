const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'

function tenantMatches(resourceTenantId, tenantId) {
  return resourceTenantId ? resourceTenantId === tenantId : tenantId === DEFAULT_TENANT_ID
}
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
    if (user.role !== 'admin') throw new Error('仅管理员可删除内部员工')

    const memberId = String(event.memberId || '').trim()
    if (!memberId) throw new Error('缺少员工ID')

    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const memberRes = await db.collection('users').doc(memberId).get()
    const member = memberRes.data
    if (!member) throw new Error('员工不存在')
    if (!tenantMatches(member.tenantId, tenantId)) throw new Error('不能删除其他门店员工')
    if (member.openid === openid || member.role === 'admin') throw new Error('不能删除管理员账号')
    if (INTERNAL_ROLES.indexOf(member.role) === -1) throw new Error('该账号不是内部员工')

    const now = db.serverDate()
    await db.collection('users').doc(memberId).update({
      data: {
        role: 'owner',
        removedInternalRole: member.role || '',
        internalRemoved: true,
        internalRemovedAt: now,
        internalRemovedByOpenid: openid,
        internalRemovedBy: user._id || openid,
        updatedAt: now
      }
    })

    let removedProjectMembers = 0
    if (member.openid) {
      const removeRes = await db.collection('project_members')
        .where({
          userOpenid: member.openid,
          tenantId: tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId
        })
        .remove()
      removedProjectMembers = removeRes.stats ? removeRes.stats.removed : 0
    }

    return { deleted: true, removedProjectMembers }
  } catch (error) {
    return {
      error: {
        message: error.message || '删除内部员工失败'
      }
    }
  }
}
