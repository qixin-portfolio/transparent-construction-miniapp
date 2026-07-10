const crypto = require('crypto')

const INVITABLE_ROLES = ['worker', 'project_manager', 'designer', 'sales']
const MAX_CODE_ATTEMPTS = 5
const CODE_LOCK_MS = 15 * 60 * 1000

function createError(code, message) {
  const error = new Error(message || code)
  error.code = code
  return error
}

function assertInvitableRole(role) {
  if (INVITABLE_ROLES.indexOf(role) === -1) {
    throw createError('ROLE_NOT_INVITABLE', '邀请码角色不允许')
  }
  return role
}

function createInviteAttemptKey(openid, code) {
  return `staff_${crypto.createHash('sha256').update(`${openid}:${code}`).digest('hex').slice(0, 40)}`
}

function assertAttemptAllowed(attempt, now) {
  if (attempt && Number(attempt.lockedUntil || 0) > now) {
    throw createError('RATE_LIMITED', '邀请码尝试次数过多，请稍后再试')
  }
}

function toTimestamp(value) {
  if (value instanceof Date) return value.getTime()
  if (value && value.$date && value.$date.$numberLong) return Number(value.$date.$numberLong)
  if (value && value.$numberLong) return Number(value.$numberLong)
  if (typeof value === 'number') return value
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

async function recordFailedInviteAttempt({ runTransaction, attemptKey, now }) {
  return runTransaction(async (transaction) => {
    const current = await transaction.getAttempt(attemptKey)
    assertAttemptAllowed(current, now)
    const failedAttempts = Number(current && current.failedAttempts || 0) + 1
    const next = {
      failedAttempts,
      lockedUntil: failedAttempts >= MAX_CODE_ATTEMPTS ? now + CODE_LOCK_MS : 0,
      updatedAt: now
    }
    await transaction.setAttempt(next)
    return next
  })
}

async function redeemStaffInvite({ runTransaction, inviteId, code, openid, userId, now }) {
  return runTransaction(async (transaction) => {
    const invite = await transaction.getInvite(inviteId)
    if (!invite || invite.code !== code || invite.status !== 'active') {
      throw createError('INVITE_NOT_ACTIVE', '邀请码无效、已使用或已撤销')
    }
    if (toTimestamp(invite.expiresAt) <= now) {
      throw createError('INVITE_EXPIRED', '邀请码已过期')
    }
    assertInvitableRole(invite.role)
    if (!invite.tenantId) throw createError('INVITE_TENANT_MISSING', '邀请码未绑定企业')

    await transaction.updateUser(userId, {
      role: invite.role,
      tenantId: invite.tenantId,
      tenantName: invite.tenantName || '',
      activatedAt: now,
      activatedByCode: code,
      updatedAt: now
    })
    await transaction.updateInvite({
      status: 'used',
      usedByOpenid: openid,
      usedAt: now,
      updatedAt: now
    })
    await transaction.clearAttempt()
    return {
      role: invite.role,
      tenantId: invite.tenantId,
      tenantName: invite.tenantName || ''
    }
  })
}

module.exports = {
  CODE_LOCK_MS,
  INVITABLE_ROLES,
  MAX_CODE_ATTEMPTS,
  assertAttemptAllowed,
  assertInvitableRole,
  createInviteAttemptKey,
  recordFailedInviteAttempt,
  redeemStaffInvite,
  toTimestamp
}
