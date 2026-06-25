const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const MANAGER_ROLES = ['admin', 'boss_qi', 'boss_hu']
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

function assertManager(user) {
  if (!user || MANAGER_ROLES.indexOf(user.role) === -1) {
    throw new Error('只有管理员可以解绑业主')
  }
}

/**
 * 从项目中移除一个已绑定业主
 *
 * @param {string} event.projectId     — 工地 ID
 * @param {string} event.ownerOpenid  — 要解绑的业主 openid
 */
exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    assertManager(user)

    const projectId = String(event.projectId || '').trim()
    const ownerOpenid = String(event.ownerOpenid || '').trim()
    if (!projectId) throw new Error('缺少工地 ID')
    if (!ownerOpenid) throw new Error('缺少要解绑的业主标识')

    const projectRes = await db.collection('projects').doc(projectId).get()
    const project = projectRes.data

    // 权限校验
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    if (project.tenantId && project.tenantId !== tenantId) {
      throw new Error('无权操作该工地')
    }

    const openids = Array.isArray(project.ownerOpenids) ? [...project.ownerOpenids] : []
    const names   = Array.isArray(project.ownerNames)   ? [...project.ownerNames]   : []
    const userIds = Array.isArray(project.ownerUserIds) ? [...project.ownerUserIds] : []

    const idx = openids.indexOf(ownerOpenid)
    if (idx === -1) {
      throw new Error('该业主未绑定到此工地，无法解绑')
    }

    // 不允许解绑最后一个（至少保留 0 个？或 1 个？这里允许全部解绑）
    const newOpenids = openids.filter((_, i) => i !== idx)
    const newNames   = names.filter((_, i) => i !== idx)
    const newUserIds = userIds.filter((_, i) => i !== idx)

    const now = db.serverDate()
    const patch = {
      ownerOpenids: newOpenids,
      ownerNames:   newNames,
      ownerUserIds: newUserIds,
      // 保留旧字段兼容
      ownerOpenid:  newOpenids[0] || '',
      ownerName:    newNames[0]   || '',
      ownerUserId:  newUserIds[0] || '',
      updatedAt:    now
    }

    await db.collection('projects').doc(projectId).update({ data: patch })

    // 尝试重置被解绑用户的角色为 owner → 保留 role 不变，
    // 但清除其对本项目的绑定状态即可

    return {
      ok: true,
      remaining: newOpenids.length,
      ownerOpenids: newOpenids,
      ownerNames:   newNames,
      ownerUserIds: newUserIds
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '解绑业主失败'
      }
    }
  }
}
