const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

const DRAWING_MANAGE_ROLES = ['admin', 'boss_qi', 'boss_hu', 'designer']
const DEFAULT_TENANT_ID = 'tenant_shengjing_default'
const DEFAULT_TENANT_NAME = '晟景装饰'

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

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    if (!user) throw new Error('请先登录')

    const drawingId = String(event.drawingId || '').trim()
    if (!drawingId) throw new Error('缺少图纸 ID')

    const action = String(event.action || '').trim()
    // action: 'ownerConfirm' | 'markRead' | 'updateInfo' | 'toggleOwnerVisible'

    const drawingRes = await db.collection('design_drawings').doc(drawingId).get()
    const drawing = drawingRes.data
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    if (drawing.tenantId && drawing.tenantId !== tenantId) throw new Error('无权操作该图纸')

    const now = db.serverDate()
    const updateData = { updatedAt: now }

    if (action === 'ownerConfirm') {
      // 业主确认效果图
      if (user.role !== 'owner') throw new Error('仅业主可确认效果图')
      if (drawing.type !== 'render') throw new Error('仅效果图需要确认')
      // 需校验业主归属
      const projectRes = await db.collection('projects').doc(drawing.projectId).get()
      if (projectRes.data.ownerOpenid !== openid) throw new Error('无权确认此图纸')
      updateData.ownerConfirmed = true
      updateData.confirmedAt = now
      updateData.confirmedByOpenid = openid
    } else if (action === 'markRead') {
      // 工长/内部角色标记已读
      if (user.role === 'owner') throw new Error('业主无需标记已读')
      const readBy = drawing.readBy || []
      const exists = readBy.find((r) => r.openid === openid)
      if (!exists) {
        updateData.readBy = _.push({
          openid,
          name: user.name || user.nickName || '未知',
          role: user.role,
          readAt: now
        })
      } else {
        return { skipped: true, message: '已标记过已读' }
      }
    } else if (action === 'updateInfo') {
      // 设计师/管理员修改备注、标题、空间
      if (DRAWING_MANAGE_ROLES.indexOf(user.role) === -1) {
        throw new Error('无权修改图纸信息')
      }
      if (event.title !== undefined) updateData.title = String(event.title).trim()
      if (event.space !== undefined) updateData.space = String(event.space).trim()
      if (event.remark !== undefined) updateData.remark = String(event.remark).trim()
    } else if (action === 'toggleOwnerVisible') {
      // 切换业主可见性（仅效果图可切，施工图强制不可见）
      if (DRAWING_MANAGE_ROLES.indexOf(user.role) === -1) {
        throw new Error('无权修改可见性')
      }
      if (drawing.type !== 'render') throw new Error('施工图不可对业主开放')
      updateData.ownerVisible = !drawing.ownerVisible
    } else {
      throw new Error('未知的操作类型')
    }

    await db.collection('design_drawings').doc(drawingId).update({ data: updateData })

    return { success: true }
  } catch (error) {
    return { error: { message: error.message || '更新图纸失败' } }
  }
}
