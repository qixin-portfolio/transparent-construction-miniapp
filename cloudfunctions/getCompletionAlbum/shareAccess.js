const crypto = require('crypto')

function createError(code, message) {
  const error = new Error(message || code)
  error.code = code
  return error
}

function toTimestamp(value) {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  if (value.$date && value.$date.$numberLong) return Number(value.$date.$numberLong)
  if (value.$numberLong) return Number(value.$numberLong)
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function encode(value) {
  return Buffer.from(String(value)).toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function decode(value) {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - normalized.length % 4) % 4)
  return Buffer.from(normalized + padding, 'base64').toString('utf8')
}

function signatureFor({ authorizationId, projectId, expiresAt, salt, secret }) {
  return crypto.createHmac('sha256', secret)
    .update(`${authorizationId}:${projectId}:${expiresAt}:${salt}`)
    .digest('hex')
}

function createShareToken({ authorization, secret }) {
  if (!secret) throw createError('SHARE_SECRET_MISSING', '分享服务未配置')
  const expiresAt = toTimestamp(authorization.shareTokenExpiresAt)
  if (!authorization._id || !authorization.projectId || !authorization.shareTokenSalt || !expiresAt) {
    throw createError('SHARE_TOKEN_NOT_READY', '分享凭证尚未生成')
  }
  const signature = signatureFor({
    authorizationId: authorization._id,
    projectId: authorization.projectId,
    expiresAt,
    salt: authorization.shareTokenSalt,
    secret
  })
  return `${encode(authorization._id)}.${expiresAt}.${signature}`
}

function parseShareToken(token) {
  const parts = String(token || '').split('.')
  if (parts.length !== 3 || !parts[0] || !/^\d+$/.test(parts[1]) || !/^[a-f0-9]{64}$/.test(parts[2])) {
    throw createError('INVALID_SHARE_TOKEN', '分享链接无效')
  }
  return { authorizationId: decode(parts[0]), expiresAt: Number(parts[1]), signature: parts[2] }
}

function getAuthorizationIdFromToken(token) {
  return parseShareToken(token).authorizationId
}

function verifyShareToken({ token, authorization, projectId, secret, now = Date.now() }) {
  if (!secret) throw createError('SHARE_SECRET_MISSING', '分享服务未配置')
  if (!authorization || authorization.status !== 'approved' || authorization.authorizationScope !== 'public') {
    throw createError('SHARE_REVOKED', '分享已撤销')
  }
  if (authorization.projectId !== projectId) {
    throw createError('SHARE_PROJECT_MISMATCH', '分享链接与工地不匹配')
  }
  const parsed = parseShareToken(token)
  if (parsed.authorizationId !== authorization._id) {
    throw createError('INVALID_SHARE_TOKEN', '分享链接无效')
  }
  const storedExpiresAt = toTimestamp(authorization.shareTokenExpiresAt)
  if (!storedExpiresAt || parsed.expiresAt !== storedExpiresAt || storedExpiresAt <= now) {
    throw createError('SHARE_EXPIRED', '分享链接已过期')
  }
  const expected = signatureFor({
    authorizationId: authorization._id,
    projectId,
    expiresAt: storedExpiresAt,
    salt: authorization.shareTokenSalt,
    secret
  })
  const actualBuffer = Buffer.from(parsed.signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw createError('INVALID_SHARE_TOKEN', '分享链接无效')
  }
  return true
}

function evaluateAlbumAccess({ privateAccess, shareToken, authorization, projectId, secret, now }) {
  if (privateAccess) return { accessMode: 'private' }
  if (!shareToken || !authorization) throw createError('NOT_PUBLIC', '纪念册不存在或未公开')
  verifyShareToken({ token: shareToken, authorization, projectId, secret, now })
  return { accessMode: 'public_share' }
}

function buildAlbumTitle({ projectName, privateAccess, allowedMaterials = [] }) {
  const mayShowProjectName = privateAccess || allowedMaterials.indexOf('project_name') !== -1
  return mayShowProjectName && projectName
    ? `${projectName}完工纪念册`
    : '装修完工纪念册'
}

function buildSafeAlbumResponse({ project, privateAccess, allowedMaterials = [], authorization, shareToken = '' }) {
  const canShowHouseInfo = privateAccess || allowedMaterials.indexOf('house_info') !== -1
  return {
    project: {
      _id: project._id || '',
      name: canShowHouseInfo ? project.name || '' : '完工纪念册',
      status: project.status || '',
      statusCode: project.statusCode || ''
    },
    album: {
      title: buildAlbumTitle({ projectName: project.name, privateAccess, allowedMaterials })
    },
    authorization: authorization ? {
      authorizationScope: authorization.authorizationScope || '',
      allowedMaterials: Array.isArray(authorization.allowedMaterials) ? authorization.allowedMaterials : [],
      status: authorization.status || '',
      shareTokenExpiresAt: authorization.shareTokenExpiresAt || null,
      shareToken
    } : null
  }
}

module.exports = {
  buildAlbumTitle,
  buildSafeAlbumResponse,
  createShareToken,
  evaluateAlbumAccess,
  getAuthorizationIdFromToken,
  parseShareToken,
  toTimestamp,
  verifyShareToken
}
