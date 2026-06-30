function toProjectDraft(customer) {
  const name = (customer && customer.name) || ''
  const address = (customer && customer.address) || (customer && customer.community) || ''
  return {
    customerId: (customer && (customer.v1CustomerId || customer.customerId)) || '',
    customerName: name,
    address,
    name: address ? `${address} 透明工地` : `${name} 透明工地`,
    ownerOpenid: '',
    status: '施工中',
    statusCode: 'in_progress'
  }
}

function toCaseDraft(caseAsset) {
  return {
    title: (caseAsset && caseAsset.title) || '',
    projectId: (caseAsset && caseAsset.projectId) || '',
    customerId: (caseAsset && caseAsset.customerId) || '',
    authorizationStatus: (caseAsset && caseAsset.authorizationStatus) || 'pending',
    publishTargets: (caseAsset && caseAsset.publishTargets) || []
  }
}

module.exports = {
  toProjectDraft,
  toCaseDraft
}
