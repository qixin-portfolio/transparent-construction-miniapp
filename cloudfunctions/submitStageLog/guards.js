const { DEFAULT_TENANT_ID } = require('./stage-flow')
const crypto = require('node:crypto')

const QUERY_PAGE_SIZE = 100

function toTime(value) {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  if (value.$date && value.$date.$numberLong) return Number(value.$date.$numberLong)
  if (value.$numberLong) return Number(value.$numberLong)
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function getChinaDayRange(date = new Date()) {
  const dayMs = 24 * 60 * 60 * 1000
  const chinaOffsetMs = 8 * 60 * 60 * 1000
  const chinaDate = new Date(date.getTime() + chinaOffsetMs)
  const startTime = Date.UTC(
    chinaDate.getUTCFullYear(),
    chinaDate.getUTCMonth(),
    chinaDate.getUTCDate()
  ) - chinaOffsetMs
  return {
    start: new Date(startTime),
    end: new Date(startTime + dayMs)
  }
}

function getChinaDayKey(date = new Date()) {
  const chinaOffsetMs = 8 * 60 * 60 * 1000
  const chinaDate = new Date(date.getTime() + chinaOffsetMs)
  return [
    chinaDate.getUTCFullYear(),
    String(chinaDate.getUTCMonth() + 1).padStart(2, '0'),
    String(chinaDate.getUTCDate()).padStart(2, '0')
  ].join('-')
}

function createSubmissionRequestContext(now = new Date()) {
  const requestNow = new Date(now)
  if (Number.isNaN(requestNow.getTime())) throw new Error('提交时间无效')
  const range = getChinaDayRange(requestNow)
  return Object.freeze({
    requestNow,
    businessDate: getChinaDayKey(requestNow),
    businessDayStart: range.start,
    businessDayEnd: range.end
  })
}

function tenantScope(_, tenantId) {
  return tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId
}

function isSameSubmitter(item, openid, userId) {
  return (openid && (item.submittedByOpenid === openid || item.createdByOpenid === openid)) ||
    (userId && (item.submittedBy === userId || item.createdBy === userId))
}

function buildSubmissionIdempotencyKey({ tenantId, projectId, stageCode, openid, userId, date, businessDate }) {
  const identity = openid || userId
  const payload = [tenantId, projectId, stageCode, businessDate || getChinaDayKey(date), identity].join('\n')
  return `stage-log-submit-${crypto.createHash('sha256').update(payload).digest('hex')}`
}

async function findStageLogsForBusinessDay(database, _, projectId, tenantId, stageCode, stage, openid, userId, requestContext) {
  const range = requestContext && requestContext.businessDayStart
    ? { start: requestContext.businessDayStart, end: requestContext.businessDayEnd }
    : getChinaDayRange(requestContext)
  const baseWhere = {
    projectId,
    tenantId: tenantScope(_, tenantId),
    createdAt: _.gte(range.start)
  }
  const queries = []
  const stageFields = []
  if (stageCode) stageFields.push({ stageCode })
  if (stage) stageFields.push({ stage })
  const submitterFields = []
  if (openid) {
    submitterFields.push({ submittedByOpenid: openid })
    submitterFields.push({ createdByOpenid: openid })
  }
  if (userId) {
    submitterFields.push({ submittedBy: userId })
    submitterFields.push({ createdBy: userId })
  }
  stageFields.forEach((stageField) => {
    submitterFields.forEach((submitterField) => {
      queries.push(Object.assign({}, baseWhere, stageField, submitterField))
    })
  })

  const seen = new Set()
  const matches = []
  for (const where of queries) {
    let offset = 0
    while (true) {
      const res = await database.collection('stage_logs').where(where)
        .orderBy('createdAt', 'desc')
        .skip(offset)
        .limit(QUERY_PAGE_SIZE)
        .get()
      const records = res.data || []
      records.forEach((item) => {
        if (seen.has(item._id)) return
        if (!isSameSubmitter(item, openid, userId)) return false
        const time = toTime(item.createdAt || item.submittedAt || item.updatedAt)
        if (time < range.start.getTime() || time >= range.end.getTime()) return
        seen.add(item._id)
        matches.push(item)
      })
      if (records.length < QUERY_PAGE_SIZE) break
      offset += records.length
    }
  }
  return matches
}

async function findExistingStageLog(database, _, projectId, tenantId, stageCode, stage, openid, userId, requestContext) {
  const matches = await findStageLogsForBusinessDay(database, _, projectId, tenantId, stageCode, stage, openid, userId, requestContext)
  return matches.find((item) => (item.reviewStatus || 'pending') !== 'rejected') || null
}

module.exports = {
  getChinaDayRange,
  getChinaDayKey,
  createSubmissionRequestContext,
  tenantScope,
  findStageLogsForBusinessDay,
  findExistingStageLog,
  buildSubmissionIdempotencyKey
}
