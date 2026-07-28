const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const assert = require('node:assert/strict')

const {
  isOwner,
  isStaff,
  resolveEntryRoute
} = require('../miniprogram/utils/public-entry-router')

const root = path.resolve(__dirname, '..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('unknown users resolve to the public home instead of company registration', () => {
  assert.deepEqual(resolveEntryRoute(null), { type: 'public', user: null })
  assert.equal(resolveEntryRoute({ role: 'owner' }).type, 'public')
})

test('existing bosses and employees keep the original workbench route', () => {
  ;['admin', 'boss_qi', 'boss_hu', 'worker', 'project_manager', 'designer', 'sales'].forEach((role) => {
    const user = { role }
    assert.equal(isStaff(user), true)
    assert.deepEqual(resolveEntryRoute(user), { type: 'workbench', user })
  })
})

test('a bound owner with one project goes directly to the original project detail', () => {
  const user = { role: 'owner' }
  assert.equal(isOwner(user), true)
  assert.deepEqual(resolveEntryRoute(user, [{ projectId: 'project-1' }]), {
    type: 'owner_detail', user, projectId: 'project-1'
  })
})

test('a bound owner with multiple projects goes to the original project list', () => {
  const user = { role: 'owner' }
  assert.equal(resolveEntryRoute(user, [{ _id: 'project-1' }, { _id: 'project-2' }]).type, 'owner_projects')
})

test('missing or malformed project IDs cannot create an owner detail route', () => {
  assert.equal(resolveEntryRoute({ role: 'owner' }, [{ projectId: '' }, {}]).type, 'public')
})

test('the startup implementation uses guest-safe identity recovery and the shared route decision', () => {
  const source = read('miniprogram/app.js')
  assert.match(source, /resolveEntryRoute/)
  assert.match(source, /allowGuestFlow:\s*true/)
  assert.match(source, /skipRegisterRedirect:\s*true/)
  assert.match(source, /name:\s*'listOwnerProjects'/)
})

test('public home exposes no personal information authorization APIs', () => {
  const source = read('miniprogram/pages/public-home/public-home.js')
  assert.doesNotMatch(source, /getPhoneNumber|getUserProfile|chooseAvatar|requestSubscribeMessage/)
  assert.match(source, /project-unbound/)
  assert.match(source, /demo-project/)
})

test('the unbound page only rechecks access and never binds or writes a project', () => {
  const source = read('miniprogram/subpackages/public-access/pages/project-unbound/project-unbound.js')
  assert.match(source, /resolveExistingEntry/)
  assert.doesNotMatch(source, /bindOwnerProject|ownerOpenid|projectId.*setData|getPhoneNumber/)
})

test('staff access is only reachable through an explicit public-home action', () => {
  const source = read('miniprogram/pages/public-home/public-home.js')
  const markup = read('miniprogram/pages/public-home/public-home.wxml')
  assert.match(source, /goStaff\(\)/)
  assert.match(source, /switchTab\(\{ url: '\/pages\/workbench\/workbench' \}\)/)
  assert.match(markup, /我是工作人员/)
})

test('demo package has all reviewable core pages and uses local mock data', () => {
  const appConfig = JSON.parse(read('miniprogram/app.json'))
  const demoPackage = appConfig.subpackages.find((item) => item.root === 'subpackages/demo-project')
  assert.ok(demoPackage)
  assert.deepEqual(demoPackage.pages, [
    'pages/home/index',
    'pages/progress/index',
    'pages/stage-log/index',
    'pages/photos/index',
    'pages/design-confirm/index',
    'pages/issues/index'
  ])
  assert.match(read('miniprogram/subpackages/demo-project/mock/demo-project-data.js'), /示例工地/)
})

test('demo pages have no CloudBase, cloud function, profile, or phone calls', () => {
  const demoRoot = path.join(root, 'miniprogram/subpackages/demo-project')
  const files = []
  const visit = (directory) => fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) visit(target)
    else if (/\.(js|wxml)$/.test(entry.name)) files.push(target)
  })
  visit(demoRoot)
  const source = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n')
  assert.doesNotMatch(source, /wx\.cloud|callFunction|services\/cloud|getPhoneNumber|getUserProfile|chooseAvatar/)
  assert.ok(files.length >= 13)
})

test('avatar and nickname remain optional profile editing only', () => {
  const profile = read('miniprogram/pages/profile/profile.wxml')
  const workbench = read('miniprogram/pages/workbench/workbench.wxml')
  assert.match(profile, /open-type="chooseAvatar"/)
  assert.match(profile, /type="nickname"/)
  assert.match(workbench, /完善微信头像昵称/)
  assert.doesNotMatch(workbench, /必须.*头像|必须.*昵称/)
})

test('V2 and style-preview entries remain disabled', () => {
  const workbench = read('miniprogram/pages/workbench/workbench.js')
  assert.match(workbench, /ENABLE_V2_DEAL_LOOP_ENTRY\s*=\s*false/)
  assert.doesNotMatch(read('miniprogram/app.json'), /style-preview|stylePreview/)
  assert.doesNotMatch(read('miniprogram/pages/workbench/workbench.js'), /style-preview|stylePreview/)
})

test('submission note describes the actual OpenID-bound access model without phone verification', () => {
  const note = read('docs/public-home-remediation/REVIEW_SUBMISSION_NOTE.md')
  assert.match(note, /现有微信身份/)
  assert.doesNotMatch(note, /手机号验证|快捷验证/)
})
