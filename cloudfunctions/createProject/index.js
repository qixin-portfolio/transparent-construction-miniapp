const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const PROJECT_CREATE_ROLES = ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales']

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  return { openid: OPENID, user: res.data[0] || null }
}

function assertRole(user, roles) {
  if (!user || roles.indexOf(user.role) === -1) {
    throw new Error('当前账号没有新建工地的权限')
  }
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    assertRole(user, PROJECT_CREATE_ROLES)

    const name = String(event.name || '').trim()
    const address = String(event.address || '').trim()
    if (!name) throw new Error('工地名称不能为空')

    const now = db.serverDate()
    const project = {
      name,
      customerId: String(event.customerId || '').trim(),
      customerName: String(event.customerName || '').trim(),
      address,
      ownerOpenid: String(event.ownerOpenid || '').trim(),
      currentStage: '开工交底',
      progress: 10,
      status: '施工中',
      createdByOpenid: openid,
      updatedByOpenid: openid,
      createdAt: now,
      updatedAt: now
    }

    const res = await db.collection('projects').add({ data: project })
    await db.collection('project_members').add({
      data: {
        projectId: res._id,
        userOpenid: openid,
        role: user.role,
        createdAt: now,
        updatedAt: now
      }
    })

    return { id: res._id }
  } catch (error) {
    return {
      error: {
        message: error.message || '新建工地失败'
      }
    }
  }
}
