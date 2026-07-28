const STORAGE_KEY = 'shengjing-style-preview-v1-sessions'

const FIXTURE_CUSTOMERS = [
  { id: 'mock-customer-wanshuo', name: '王女士', community: '万硕花园', tenantId: 'mock-tenant' },
  { id: 'mock-customer-tiantai', name: '李先生', community: '天泰小区', tenantId: 'mock-tenant' },
  { id: 'mock-customer-jingyi', name: '陈女士', community: '景宜二期', tenantId: 'mock-tenant' }
]

const FIXTURE_IMAGES = {
  sourceImage: '/images/cases/case-2-cover.jpg',
  referenceImage: '/images/cases/case-4-cover.jpg',
  previewImage: '/images/cases/case-4-3.jpg'
}

const DEFAULT_STYLE_INTENT = {
  styleName: '温润原木轻法式',
  keywords: ['自然木色', '柔和留白', '暖光层次'],
  colorPalette: ['奶油白', '浅橡木', '雾灰绿'],
  materials: ['暖白艺术漆', '浅木纹柜体', '亚麻质感软装'],
  atmosphere: '明亮、松弛，保留毛坯空间的开阔感与采光方向。',
  preservationNotes: 'Mock 预览优先保留原房间的窗位、墙体关系和主视角，不涉及拆改。',
  designBoundary: '仅用于前期风格沟通，不包含施工图、尺寸深化、报价或材料下单。'
}

function nowIso() {
  return new Date().toISOString()
}

function makeId() {
  return `style-preview-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function readStorage() {
  try {
    const value = wx.getStorageSync(STORAGE_KEY)
    return Array.isArray(value) ? value : []
  } catch (error) {
    return []
  }
}

function writeStorage(sessions) {
  try {
    wx.setStorageSync(STORAGE_KEY, sessions)
  } catch (error) {
    return false
  }
  return true
}

function fixtureSession(customer) {
  const target = customer || FIXTURE_CUSTOMERS[0]
  return {
    id: `fixture-${target.id}`,
    tenantId: target.tenantId,
    customerId: target.id,
    customerName: target.name,
    roomType: '客厅',
    sourceImage: FIXTURE_IMAGES.sourceImage,
    referenceImage: FIXTURE_IMAGES.referenceImage,
    note: '本地演示样例：保持采光面与主要动线。',
    status: 'completed',
    styleIntent: Object.assign({}, DEFAULT_STYLE_INTENT),
    previewImage: FIXTURE_IMAGES.previewImage,
    feedback: '',
    createdAt: '2026-07-28T09:00:00.000Z',
    updatedAt: '2026-07-28T09:00:00.000Z'
  }
}

function listCustomers() {
  return FIXTURE_CUSTOMERS.slice()
}

function resolveCustomer(customerId, customerName) {
  const known = FIXTURE_CUSTOMERS.find((item) => item.id === customerId)
  if (known) return known
  return {
    id: String(customerId || FIXTURE_CUSTOMERS[0].id),
    name: String(customerName || FIXTURE_CUSTOMERS[0].name),
    community: '当前客户',
    tenantId: 'mock-tenant'
  }
}

function listSessions(customerId, customerName) {
  const customer = resolveCustomer(customerId, customerName)
  const stored = readStorage().filter((item) => item.customerId === customer.id)
  const sessions = stored.length ? stored : [fixtureSession(customer)]
  return sessions.slice().sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
}

function getSession(id, customerId, customerName) {
  const found = readStorage().find((item) => item.id === id)
  if (found) return found
  const customer = resolveCustomer(customerId, customerName)
  return fixtureSession(customer)
}

function createSession(values = {}) {
  const customer = resolveCustomer(values.customerId, values.customerName)
  const createdAt = nowIso()
  const session = {
    id: makeId(),
    tenantId: customer.tenantId,
    customerId: customer.id,
    customerName: customer.name,
    roomType: values.roomType || '客厅',
    sourceImage: values.sourceImage || FIXTURE_IMAGES.sourceImage,
    referenceImage: values.referenceImage || FIXTURE_IMAGES.referenceImage,
    note: String(values.note || '').trim(),
    status: 'processing',
    styleIntent: Object.assign({}, DEFAULT_STYLE_INTENT),
    previewImage: FIXTURE_IMAGES.previewImage,
    feedback: '',
    createdAt,
    updatedAt: createdAt
  }
  const sessions = readStorage().filter((item) => item.id !== session.id)
  sessions.unshift(session)
  writeStorage(sessions)
  return session
}

function updateSession(id, patch = {}) {
  const sessions = readStorage()
  const index = sessions.findIndex((item) => item.id === id)
  if (index === -1) return null
  sessions[index] = Object.assign({}, sessions[index], patch, { updatedAt: nowIso() })
  writeStorage(sessions)
  return sessions[index]
}

function completeSession(id) {
  return updateSession(id, { status: 'completed' })
}

function saveFeedback(id, feedback) {
  return updateSession(id, { feedback: String(feedback || '').trim() })
}

module.exports = {
  DEFAULT_STYLE_INTENT,
  FIXTURE_IMAGES,
  createSession,
  completeSession,
  getSession,
  listCustomers,
  listSessions,
  saveFeedback
}
