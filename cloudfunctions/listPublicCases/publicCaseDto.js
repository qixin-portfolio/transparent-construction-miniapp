function buildPublicCaseDto({ authorization, project, completionPhotos = [], regionName = '' }) {
  const allowedMaterials = Array.isArray(authorization.allowedMaterials) ? authorization.allowedMaterials : []
  const allowHouseInfo = allowedMaterials.indexOf('house_info') !== -1
  const allowBudget = allowedMaterials.indexOf('budget') !== -1
  const allowPhotos = allowedMaterials.indexOf('completion_photos') !== -1 ||
    allowedMaterials.indexOf('process_photos') !== -1
  const dto = {
    _id: authorization._id || '',
    isReference: false,
    isAuthorized: true,
    allowShowCommunity: allowHouseInfo,
    allowShowBudgetRange: allowBudget,
    regionName
  }

  if (allowHouseInfo) {
    dto.communityName = project.community || project.communityName || ''
    dto.area = project.area || ''
    dto.layout = project.layout || ''
    dto.houseType = project.layout || ''
    dto.style = project.style || ''
  }
  if (allowBudget) {
    dto.exactPrice = project.exactPrice || project.contractAmount || ''
    dto.budgetRange = project.budgetRange || ''
  }
  if (allowPhotos) {
    dto.coverImage = completionPhotos[0] || ''
    dto.completionPhotos = completionPhotos.slice(0, 9)
    dto.photos = completionPhotos.slice(0, 9)
  }
  return dto
}

module.exports = { buildPublicCaseDto }
