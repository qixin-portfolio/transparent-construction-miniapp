const STAFF_ROLES = ['admin', 'boss_qi', 'boss_hu', 'worker', 'project_manager', 'designer', 'sales']

function isOwner(user) {
  return !!user && user.role === 'owner'
}

function isStaff(user) {
  return !!user && STAFF_ROLES.indexOf(user.role) !== -1
}

function getProjectId(project) {
  return String((project && (project.projectId || project._id)) || '').trim()
}

function resolveEntryRoute(user, projects = []) {
  if (isStaff(user)) return { type: 'workbench', user }
  if (!isOwner(user)) return { type: 'public', user: user || null }

  const ownerProjects = (projects || []).filter((project) => getProjectId(project))
  if (ownerProjects.length === 1) {
    return { type: 'owner_detail', user, projectId: getProjectId(ownerProjects[0]) }
  }
  if (ownerProjects.length > 1) return { type: 'owner_projects', user }
  return { type: 'public', user }
}

module.exports = {
  getProjectId,
  isOwner,
  isStaff,
  resolveEntryRoute
}
