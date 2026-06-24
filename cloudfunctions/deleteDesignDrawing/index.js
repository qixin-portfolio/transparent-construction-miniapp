const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

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
    if (DRAWING_MANAGE_ROLES.indexOf(user.role) === -1) {
      throw new Error('当前账号没有删除图纸的权限')
    }

    const drawingId = String(event.drawingId || '').trim()
    if (!drawingId) throw new Error('缺少图纸 ID')

    const drawingRes = await db.collection('design_drawings').doc(drawingId).get()
    const drawing = drawingRes.data
    const tenantId = user.tenantId || DEFAULT_TENANT_ID
    if (drawing.tenantId && drawing.tenantId !== tenantId) {
      throw new Error('无权删除该图纸')
    }

    // 非管理员只能删自己上传的
    const isAdmin = ['admin', 'boss_qi', 'boss_hu'].indexOf(user.role) !== -1
    if (!isAdmin && drawing.uploadedBy && drawing.uploadedBy.openid !== openid) {
      throw new Error('只能删除自己上传的图纸')
    }

    // 删除云存储文件（失败不阻断）
    if (drawing.fileID) {
      try {
        await cloud.deleteFile({ fileList: [drawing.fileID] })
      } catch (e) {
        // 忽略文件删除失败
      }
    }

    await db.collection('design_drawings').doc(drawingId).remove()

    return { success: true }
  } catch (error) {
    return { error: { message: error.message || '删除图纸失败' } }
  }
}
