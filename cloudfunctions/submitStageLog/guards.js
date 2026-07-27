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

function tenantScope(_, tenantId) {
  return tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId
}

function isSameSubmitter(item, openid, userId) {
  return (openid && (item.submittedByOpenid === openid || item.createdByOpenid === openid)) ||
    (userId && (item.submittedBy === userId || item.createdBy === userId))
}

function buildSubmissionIdempotencyKey({ tenantId, projectId, stageCode, openid, userId, date }) {
  const identity = openid || userId
  const payload = [tenantId, projectId, stageCode, getChinaDayKey(date), identity].join('\n')
  return `stage-log-submit-${crypto.createHash('sha256').update(payload).digest('hex')}`
}

async function findExistingStageLog(database, _, projectId, tenantId, stageCode, stage, openid, userId, date) {
  const range = getChinaDayRange(date)
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

  for (const where of queries) {
    let offset = 0
    while (true) {
      const res = await database.collection('stage_logs').where(where)
        .orderBy('createdAt', 'desc')
        .skip(offset)
        .limit(QUERY_PAGE_SIZE)
        .get()
      const records = res.data || []
      const existing = records.find((item) => {
        if ((item.reviewStatus || 'pending') === 'rejected') return false
        if (!isSameSubmitter(item, openid, userId)) return false
        const time = toTime(item.createdAt || item.submittedAt || item.updatedAt)
        return time >= range.start.getTime() && time < range.end.getTime()
      })
      if (existing) return existing
      if (records.length < QUERY_PAGE_SIZE) break
      offset += records.length
    }
  }
  return null
}

module.exports = {
  getChinaDayRange,
  getChinaDayKey,
  tenantScope,
  findExistingStageLog,
  buildSubmissionIdempotencyKey
}
