const fs = require('fs')
const path = require('path')
const test = require('node:test')
const assert = require('node:assert/strict')

const ROOT = path.resolve(__dirname, '..')

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

test('sensitive notification and seed functions authenticate callers', () => {
  const files = [
    'cloudfunctions/sendWecomNotice/index.js',
    'cloudfunctions/sendOwnerNotice/index.js',
    'cloudfunctions/dailySummary/index.js',
    'cloudfunctions/seedCustomerBenefits/index.js'
  ]

  files.forEach((file) => {
    const source = read(file)
    assert.match(source, /cloud\.getWXContext\(\)/, `${file} must identify the caller`)
    assert.match(source, /ALLOWED_ROLES|ADMIN_ROLES/, `${file} must enforce an explicit role allowlist`)
  })
})

test('owner notifications validate the stage log and target the formal mini program', () => {
  const source = read('cloudfunctions/sendOwnerNotice/index.js')
  assert.match(source, /assertStageLogProject|STAGE_LOG_PROJECT_MISMATCH/)
  assert.match(source, /miniprogramState:\s*'formal'/)
})

test('completion album requires owner access or a revocable public share token', () => {
  const source = read('cloudfunctions/getCompletionAlbum/index.js')
  assert.match(source, /cloud\.getWXContext\(\)/)
  assert.match(source, /shareToken/)
  assert.match(source, /authorizationScope\s*!==\s*'public'/)
  assert.match(source, /sanitizeAuthorization/)
  assert.match(source, /tenantMatches/)
  assert.match(source, /user\.tenantId\s*\|\|\s*DEFAULT_TENANT_ID/)
  assert.match(source, /name:\s*canShowHouseInfo\s*\?\s*project\.name/)
  assert.match(source, /startDate:\s*canShowHouseInfo\s*\?\s*formatDate/)
  assert.match(source, /Number\(project\.progress\s*\|\|\s*0\)\s*>=\s*100/)
  assert.doesNotMatch(source, /tempUrlMap\[fileID\]\s*\|\|\s*fileID/)
})

test('public cases omit house and budget fields unless explicitly authorized', () => {
  const source = read('cloudfunctions/listPublicCases/index.js')
  assert.match(source, /communityName:\s*allowShowCommunity\s*\?/)
  assert.match(source, /exactPrice:\s*allowShowBudget\s*\?/)
  assert.match(source, /budgetRange:\s*allowShowBudget\s*\?/)
  assert.match(source, /allowCompletionPhotos/)
  assert.match(source, /authorizationTenantMatchesProject/)
})

test('tenant administrators cannot update another tenant plan', () => {
  const source = read('cloudfunctions/adminUpdateTenantPlan/index.js')
  assert.match(source, /PLATFORM_ADMIN_ROLES/)
  assert.match(source, /requestedTenantId/)
  assert.match(source, /CROSS_TENANT_FORBIDDEN/)
})

test('stage log review is pending-only and project progress is monotonic', () => {
  const source = read('cloudfunctions/reviewStageLog/index.js')
  assert.match(source, /REVIEW_STATUS_NOT_PENDING/)
  assert.match(source, /Math\.max\(/)
  assert.match(source, /PROJECT_TENANT_MISMATCH/)
})

test('non-default tenants never inherit blank legacy tenant records', () => {
  const cloudRoot = path.join(ROOT, 'cloudfunctions')
  const violations = []
  for (const name of fs.readdirSync(cloudRoot)) {
    const file = path.join(cloudRoot, name, 'index.js')
    if (!fs.existsSync(file)) continue
    const source = fs.readFileSync(file, 'utf8')
    const unsafePatterns = [
      /tenantId:\s*_\.in\(\[tenantId,\s*['"]['"],\s*null\]\)/,
      /_\.in\(\[tenantId\s*\|\|\s*DEFAULT_TENANT_ID,\s*['"]['"],\s*null\]\)/,
      /const\s+tenantQuery\s*=\s*_\.in\(\[tenantId,\s*['"]['"],\s*null\]\)/
    ]
    if (unsafePatterns.some((pattern) => pattern.test(source))) {
      violations.push(path.relative(ROOT, file))
    }
  }
  assert.deepEqual(violations, [], `unsafe blank-tenant queries: ${violations.join(', ')}`)
})

test('direct resource checks reject blank legacy tenants outside the default tenant', () => {
  const files = [
    'cloudfunctions/deleteDesignDrawing/index.js',
    'cloudfunctions/getOwnerArchive/index.js',
    'cloudfunctions/getWarrantyCard/index.js',
    'cloudfunctions/updateDesignDrawing/index.js',
    'cloudfunctions/updateCaseAuthorization/index.js',
    'cloudfunctions/getCompletedOwnerHome/index.js',
    'cloudfunctions/recordWorkerCheckin/index.js',
    'cloudfunctions/deleteProject/index.js',
    'cloudfunctions/submitStageLog/index.js',
    'cloudfunctions/createWorkerProjectBindCode/index.js',
    'cloudfunctions/bindOwnerProject/index.js',
    'cloudfunctions/bindStaffRole/index.js',
    'cloudfunctions/bindWorkerProject/index.js',
    'cloudfunctions/generateStageLogDraft/index.js',
    'cloudfunctions/createAfterSalesTicket/index.js',
    'cloudfunctions/getOwnerProject/index.js',
    'cloudfunctions/submitOwnerSupplement/index.js',
    'cloudfunctions/uploadDesignDrawing/index.js',
    'cloudfunctions/createReferralRecord/index.js',
    'cloudfunctions/getAfterSalesTicket/index.js',
    'cloudfunctions/sendOwnerNotice/index.js',
    'cloudfunctions/createOwnerBindCode/index.js',
    'cloudfunctions/deleteStaffMember/index.js',
    'cloudfunctions/listDesignDrawings/index.js',
    'cloudfunctions/updateAfterSalesTicket/index.js',
    'cloudfunctions/deliverProject/index.js',
    'cloudfunctions/updateStaffMember/index.js',
    'cloudfunctions/updateCustomer/index.js',
    'cloudfunctions/unbindOwner/index.js',
    'cloudfunctions/getCustomer/index.js',
    'cloudfunctions/getProjectDetail/index.js',
    'cloudfunctions/deleteCustomer/index.js'
  ]

  files.forEach((file) => {
    assert.match(read(file), /function tenantMatches\(/, `${file} must define the legacy tenant boundary`)
    assert.match(read(file), /tenantMatches\(/g, `${file} must apply the legacy tenant boundary`)
  })
})

test('invite code redemptions use database transactions', () => {
  const files = [
    'cloudfunctions/bindStaffRole/index.js',
    'cloudfunctions/bindOwnerProject/index.js',
    'cloudfunctions/bindWorkerProject/index.js'
  ]
  files.forEach((file) => {
    const source = read(file)
    assert.match(source, /runTransaction\(/, `${file} must redeem codes atomically`)
    assert.match(source, /tenantMatches\(freshCode\.tenantId, tenantId\)/, `${file} must enforce the code tenant inside the transaction`)
  })
})

test('real AI network calls are opt-in and disabled by default', () => {
  const files = [
    'cloudfunctions/aiGenerateOwnerSummary/index.js',
    'cloudfunctions/generateStageLogDraft/index.js'
  ]
  files.forEach((file) => {
    const source = read(file)
    assert.match(source, /ENABLE_REAL_AI_API/)
    assert.match(source, /===\s*'true'/)
  })
})

test('cloud function SDK versions are pinned', () => {
  const cloudRoot = path.join(ROOT, 'cloudfunctions')
  const latestPackages = []
  for (const name of fs.readdirSync(cloudRoot)) {
    const file = path.join(cloudRoot, name, 'package.json')
    if (!fs.existsSync(file)) continue
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (pkg.dependencies && pkg.dependencies['wx-server-sdk'] && pkg.dependencies['wx-server-sdk'] !== '2.6.3') {
      latestPackages.push(path.relative(ROOT, file))
    }
  }
  assert.deepEqual(latestPackages, [], `uncontrolled SDK versions: ${latestPackages.join(', ')}`)
})

test('review sends owner notifications inside the authenticated review function', () => {
  const source = read('cloudfunctions/reviewStageLog/index.js')
  assert.match(source, /cloud\.openapi\.subscribeMessage\.send/)
  assert.doesNotMatch(source, /name:\s*'sendOwnerNotice'/)
})

test('project creation commits the project and initial membership atomically', () => {
  const source = read('cloudfunctions/createProject/index.js')
  assert.match(source, /runTransaction\(/)
  assert.match(source, /transaction\.collection\('projects'\)\.add/)
  assert.match(source, /transaction\.collection\('project_members'\)\.add/)
})

test('project delivery uses an atomic transaction and deterministic warranty id', () => {
  const source = read('cloudfunctions/deliverProject/index.js')
  assert.match(source, /runTransaction\(/)
  assert.match(source, /warrantyCardIdForProject/)
  assert.match(source, /transaction\.collection\('warranty_cards'\)/)
})

test('project deletion scans all records and reports cleanup failures', () => {
  const source = read('cloudfunctions/deleteProject/index.js')
  assert.match(source, /listAllWhere/)
  assert.match(source, /listPhotosByStageLogIds/)
  assert.match(source, /photosByLogs/)
  assert.match(source, /cleanupErrors/)
  assert.doesNotMatch(source, /safeRemoveWhere/)
  assert.doesNotMatch(source, /\.limit\((100|200|300)\)\.get\(\)/)
})

test('an empty database never promotes the first visitor to administrator', () => {
  const source = read('cloudfunctions/login/index.js')
  assert.doesNotMatch(source, /isFirstUser/)
  assert.doesNotMatch(source, /userCount\.total\s*===\s*0/)
})

test('referrals require an owner-bound project', () => {
  const source = read('cloudfunctions/createReferralRecord/index.js')
  assert.match(source, /if \(!projectId\) throw new Error/)
  assert.doesNotMatch(source, /if \(!projectId\) return null/)
})

test('design drawing metadata and project timestamp commit atomically', () => {
  const source = read('cloudfunctions/uploadDesignDrawing/index.js')
  assert.match(source, /if \(!project\) throw new Error/)
  assert.match(source, /runTransaction\(/)
  assert.match(source, /transaction\.collection\('design_drawings'\)\.add/)
})

test('stage log and photo metadata commit atomically', () => {
  const source = read('cloudfunctions/submitStageLog/index.js')
  assert.match(source, /findExistingStageLog\(transaction,/)
  assert.match(source, /transaction\.collection\('stage_logs'\)\.add/)
  assert.match(source, /transaction\.collection\('photos'\)\.add/)
})

test('V2 deal loop remains disabled', () => {
  assert.match(read('miniprogram/pages/workbench/workbench.js'), /ENABLE_V2_DEAL_LOOP_ENTRY\s*=\s*false/)
  assert.match(read('miniprogram/subpackages/deal-loop/utils/accessGuard.js'), /ENABLE_V2_DEAL_LOOP_ENTRY\s*=\s*false/)
})
