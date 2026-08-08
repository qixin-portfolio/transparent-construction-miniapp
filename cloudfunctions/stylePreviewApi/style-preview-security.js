const LEGACY_DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const IMAGE_MIME_BY_EXTENSION = Object.freeze({
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp'
})

function codedError(code) {
  const error = new Error(code)
  error.code = code
  return error
}

function normalizedId(value) {
  return String(value === undefined || value === null ? '' : value).trim()
}

function isCustomerTenantAllowed(actorTenantId, customerTenantId) {
  const actorTenant = normalizedId(actorTenantId)
  const customerTenant = normalizedId(customerTenantId)
  if (customerTenant) return customerTenant === actorTenant
  return actorTenant === LEGACY_DEFAULT_TENANT_ID
}

function customerTenantScope(actorTenantId) {
  const actorTenant = normalizedId(actorTenantId)
  return actorTenant === LEGACY_DEFAULT_TENANT_ID
    ? [LEGACY_DEFAULT_TENANT_ID, '', null]
    : [actorTenant]
}

function filterCustomersForTenant(actorTenantId, customers) {
  return (Array.isArray(customers) ? customers : []).filter((customer) => (
    isCustomerTenantAllowed(actorTenantId, customer && customer.tenantId)
  ))
}

function validateStylePreviewFileId({ fileId, tenantId, customerId, sessionId, kind }) {
  const id = normalizedId(fileId)
  const expectedTenant = normalizedId(tenantId)
  const expectedCustomer = normalizedId(customerId)
  const expectedSession = normalizedId(sessionId)
  const expectedKind = normalizedId(kind)
  const match = /^cloud:\/\/([^/]+)\/(.+)$/.exec(id)
  if (!match || !expectedTenant || !expectedCustomer || !expectedSession || ['source', 'reference'].indexOf(expectedKind) === -1) {
    throw codedError('INVALID_IMAGE')
  }

  const path = match[2]
  const segments = path.split('/')
  if (
    /[\\\0]/.test(path) ||
    segments.length !== 6 ||
    segments.some((segment) => !segment || segment === '.' || segment === '..') ||
    segments[0] !== 'style-preview' ||
    segments[1] !== expectedTenant ||
    segments[2] !== expectedCustomer ||
    segments[3] !== expectedSession ||
    segments[4] !== expectedKind
  ) throw codedError('INVALID_IMAGE')

  const fileName = segments[5]
  const extensionMatch = /^original\.(jpg|jpeg|png|webp)$/.exec(fileName)
  if (!extensionMatch) throw codedError('INVALID_IMAGE')
  const extension = extensionMatch[1]
  return { fileId: id, extension, mimeType: IMAGE_MIME_BY_EXTENSION[extension] }
}

function imageInfo(buffer) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw codedError('INVALID_IMAGE')
  if (buffer.length > MAX_IMAGE_BYTES) throw codedError('IMAGE_TOO_LARGE')
  if (buffer.length >= 24 && buffer.toString('ascii', 1, 4) === 'PNG') {
    return { mimeType: 'image/png', width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
  }
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return { mimeType: 'image/webp', width: 0, height: 0 }
  }
  if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', width: 0, height: 0 }
  }
  throw codedError('UNSUPPORTED_IMAGE_TYPE')
}

function assertImageExtensionMatchesMime(fileValidation, actualMimeType) {
  if (!fileValidation || fileValidation.mimeType !== actualMimeType) throw codedError('INVALID_IMAGE')
  return true
}

module.exports = {
  IMAGE_MIME_BY_EXTENSION,
  LEGACY_DEFAULT_TENANT_ID,
  MAX_IMAGE_BYTES,
  assertImageExtensionMatchesMime,
  customerTenantScope,
  filterCustomersForTenant,
  imageInfo,
  isCustomerTenantAllowed,
  validateStylePreviewFileId
}
