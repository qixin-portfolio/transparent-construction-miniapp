const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'

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

async function assertOwnerProject(openid, tenantId, projectId) {
  if (!projectId) throw new Error('缺少已绑定工地，不能提交推荐')
  const res = await db.collection('projects').doc(projectId).get()
  const project = res.data || null
  if (!project) throw new Error('工地不存在')
  if (!tenantMatches(project.tenantId, tenantId)) throw new Error('当前账号无权推荐该工地')
  const ownerOpenids = Array.isArray(project.ownerOpenids) ? project.ownerOpenids : []
  if (project.ownerOpenid !== openid && ownerOpenids.indexOf(openid) === -1) {
    throw new Error('当前账号无权推荐该工地')
  }
  return project
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    const tenantName = user.tenantName || DEFAULT_TENANT_NAME
    const projectId = String(event.projectId || '').trim()
    const project = await assertOwnerProject(openid, tenantId, projectId)
    const friendName = String(event.friendName || '').trim()
    const friendPhone = String(event.friendPhone || '').trim()
    const friendCommunity = String(event.friendCommunity || '').trim()
    const need = String(event.need || '').trim()
    const remark = String(event.remark || '').trim()
    const referrerName = String(event.referrerName || user.name || '').trim()

    if (!friendName) throw new Error('请填写朋友姓名')
    if (!friendPhone) throw new Error('请填写朋友电话')

    const now = db.serverDate()
    const customer = {
      tenantId,
      tenantName,
      name: friendName,
      phone: friendPhone,
      source: '老客户推荐',
      address: friendCommunity,
      need,
      stage: '咨询',
      dealStatus: '未成交',
      ownerOpenid: '',
      referralOwnerOpenid: openid,
      createdAt: now,
      updatedAt: now
    }
    const result = await db.runTransaction(async (transaction) => {
      const customerRes = await transaction.collection('customers').add({ data: customer })
      const record = {
        tenantId,
        tenantName,
        projectId,
        projectName: project.name || '',
        ownerId: user._id || '',
        ownerOpenid: openid,
        referrerName,
        friendName,
        friendPhone,
        friendCommunity,
        need,
        remark,
        status: 'submitted',
        rewardStatus: 'none',
        customerId: customerRes._id,
        createdAt: now,
        updatedAt: now
      }
      const referralRes = await transaction.collection('referral_records').add({ data: record })
      return { id: referralRes._id, customerId: customerRes._id }
    })
    return result
  } catch (error) {
    return { error: { message: error.message || '提交推荐失败' } }
  }
}
