const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const INVITABLE_ROLES = ['worker', 'designer', 'sales', 'boss_qi', 'boss_hu']

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

exports.main = async (event) => {
  try {
    const code = String(event.code || '').replace(/\s/g, '').trim()
    if (!/^\d{6}$/.test(code)) throw new Error('请输入 6 位邀请码')

    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')

    // 查邀请码
    const codeRes = await db.collection('staff_invite_codes')
      .where({ code, status: 'active' })
      .limit(1)
      .get()
    const inviteCode = codeRes.data[0]
    if (!inviteCode) throw new Error('邀请码无效或已使用')

    if (inviteCode.expiresAt <= Date.now()) {
      await db.collection('staff_invite_codes').doc(inviteCode._id).update({
        data: { status: 'expired', updatedAt: db.serverDate() }
      })
      throw new Error('邀请码已过期，请联系管理员重新获取')
    }

    if (INVITABLE_ROLES.indexOf(inviteCode.role) === -1) {
      throw new Error('邀请码角色异常，请联系管理员')
    }

    // 已经是内部员工，不允许重复激活成更低权限角色（避免误操作降权）
    if (user.role && user.role !== 'owner' && user.role !== inviteCode.role) {
      throw new Error('你当前已是「' + (ROLE_LABELS[user.role] || user.role) + '」，如需变更角色请联系管理员')
    }
    if (user.role === inviteCode.role) {
      return {
        alreadyActivated: true,
        role: user.role,
        roleLabel: ROLE_LABELS[user.role] || user.role,
        message: '你已是该角色，无需重复激活'
      }
    }

    const now = db.serverDate()
    // 更新用户角色
    await db.collection('users').doc(user._id).update({
      data: {
        role: inviteCode.role,
        activatedAt: now,
        activatedByCode: code,
        updatedAt: now
      }
    })

    // 标记邀请码已使用
    await db.collection('staff_invite_codes').doc(inviteCode._id).update({
      data: {
        status: 'used',
        usedByOpenid: openid,
        usedByName: user.name || '',
        usedAt: now,
        updatedAt: now
      }
    })

    return {
      activated: true,
      role: inviteCode.role,
      roleLabel: ROLE_LABELS[inviteCode.role] || inviteCode.role,
      message: '角色激活成功，即将进入工作台'
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '激活内部员工角色失败'
      }
    }
  }
}
