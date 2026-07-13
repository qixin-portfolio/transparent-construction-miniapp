const { DEFAULT_TENANT_ID } = require('./stage-flow')

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

function tenantScope(_, tenantId) {
  return tenantId === DEFAULT_TENANT_ID ? _.in([tenantId, '', null]) : tenantId
}

function isSameSubmitter(item, openid, userId) {
  return (openid && (item.submittedByOpenid === openid || item.createdByOpenid === openid)) ||
    (userId && (item.submittedBy === userId || item.createdBy === userId))
}

async function findExistingStageLog(database, _, projectId, tenantId, stageCode, stage, openid, userId) {
  const range = getChinaDayRange()
  const baseWhere = {
    projectId,
    tenantId: tenantScope(_, tenantId),
    createdAt: _.gte(range.start)
  }
  const queries = []
  if (stageCode) queries.push(Object.assign({}, baseWhere, { stageCode }))
  if (stage) queries.push(Object.assign({}, baseWhere, { stage }))

  for (const where of queries) {
    const res = await database.collection('stage_logs').where(where).orderBy('createdAt', 'desc').limit(20).get()
    const existing = (res.data || []).find((item) => {
      if ((item.reviewStatus || 'pending') === 'rejected') return false
      if (!isSameSubmitter(item, openid, userId)) return false
      const time = toTime(item.createdAt || item.submittedAt || item.updatedAt)
      return time >= range.start.getTime() && time < range.end.getTime()
    })
    if (existing) return existing
  }
  return null
}

module.exports = {
  getChinaDayRange,
  tenantScope,
  findExistingStageLog
}
