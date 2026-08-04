#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const TEST_ENV = 'shengjing-style-test-d3ac90f38b1'
const PRODUCTION_ENV = 'cloud1-d4g7zh8kpca0e26d5'
const args = process.argv.slice(2)
const targetIndex = args.indexOf('--env')
const target = targetIndex === -1 ? '' : args[targetIndex + 1]
const shouldDeploy = args.includes('--deploy')
const config = resolve('cloudbaserc.style-preview-test.json')

if (!target || target !== TEST_ENV || target === PRODUCTION_ENV) {
  throw new Error('Refusing deployment: pass exactly --env shengjing-style-test-d3ac90f38b1')
}
if (!existsSync(config)) throw new Error('Missing test-only CloudBase configuration')

console.log(`TARGET_ENV=${TEST_ENV}`)
console.log('FEATURE=STYLE_PREVIEW_V2')
console.log('PROVIDER=mock')
console.log('REAL_AI_ENABLED=false')
console.log('PRODUCTION_DEPLOY=false')
console.log('PRODUCTION_DATA_ACCESS=false')

if (!shouldDeploy) {
  console.log('Preflight passed. Add --deploy to deploy exactly the two V2 functions.')
  process.exit(0)
}

const cloudbase = ['--yes', '--package=@cloudbase/cli@3.7.0', 'cloudbase', '--config-file', config, '--env-id', TEST_ENV]
function run(command) {
  execFileSync('npx', cloudbase.concat(command), { stdio: 'inherit' })
}

function nosql(command) {
  run(['db', 'nosql', 'execute', '--command', JSON.stringify(command)])
}

nosql([{ TableName: 'style_preview_sessions', CommandType: 'COMMAND', Command: JSON.stringify({ create: 'style_preview_sessions' }) }])
nosql([{ TableName: 'style_preview_tasks', CommandType: 'COMMAND', Command: JSON.stringify({ create: 'style_preview_tasks' }) }])
nosql([{ TableName: 'style_preview_sessions', CommandType: 'COMMAND', Command: JSON.stringify({
  createIndexes: 'style_preview_sessions',
  indexes: [
    { name: 'tenant_created_at', key: { tenantId: 1, createdAt: -1 } },
    { name: 'tenant_customer_created_at', key: { tenantId: 1, customerId: 1, createdAt: -1 } },
    { name: 'tenant_creator_created_at', key: { tenantId: 1, createdBy: 1, createdAt: -1 } },
    { name: 'tenant_latest_task', key: { tenantId: 1, latestTaskId: 1 } }
  ]
}) }])
nosql([{ TableName: 'style_preview_tasks', CommandType: 'COMMAND', Command: JSON.stringify({
  createIndexes: 'style_preview_tasks',
  indexes: [
    { name: 'tenant_session_created_at', key: { tenantId: 1, sessionId: 1, createdAt: -1 } },
    { name: 'tenant_status_created_at', key: { tenantId: 1, status: 1, createdAt: -1 } },
    { name: 'tenant_idempotency_unique', key: { tenantId: 1, idempotencyKey: 1 }, unique: true }
  ]
}) }])
run(['fn', 'deploy', 'stylePreviewApi', '--force'])
run(['fn', 'deploy', 'processStylePreviewTask', '--force'])
run(['fn', 'trigger', 'create', 'processStylePreviewTask', '--trigger-name', 'style-preview-worker', '--cron', '0 */1 * * * * *'])
