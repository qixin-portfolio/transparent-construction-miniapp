const assert = require('node:assert/strict')
const test = require('node:test')

const modulePath = '../miniprogram/subpackages/style-preview/mock/style-preview-service'
const pageBasePath = '../miniprogram/subpackages/style-preview/pages'

function loadService(store = {}) {
  global.wx = {
    getStorageSync(key) {
      return store[key]
    },
    setStorageSync(key, value) {
      store[key] = value
    }
  }
  delete require.cache[require.resolve(modulePath)]
  return require(modulePath)
}

function createPageInstance(definition) {
  const instance = {
    data: JSON.parse(JSON.stringify(definition.data || {})),
    setData(patch) {
      Object.keys(patch).forEach((key) => {
        const path = key.split('.')
        let target = this.data
        while (path.length > 1) {
          const segment = path.shift()
          target[segment] = target[segment] || {}
          target = target[segment]
        }
        target[path[0]] = patch[key]
      })
    }
  }
  Object.keys(definition).forEach((key) => {
    if (typeof definition[key] === 'function') instance[key] = definition[key]
  })
  return instance
}

function loadPage(name) {
  const pagePath = `${pageBasePath}/${name}/index.js`
  let definition = null
  global.Page = (value) => { definition = value }
  delete require.cache[require.resolve(pagePath)]
  require(pagePath)
  return definition
}

test('style preview uses a fixed local fixture until a customer creates a session', () => {
  const service = loadService()
  const customers = service.listCustomers()
  const sessions = service.listSessions(customers[0].id, customers[0].name)

  assert.equal(customers.length, 3)
  assert.equal(sessions.length, 1)
  assert.equal(sessions[0].id, `fixture-${customers[0].id}`)
  assert.equal(sessions[0].status, 'completed')
  assert.equal(sessions[0].tenantId, 'mock-tenant')
})

test('style preview session is local, completes, and retains customer feedback', () => {
  const store = {}
  const service = loadService(store)
  const session = service.createSession({
    customerId: 'mock-customer-tiantai',
    customerName: '李先生',
    roomType: '主卧',
    sourceImage: '/tmp/source.jpg',
    referenceImage: '/tmp/reference.jpg',
    note: '保留窗边的光线'
  })

  assert.equal(session.status, 'processing')
  assert.equal(session.customerId, 'mock-customer-tiantai')
  assert.equal(session.roomType, '主卧')
  assert.deepEqual(Object.keys(session).sort(), [
    'createdAt',
    'customerId',
    'customerName',
    'feedback',
    'id',
    'note',
    'previewImage',
    'referenceImage',
    'roomType',
    'sourceImage',
    'status',
    'styleIntent',
    'tenantId',
    'updatedAt'
  ])
  assert.deepEqual(Object.keys(session.styleIntent).sort(), [
    'atmosphere',
    'colorPalette',
    'designBoundary',
    'keywords',
    'materials',
    'preservationNotes',
    'styleName'
  ])
  assert.equal(service.listSessions(session.customerId, session.customerName).length, 1)

  const completed = service.completeSession(session.id)
  const reviewed = service.saveFeedback(session.id, '柜体再轻一点')

  assert.equal(completed.status, 'completed')
  assert.equal(reviewed.feedback, '柜体再轻一点')
  assert.equal(service.getSession(session.id).feedback, '柜体再轻一点')
  assert.equal(Object.keys(store).length, 1)
})

test('start, processing, result, feedback, and history pages complete the local Mock flow', () => {
  const store = {}
  const routes = []
  const originalSetInterval = global.setInterval
  const originalClearInterval = global.clearInterval
  const originalSetTimeout = global.setTimeout
  let progressTick = null
  let selectedImageCount = 0

  global.wx = {
    getStorageSync(key) {
      return store[key]
    },
    setStorageSync(key, value) {
      store[key] = value
    },
    chooseMedia({ success }) {
      selectedImageCount += 1
      success({ tempFiles: [{ tempFilePath: `/tmp/style-preview-${selectedImageCount}.jpg` }] })
    },
    navigateTo({ url, complete }) {
      routes.push({ type: 'navigateTo', url })
      if (complete) complete()
    },
    redirectTo({ url }) {
      routes.push({ type: 'redirectTo', url })
    },
    previewImage() {},
    showToast() {}
  }
  global.setInterval = (callback) => {
    progressTick = callback
    return 1
  }
  global.clearInterval = () => {}
  global.setTimeout = (callback) => {
    callback()
    return 1
  }

  try {
    const start = createPageInstance(loadPage('start'))
    start.onLoad({ mock: '1' })
    assert.equal(start.data.mockAccess, true)
    start.chooseImage({ currentTarget: { dataset: { target: 'sourceImage' } } })
    start.chooseImage({ currentTarget: { dataset: { target: 'referenceImage' } } })
    assert.equal(start.data.sourceImage, '/tmp/style-preview-1.jpg')
    assert.equal(start.data.referenceImage, '/tmp/style-preview-2.jpg')
    start.onRoomChange({ detail: { value: '1' } })
    start.onNoteInput({ detail: { value: '保留窗边采光' } })
    start.createPreview()

    assert.match(routes[0].url, /pages\/processing\/index\?id=style-preview-/)

    const createdId = decodeURIComponent(routes[0].url.match(/[?&]id=([^&]+)/)[1])
    const processing = createPageInstance(loadPage('processing'))
    processing.onLoad({ id: createdId, mock: '1' })
    progressTick()
    progressTick()
    progressTick()
    progressTick()

    const resultRoute = routes.find((entry) => entry.type === 'redirectTo' && /pages\/result\/index/.test(entry.url))
    assert.ok(resultRoute)

    const result = createPageInstance(loadPage('result'))
    result.onLoad({ id: createdId, mock: '1' })
    assert.equal(result.data.session.status, 'completed')
    assert.equal(result.data.session.roomType, '主卧')
    assert.equal(result.data.session.styleIntent.colorPaletteText, '奶油白 · 浅橡木 · 雾灰绿')
    result.onFeedbackInput({ detail: { value: '柜子希望更轻一点' } })
    result.saveFeedback()
    assert.equal(result.data.session.feedback, '柜子希望更轻一点')

    const history = createPageInstance(loadPage('history'))
    history.onLoad({ customerId: result.data.session.customerId, customerName: result.data.session.customerName, mock: '1' })
    assert.equal(history.data.sessions.length, 1)
    assert.equal(history.data.sessions[0].statusText, '已生成')
    history.viewResult({ currentTarget: { dataset: { id: createdId } } })
    assert.ok(routes.some((entry) => entry.type === 'navigateTo' && entry.url.includes(`id=${createdId}`)))
  } finally {
    global.setInterval = originalSetInterval
    global.clearInterval = originalClearInterval
    global.setTimeout = originalSetTimeout
    delete global.Page
  }
})
