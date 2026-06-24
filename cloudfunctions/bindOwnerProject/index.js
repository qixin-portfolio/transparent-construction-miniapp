const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const MAX_OWNERS = 2  // 一个工地最多绑定 2 个业主（夫妻场景）
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'
const INTERNAL_ROLES = ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales', 'project_manager', 'worker']

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

function normalizeProjectList(project, arrayKey, legacyKey) {
  const items = Array.isArray(project[arrayKey])
    ? project[arrayKey].filter(Boolean)
    : []
  if (!items.length && project[legacyKey]) {
    items.push(project[legacyKey])
  }
  return items
}

exports.main = async (event) => {
  try {
    const code = String(event.code || '').replace(/\s/g, '').trim()
    if (!/^\d{6}$/.test(code)) throw new Error('请输入 6 位绑定码')

    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    if (INTERNAL_ROLES.indexOf(user.role) !== -1) {
      throw new Error('请用业主本人微信绑定，内部员工不要使用业主绑定码')
    }

    const codeRes = await db.collection('owner_bind_codes')
      .where({ code, status: 'active' })
      .limit(1)
      .get()
    const bindCode = codeRes.data[0]
    if (!bindCode) throw new Error('绑定码无效或已使用')

    if (bindCode.expiresAt <= Date.now()) {
      await db.collection('owner_bind_codes').doc(bindCode._id).update({
        data: {
          status: 'expired',
          updatedAt: db.serverDate()
        }
      })
      throw new Error('绑定码已过期，请联系晟景装饰重新获取')
    }

    const projectRes = await db.collection('projects').doc(bindCode.projectId).get()
    const project = projectRes.data
    if (!project) throw new Error('绑定的工地不存在')
    const tenantId = bindCode.tenantId || project.tenantId || user.tenantId || DEFAULT_TENANT_ID
    const tenantName = bindCode.tenantName || project.tenantName || user.tenantName || DEFAULT_TENANT_NAME

    // ====== 多业主逻辑 ======
    // 兼容旧数据：ownerOpenid 单值 → 转成数组判断
    const existingOpenids = normalizeProjectList(project, 'ownerOpenids', 'ownerOpenid')

    // 已绑定过本人 → 幂等放行
    if (existingOpenids.indexOf(openid) !== -1) {
      const userPatch = {}
      if (user.role !== 'owner') userPatch.role = 'owner'
      if (!user.tenantId || user.tenantId !== tenantId) {
        userPatch.tenantId = tenantId
        userPatch.tenantName = tenantName
      }
      if (Object.keys(userPatch).length) {
        userPatch.updatedAt = db.serverDate()
        await db.collection('users').doc(user._id).update({ data: userPatch })
      }
      const nextUser = Object.assign({}, user, userPatch)
      delete nextUser.updatedAt
      return {
        project: Object.assign({}, project, {
          ownerOpenids: existingOpenids,
          ownerOpenid: openid  // 兼容旧字段
        }),
        user: nextUser
      }
    }

    // 已绑满 → 拒绝
    if (existingOpenids.length >= MAX_OWNERS) {
      throw new Error(`该工地已绑定 ${MAX_OWNERS} 位业主，如需更换请联系晟景装饰`)
    }

    // 追加新业主
    const newOpenids = existingOpenids.concat(openid)
    const newNames = normalizeProjectList(project, 'ownerNames', 'ownerName').concat(user.name || '')
    const newUserIds = normalizeProjectList(project, 'ownerUserIds', 'ownerUserId').concat(user._id || '')

    const now = db.serverDate()
    await db.collection('projects').doc(project._id).update({
      data: {
        ownerOpenids: newOpenids,        // 新字段：数组
        ownerNames: newNames,             // 新字段：数组
        ownerUserIds: newUserIds,         // 新字段：数组
        tenantId,
        tenantName,
        // 保留旧字段兼容（取第一个）
        ownerOpenid: existingOpenids[0] || openid,
        ownerName: newNames[0] || user.name || '',
        ownerUserId: newUserIds[0] || user._id || '',
        updatedAt: now
      }
    })

    await db.collection('owner_bind_codes').doc(bindCode._id).update({
      data: {
        status: 'used',
        usedByOpenid: openid,
        usedAt: now,
        updatedAt: now
      }
    })

    if (user.role !== 'owner' || !user.tenantId || user.tenantId !== tenantId) {
      await db.collection('users').doc(user._id).update({
        data: {
          role: 'owner',
          tenantId,
          tenantName,
          updatedAt: now
        }
      })
    }

    return {
      project: Object.assign({}, project, {
        ownerOpenids: newOpenids,
        ownerNames: newNames,
        ownerUserIds: newUserIds
      }),
      user: Object.assign({}, user, {
        role: 'owner',
        tenantId,
        tenantName
      })
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '绑定工地失败'
      }
    }
  }
}
