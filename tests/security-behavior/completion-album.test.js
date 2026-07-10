const test = require('node:test')
const assert = require('node:assert/strict')

const {
  createShareToken,
  evaluateAlbumAccess,
  buildAlbumTitle,
  buildSafeAlbumResponse
} = require('../../cloudfunctions/getCompletionAlbum/shareAccess')

const SECRET = 'test-only-completion-secret-with-enough-length'
const NOW = Date.parse('2026-07-10T10:00:00.000Z')

function authorization(overrides = {}) {
  return Object.assign({
    _id: 'auth-1',
    projectId: 'project-1',
    tenantId: 'tenant-a',
    authorizationScope: 'public',
    status: 'approved',
    allowedMaterials: ['completion_photos'],
    shareTokenSalt: 'random-salt-value',
    shareTokenExpiresAt: new Date(NOW + 60_000)
  }, overrides)
}

function token(auth = authorization()) {
  return createShareToken({ authorization: auth, secret: SECRET })
}

test('completion album rejects anonymous access without a token', () => {
  assert.throws(() => evaluateAlbumAccess({ privateAccess: false, shareToken: '', authorization: null, projectId: 'project-1', secret: SECRET, now: NOW }), (error) => error.code === 'NOT_PUBLIC')
})

test('completion album rejects an invalid token', () => {
  assert.throws(() => evaluateAlbumAccess({ privateAccess: false, shareToken: 'invalid', authorization: authorization(), projectId: 'project-1', secret: SECRET, now: NOW }), (error) => error.code === 'INVALID_SHARE_TOKEN')
})

test('completion album fails closed when the server secret is missing', () => {
  const auth = authorization()
  assert.throws(() => evaluateAlbumAccess({ privateAccess: false, shareToken: token(auth), authorization: auth, projectId: 'project-1', secret: '', now: NOW }), (error) => error.code === 'SHARE_SECRET_MISSING')
})

test('completion album rejects a revoked token', () => {
  const auth = authorization({ status: 'revoked' })
  assert.throws(() => evaluateAlbumAccess({ privateAccess: false, shareToken: token(auth), authorization: auth, projectId: 'project-1', secret: SECRET, now: NOW }), (error) => error.code === 'SHARE_REVOKED')
})

test('completion album rejects an expired token', () => {
  const auth = authorization({ shareTokenExpiresAt: new Date(NOW - 1) })
  assert.throws(() => evaluateAlbumAccess({ privateAccess: false, shareToken: token(auth), authorization: auth, projectId: 'project-1', secret: SECRET, now: NOW }), (error) => error.code === 'SHARE_EXPIRED')
})

test('completion album token can access only its bound project', () => {
  const auth = authorization()
  assert.throws(() => evaluateAlbumAccess({ privateAccess: false, shareToken: token(auth), authorization: auth, projectId: 'project-2', secret: SECRET, now: NOW }), (error) => error.code === 'SHARE_PROJECT_MISMATCH')
})

test('completion album allows the authenticated owner without a token', () => {
  const result = evaluateAlbumAccess({ privateAccess: true, shareToken: '', authorization: null, projectId: 'project-1', secret: '', now: NOW })
  assert.equal(result.accessMode, 'private')
})

test('completion album public title does not contain project or community names', () => {
  assert.equal(buildAlbumTitle({ projectName: '万硕花园 3 号楼', privateAccess: false, allowedMaterials: [] }), '装修完工纪念册')
})

test('completion album shows a project name only with explicit authorization', () => {
  assert.equal(buildAlbumTitle({ projectName: '万硕花园 3 号楼', privateAccess: false, allowedMaterials: ['project_name'] }), '万硕花园 3 号楼完工纪念册')
})

test('completion album response omits owner and raw authorization fields', () => {
  const result = buildSafeAlbumResponse({
    project: { _id: 'project-1', name: '项目名', ownerOpenid: 'secret', ownerOpenids: ['secret'], tenantId: 'tenant-a' },
    privateAccess: false,
    allowedMaterials: [],
    authorization: authorization({ ownerOpenid: 'secret' }),
    shareToken: token()
  })
  const json = JSON.stringify(result)
  assert.equal(json.includes('ownerOpenid'), false)
  assert.equal(json.includes('tenantId'), false)
  assert.equal(json.includes('shareTokenSalt'), false)
})
