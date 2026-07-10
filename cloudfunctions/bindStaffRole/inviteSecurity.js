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

function createInviteCallerAttemptKey(openid) {
  return `staff_caller_${crypto.createHash('sha256').update(String(openid)).digest('hex').slice(0, 40)}`
}

function createInviteAttemptKeys(openid, code) {
  return [createInviteCallerAttemptKey(openid), createInviteAttemptKey(openid, code)]
}

function assertAttemptAllowed(attempt, now) {
  if (attempt && Number(attempt.lockedUntil || 0) > now) {
    throw createError('RATE_LIMITED', '邀请码尝试次数过多，请稍后再试')
  }
}

function assertAttemptsAllowed(attempts, now) {
  ;(attempts || []).forEach((attempt) => assertAttemptAllowed(attempt, now))
}

function toTimestamp(value) {
  if (value instanceof Date) return value.getTime()
  if (value && value.$date && value.$date.$numberLong) return Number(value.$date.$numberLong)
  if (value && value.$numberLong) return Number(value.$numberLong)
  if (typeof value === 'number') return value
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

async function recordFailedInviteAttempt({ runTransaction, attemptKeys, now }) {
  const keys = Array.from(new Set((attemptKeys || []).filter(Boolean)))
  if (!keys.length) throw createError('ATTEMPT_KEYS_MISSING', '邀请码限流键缺失')
  return runTransaction(async (transaction) => {
    const currentAttempts = []
    for (const key of keys) {
      currentAttempts.push(await transaction.getAttempt(key))
    }
    assertAttemptsAllowed(currentAttempts, now)

    const nextAttempts = {}
    for (let index = 0; index < keys.length; index += 1) {
      const failedAttempts = Number(currentAttempts[index] && currentAttempts[index].failedAttempts || 0) + 1
      const next = {
        failedAttempts,
        lockedUntil: failedAttempts >= MAX_CODE_ATTEMPTS ? now + CODE_LOCK_MS : 0,
        updatedAt: now
      }
      await transaction.setAttempt(keys[index], next)
      nextAttempts[keys[index]] = next
    }
    return nextAttempts
  })
}

async function redeemStaffInvite({ runTransaction, inviteId, code, openid, userId, now, attemptKeys = [] }) {
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
    await transaction.clearAttempts(attemptKeys)
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
  assertAttemptsAllowed,
  assertInvitableRole,
  createInviteAttemptKeys,
  createInviteAttemptKey,
  createInviteCallerAttemptKey,
  recordFailedInviteAttempt,
  redeemStaffInvite,
  toTimestamp
}
