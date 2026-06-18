const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

// 可以被邀请码激活的内部角色
const INVITABLE_ROLES = ['worker', 'designer', 'sales', 'boss_qi', 'boss_hu']
// 有权生成邀请码的管理角色
const MANAGE_ROLES = ['admin', 'boss_qi', 'boss_hu']
const CODE_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000

const ROLE_LABELS = {
  worker: '工长',
  designer: '设计师',
  sales: '销售',
  boss_qi: '老板（老齐）',
  boss_hu: '老板（老胡）'
}

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  return { openid: OPENID, user: res.data[0] || null }
}

function makeCode() {
  return String(crypto.randomInt(100000, 1000000))
}

async function makeUniqueCode() {
  for (let i = 0; i < 12; i += 1) {
    const code = makeCode()
    const existing = await db.collection('staff_invite_codes')
      .where({ code, status: 'active' })
      .limit(1)
      .get()
    if (!existing.data.length) return code
  }
  throw new Error('邀请码生成失败，请稍后再试')
}

exports.main = async (event) => {
  try {
    const role = String(event.role || '').trim()
    const remark = String(event.remark || '').trim().slice(0, 50)

    if (INVITABLE_ROLES.indexOf(role) === -1) {
      throw new Error('不支持的角色，可选：' + INVITABLE_ROLES.map((r) => ROLE_LABELS[r] || r).join(' / '))
    }

    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    if (MANAGE_ROLES.indexOf(user.role) === -1) {
      throw new Error('仅管理员可生成内部员工邀请码')
    }

    const now = Date.now()
    // 同一角色若有未过期的有效邀请码，直接复用返回
    const activeRes = await db.collection('staff_invite_codes')
      .where({ role, status: 'active', expiresAt: db.command.gt(now) })
      .orderBy('expiresAt', 'desc')
      .limit(1)
      .get()
    const activeCode = activeRes.data[0]
    if (activeCode) {
      return {
        code: activeCode.code,
        role,
        roleLabel: ROLE_LABELS[role] || role,
        remark: activeCode.remark || '',
        expiresAt: activeCode.expiresAt,
        createdAt: activeCode.createdAt
      }
    }

    const code = await makeUniqueCode()
    const expiresAt = now + CODE_EXPIRES_IN
    const addRes = await db.collection('staff_invite_codes').add({
      data: {
        code,
        role,
        roleLabel: ROLE_LABELS[role] || role,
        remark,
        status: 'active',
        expiresAt,
        createdByOpenid: openid,
        createdByName: user.name || '',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    })

    return {
      code,
      role,
      roleLabel: ROLE_LABELS[role] || role,
      remark,
      expiresAt,
      _id: addRes._id
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '生成内部员工邀请码失败'
      }
    }
  }
}
