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
    'cloudfunctions/seedCustomerBenefits/index.js'
  ]

  files.forEach((file) => {
    const source = read(file)
    assert.match(source, /cloud\.getWXContext\(\)/, `${file} must identify the caller`)
    assert.match(source, /ALLOWED_ROLES|ADMIN_ROLES/, `${file} must enforce an explicit role allowlist`)
  })

  const dailySummaryIndex = read('cloudfunctions/dailySummary/index.js')
  const dailySummarySecurity = read('cloudfunctions/dailySummary/security.js')
  assert.match(dailySummaryIndex, /cloud\.getWXContext\(\)/)
  assert.match(dailySummaryIndex, /authorizeDailySummaryInvocation\(/)
  assert.match(dailySummaryIndex, /process\.env\.DAILY_SUMMARY_CRON_SECRET/)
  assert.match(dailySummarySecurity, /const ALLOWED_ROLES\s*=/)
  assert.match(dailySummarySecurity, /secretsMatch\(/)
  assert.match(dailySummarySecurity, /tenantId === DEFAULT_TENANT_ID/)
})

test('owner notifications validate the stage log and target the formal mini program', () => {
  const source = read('cloudfunctions/sendOwnerNotice/index.js')
  assert.match(source, /assertStageLogProject|STAGE_LOG_PROJECT_MISMATCH/)
  assert.match(source, /miniprogramState:\s*'formal'/)
})

test('completion album requires owner access or a revocable public share token', () => {
  const indexSource = read('cloudfunctions/getCompletionAlbum/index.js')
  const accessSource = read('cloudfunctions/getCompletionAlbum/shareAccess.js')
  assert.match(indexSource, /cloud\.getWXContext\(\)/)
  assert.match(indexSource, /evaluateAlbumAccess\(/)
  assert.match(indexSource, /createShareToken\(/)
  assert.match(indexSource, /process\.env\.COMPLETION_SHARE_TOKEN_SECRET/)
  assert.match(indexSource, /tenantMatches/)
  assert.match(indexSource, /name:\s*canShowHouseInfo\s*\?\s*project\.name/)
  assert.match(indexSource, /startDate:\s*canShowHouseInfo\s*\?\s*formatDate/)
  assert.match(indexSource, /Number\(project\.progress\s*\|\|\s*0\)\s*>=\s*100/)
  assert.doesNotMatch(indexSource, /tempUrlMap\[fileID\]\s*\|\|\s*fileID/)
  assert.match(accessSource, /authorization\.authorizationScope\s*!==\s*'public'/)
  assert.match(accessSource, /crypto\.createHmac\('sha256'/)
  assert.match(accessSource, /shareTokenExpiresAt/)
  assert.match(accessSource, /timingSafeEqual/)
  assert.match(accessSource, /buildSafeAlbumResponse/)
  assert.match(accessSource, /'装修完工纪念册'/)
  assert.doesNotMatch(accessSource, /ownerOpenid|ownerOpenids/)
})

test('public cases omit house and budget fields unless explicitly authorized', () => {
  const indexSource = read('cloudfunctions/listPublicCases/index.js')
  const dtoSource = read('cloudfunctions/listPublicCases/publicCaseDto.js')
  assert.match(indexSource, /buildPublicCaseDto\(/)
  assert.match(indexSource, /authorizationTenantMatchesProject/)
  assert.match(indexSource, /allowCompletionPhotos/)
  assert.match(dtoSource, /allowedMaterials\.indexOf\('house_info'\)/)
  assert.match(dtoSource, /allowedMaterials\.indexOf\('budget'\)/)
  assert.match(dtoSource, /allowedMaterials\.indexOf\('completion_photos'\)/)
  assert.match(dtoSource, /if \(allowHouseInfo\)/)
  assert.match(dtoSource, /if \(allowBudget\)/)
  assert.doesNotMatch(dtoSource, /dto\.(planType|designHighlights|deliveredAt|tenantId|ownerOpenid)/)
})

test('tenant administrators cannot update another tenant plan', () => {
  const source = read('cloudfunctions/adminUpdateTenantPlan/index.js')
  assert.match(source, /PLATFORM_ADMIN_ROLES/)
  assert.match(source, /requestedTenantId/)
  assert.match(source, /CROSS_TENANT_FORBIDDEN/)
})

test('stage log review is pending-only and project progress is monotonic', () => {
  const indexSource = read('cloudfunctions/reviewStageLog/index.js')
  const serviceSource = read('cloudfunctions/reviewStageLog/reviewService.js')
  assert.match(indexSource, /executeStageLogReview\(/)
  assert.match(indexSource, /db\.runTransaction\(/)
  assert.match(serviceSource, /previousStatus\s*!==\s*'pending'/)
  assert.match(serviceSource, /ALREADY_REVIEWED/)
  assert.match(serviceSource, /Math\.max\(/)
  assert.match(serviceSource, /PROJECT_TENANT_MISMATCH/)
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
    'cloudfunctions/bindOwnerProject/index.js',
    'cloudfunctions/bindWorkerProject/index.js'
  ]
  files.forEach((file) => {
    const source = read(file)
    assert.match(source, /runTransaction\(/, `${file} must redeem codes atomically`)
    assert.match(source, /tenantMatches\(freshCode\.tenantId, tenantId\)/, `${file} must enforce the code tenant inside the transaction`)
  })

  const staffIndex = read('cloudfunctions/bindStaffRole/index.js')
  const staffSecurity = read('cloudfunctions/bindStaffRole/inviteSecurity.js')
  assert.match(staffIndex, /redeemStaffInvite\(/)
  assert.match(staffIndex, /recordFailedInviteAttempt\(/)
  assert.match(staffIndex, /invite_code_attempts/)
  assert.match(staffIndex, /db\.runTransaction\(/)
  assert.match(staffIndex, /createInviteAttemptKeys\(/)
  assert.match(staffSecurity, /const INVITABLE_ROLES\s*=\s*\['worker', 'project_manager', 'designer', 'sales'\]/)
  assert.match(staffSecurity, /staff_caller_/)
  assert.match(staffSecurity, /invite\.tenantId/)
  assert.doesNotMatch(staffSecurity, /requestedTenantId/)

  const createStaffInvite = read('cloudfunctions/createStaffInviteCode/index.js')
  const createStaffInviteSecurity = read('cloudfunctions/createStaffInviteCode/inviteCodeSecurity.js')
  assert.match(createStaffInvite, /\.where\(\{ role, tenantId, status: 'active'/)
  assert.doesNotMatch(createStaffInvite, /staff_invite_codes'[\s\S]{0,200}tenantId:\s*tenantId === DEFAULT_TENANT_ID/)
  assert.match(createStaffInvite, /reserveStaffInviteCode\(/)
  assert.match(createStaffInvite, /db\.runTransaction\(/)
  assert.match(createStaffInviteSecurity, /INVITE_CODE_COLLISION/)
  assert.match(createStaffInviteSecurity, /setInviteById\(code/)
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
