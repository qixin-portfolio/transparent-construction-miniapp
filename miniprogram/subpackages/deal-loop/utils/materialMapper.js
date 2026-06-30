const { trustMaterials } = require('../mock/trustMaterials')

function filterMaterials(type) {
  if (!type || type === 'all') return trustMaterials
  return trustMaterials.filter((item) => item.type === type)
}

function getMaterialsByIds(ids) {
  const idSet = new Set(ids || [])
  return trustMaterials.filter((item) => idSet.has(item.materialId))
}

function getMaterialSummary(material) {
  if (!material) return ''
  const tags = (material.tags || []).join(' / ')
  return [material.typeLabel, tags, material.concernSolved, material.sendScene].filter(Boolean).join(' · ')
}

module.exports = {
  filterMaterials,
  getMaterialsByIds,
  getMaterialSummary
}
