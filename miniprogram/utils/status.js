const PROJECT_STATUS_LABELS = {
  pending_start: '待开工',
  in_progress: '施工中',
  completed: '已完工',
  delivered: '已交付',
  after_sales: '售后中',
  paused: '暂停中',
  cancelled: '已取消'
}

const PROJECT_STATUS_BY_TEXT = {
  '待开工': 'pending_start',
  '施工中': 'in_progress',
  '已完工': 'completed',
  '完工': 'completed',
  '已竣工': 'completed',
  '竣工验收': 'completed',
  '已交付': 'delivered',
  '售后中': 'after_sales',
  '暂停中': 'paused',
  '已取消': 'cancelled'
}

const CUSTOMER_LIFECYCLE_LABELS = {
  lead: '线索',
  consulting: '咨询中',
  measured: '已量房',
  quoted: '已报价',
  signed: '已签约',
  in_construction: '施工中',
  delivered: '已交付 / 老业主',
  lost: '已流失'
}

function getProjectStatusCode(project) {
  const statusCode = String((project && project.statusCode) || '').trim()
  if (PROJECT_STATUS_LABELS[statusCode]) return statusCode

  const status = String((project && project.status) || '').trim()
  if (PROJECT_STATUS_BY_TEXT[status]) return PROJECT_STATUS_BY_TEXT[status]

  return 'in_progress'
}

function getProjectStatusLabel(project) {
  const statusCode = getProjectStatusCode(project)
  return PROJECT_STATUS_LABELS[statusCode] || String((project && project.status) || '') || '施工中'
}

function isProjectInProgress(project) {
  return getProjectStatusCode(project) === 'in_progress'
}

function isProjectCompleted(project) {
  return getProjectStatusCode(project) === 'completed'
}

function isProjectDelivered(project) {
  return getProjectStatusCode(project) === 'delivered'
}

function isProjectAfterSales(project) {
  return getProjectStatusCode(project) === 'after_sales'
}

function getCustomerLifecycleStatus(customer) {
  const lifecycleStatus = String((customer && customer.lifecycleStatus) || '').trim()
  if (CUSTOMER_LIFECYCLE_LABELS[lifecycleStatus]) return lifecycleStatus

  const dealStatus = String((customer && customer.dealStatus) || '').trim()
  const stage = String((customer && customer.stage) || '').trim()

  if (dealStatus === '已流失') return 'lost'
  if (dealStatus === '已成交' || stage === '已签单') return 'signed'
  if (['准备签单', '已报价', '已出图'].indexOf(stage) !== -1) return 'quoted'
  if (stage === '已量房') return 'measured'
  if (stage === '已到店' || stage === '咨询') return 'consulting'
  return 'consulting'
}

function getCustomerLifecycleLabel(customer) {
  const lifecycleStatus = getCustomerLifecycleStatus(customer)
  return CUSTOMER_LIFECYCLE_LABELS[lifecycleStatus] || '咨询中'
}

function isDeliveredCustomer(customer) {
  return getCustomerLifecycleStatus(customer) === 'delivered'
}

module.exports = {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_BY_TEXT,
  CUSTOMER_LIFECYCLE_LABELS,
  getProjectStatusCode,
  getProjectStatusLabel,
  isProjectInProgress,
  isProjectCompleted,
  isProjectDelivered,
  isProjectAfterSales,
  getCustomerLifecycleStatus,
  getCustomerLifecycleLabel,
  isDeliveredCustomer
}
