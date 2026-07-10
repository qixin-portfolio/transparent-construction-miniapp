const test = require('node:test')
const assert = require('node:assert/strict')

const { buildPublicCaseDto } = require('../../cloudfunctions/listPublicCases/publicCaseDto')

const project = {
  _id: 'project-1',
  tenantId: 'tenant-a',
  ownerOpenid: 'owner-secret',
  community: '万硕花园',
  area: 128,
  layout: '三室两厅',
  style: '现代',
  contractAmount: 188000,
  budgetRange: '15-20 万',
  planType: '高端套餐',
  designHighlights: ['全屋定制'],
  deliveredAt: '2026-07-01'
}

function dto(allowedMaterials) {
  return buildPublicCaseDto({
    authorization: { _id: 'auth-1', allowedMaterials },
    project,
    completionPhotos: ['https://example.test/photo.jpg'],
    regionName: '交城本地'
  })
}

test('public cases omit sensitive fields without authorization', () => {
  const result = dto([])
  assert.equal('communityName' in result, false)
  assert.equal('exactPrice' in result, false)
  assert.equal('planType' in result, false)
  assert.equal('designHighlights' in result, false)
  assert.equal('deliveredAt' in result, false)
})

test('public cases with house authorization do not expose budget', () => {
  const result = dto(['house_info'])
  assert.equal(result.communityName, '万硕花园')
  assert.equal('exactPrice' in result, false)
})

test('public cases with budget authorization do not expose community', () => {
  const result = dto(['budget'])
  assert.equal(result.exactPrice, 188000)
  assert.equal('communityName' in result, false)
})

test('public cases omit fields without a defined authorization bit', () => {
  const result = dto(['house_info', 'budget', 'completion_photos'])
  assert.equal('planType' in result, false)
  assert.equal('designHighlights' in result, false)
  assert.equal('deliveredAt' in result, false)
})

test('public cases never return openid or tenant internals', () => {
  const json = JSON.stringify(dto(['house_info', 'budget']))
  assert.equal(json.includes('openid'), false)
  assert.equal(json.includes('tenantId'), false)
})
