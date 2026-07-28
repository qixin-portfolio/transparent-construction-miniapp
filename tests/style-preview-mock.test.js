const assert = require('node:assert/strict')
const test = require('node:test')

const modulePath = '../miniprogram/subpackages/style-preview/mock/style-preview-service'

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
