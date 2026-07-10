const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'
const MAX_CODE_ATTEMPTS = 5
const CODE_LOCK_MS = 15 * 60 * 1000

function tenantMatches(resourceTenantId, tenantId) {
  return resourceTenantId ? resourceTenantId === tenantId : tenantId === DEFAULT_TENANT_ID
}

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  const user = res.data[0] || null
  if (user && !user.tenantId) {
    user.tenantId = DEFAULT_TENANT_ID
    user.tenantName = DEFAULT_TENANT_NAME
  }
  return { openid: OPENID, user }
}

function assertCodeAttemptAllowed(user) {
  if (Number(user.codeLockedUntil || 0) > Date.now()) {
    throw new Error('绑定码尝试次数过多，请 15 分钟后再试')
  }
}

async function recordCodeFailure(user) {
  const attempts = Number(user.codeFailedAttempts || 0) + 1
  await db.collection('users').doc(user._id).update({
    data: {
      codeFailedAttempts: attempts >= MAX_CODE_ATTEMPTS ? 0 : attempts,
      codeLockedUntil: attempts >= MAX_CODE_ATTEMPTS ? Date.now() + CODE_LOCK_MS : 0,
      updatedAt: db.serverDate()
    }
  })
}

function pickProject(project) {
  if (!project) return null
  return {
    _id: project._id,
    name: project.name || '',
    address: project.address || '',
    status: project.status || '施工中',
    currentStage: project.currentStage || '',
    progress: project.progress || 0,
    tenantId: project.tenantId || DEFAULT_TENANT_ID,
    tenantName: project.tenantName || DEFAULT_TENANT_NAME
  }
}

exports.main = async (event) => {
  try {
    const code = String(event.code || '').replace(/\s/g, '').trim()
    if (!/^\d{6}$/.test(code)) throw new Error('请输入 6 位工长绑定码')

    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    assertCodeAttemptAllowed(user)
    if (['worker', 'project_manager'].indexOf(user.role) === -1) {
      throw new Error('当前绑定码仅供工长或项目经理账号使用，请先用员工邀请码激活')
    }

    const codeRes = await db.collection('worker_project_bind_codes')
      .where({ code, status: 'active' })
      .limit(1)
      .get()
    const bindCode = codeRes.data[0]
    if (!bindCode) {
      await recordCodeFailure(user)
      throw new Error('工长绑定码无效或已使用')
    }

    const nowMs = Date.now()
    if (bindCode.expiresAt <= nowMs) {
      await db.collection('worker_project_bind_codes').doc(bindCode._id).update({
        data: { status: 'expired', updatedAt: db.serverDate() }
      })
      throw new Error('工长绑定码已过期，请联系管理员重新获取')
    }

    const projectRes = await db.collection('projects').doc(bindCode.projectId).get()
    const project = projectRes.data
    if (!project) throw new Error('绑定的工地不存在')

    const tenantId = bindCode.tenantId || project.tenantId || user.tenantId || DEFAULT_TENANT_ID
    const tenantName = bindCode.tenantName || project.tenantName || user.tenantName || DEFAULT_TENANT_NAME
    if (!tenantMatches(bindCode.tenantId, tenantId) || !tenantMatches(project.tenantId, tenantId)) {
      throw new Error('当前账号无权绑定该工地')
    }

    const existingMemberRes = await db.collection('project_members')
      .where({ projectId: project._id, userOpenid: openid })
      .limit(1)
      .get()
    if (existingMemberRes.data.length) {
      return {
        alreadyBound: true,
        project: pickProject(project),
        message: '你已绑定该工地'
      }
    }

    const now = db.serverDate()
    await db.runTransaction(async (transaction) => {
      const freshCodeRes = await transaction.collection('worker_project_bind_codes').doc(bindCode._id).get()
      const freshCode = freshCodeRes.data || null
      if (!freshCode || freshCode.code !== code || freshCode.status !== 'active') {
        throw new Error('工长绑定码无效或已使用')
      }
      if (freshCode.expiresAt <= Date.now()) throw new Error('工长绑定码已过期，请联系管理员重新获取')

      const freshProjectRes = await transaction.collection('projects').doc(bindCode.projectId).get()
      const freshProject = freshProjectRes.data || null
      if (!freshProject) throw new Error('绑定的工地不存在')
      if (freshCode.projectId !== freshProject._id ||
        !tenantMatches(freshCode.tenantId, tenantId) ||
        !tenantMatches(freshProject.tenantId, tenantId)) {
        throw new Error('工长绑定码与工地信息不一致')
      }

      const memberRes = await transaction.collection('project_members')
        .where({ projectId: freshProject._id, userOpenid: openid })
        .limit(1)
        .get()
      if (memberRes.data.length) throw new Error('你已绑定该工地')

      await transaction.collection('project_members').add({
        data: {
          projectId: freshProject._id,
          tenantId,
          tenantName,
          userOpenid: openid,
          userId: user._id || '',
          userName: user.name || '',
          role: user.role === 'project_manager' ? 'project_manager' : 'worker',
          source: 'worker_project_bind_code',
          bindCode: code,
          createdAt: now,
          updatedAt: now
        }
      })
      await transaction.collection('worker_project_bind_codes').doc(bindCode._id).update({
        data: {
          status: 'used',
          usedByOpenid: openid,
          usedByName: user.name || '',
          usedAt: now,
          updatedAt: now
        }
      })
      await transaction.collection('users').doc(user._id).update({
        data: {
          tenantId,
          tenantName,
          codeFailedAttempts: 0,
          codeLockedUntil: 0,
          updatedAt: now
        }
      })
    })

    return {
      bound: true,
      project: pickProject(project),
      message: '工地绑定成功'
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '绑定工地失败'
      }
    }
  }
}
