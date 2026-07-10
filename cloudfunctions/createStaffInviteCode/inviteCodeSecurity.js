function createError(code, message) {
  const error = new Error(message || code)
  error.code = code
  return error
}

async function reserveStaffInviteCode({ runTransaction, code, invite }) {
  if (!/^\d{6}$/.test(String(code || ''))) {
    throw createError('INVALID_INVITE_CODE', '邀请码格式不正确')
  }
  return runTransaction(async (transaction) => {
    const [reservedById, existingByCode] = await Promise.all([
      transaction.getInviteById(code),
      transaction.findInviteByCode(code)
    ])
    if (reservedById || existingByCode) {
      throw createError('INVITE_CODE_COLLISION', '邀请码已存在')
    }
    await transaction.setInviteById(code, Object.assign({}, invite, { code }))
    return { _id: code, code }
  })
}

async function createUniqueStaffInvite({ makeCode, reserveCode, invite, maxAttempts = 12 }) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = makeCode()
    try {
      return await reserveCode(code, invite)
    } catch (error) {
      if (error.code !== 'INVITE_CODE_COLLISION') throw error
    }
  }
  throw createError('INVITE_CODE_GENERATION_FAILED', '邀请码生成失败，请稍后再试')
}

module.exports = {
  createUniqueStaffInvite,
  reserveStaffInviteCode
}
