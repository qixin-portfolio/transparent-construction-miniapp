const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const DRAWING_UPLOAD_ROLES = ['admin', 'boss_qi', 'boss_hu', 'designer']

const VALID_TYPES = ['render', 'construction']
const VALID_SPACES = [
  'whole_house', 'living_room', 'master_bedroom', 'second_bedroom',
  'kitchen', 'bathroom', 'entrance', 'balcony', 'study'
]

async function getCurrentUser() {
  const { OPENID } = cloud.getWXContext()
  const res = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
  return { openid: OPENID, user: res.data[0] || null }
}

function assertRole(user, roles) {
  if (!user || roles.indexOf(user.role) === -1) {
    throw new Error('当前账号没有上传图纸的权限')
  }
}

exports.main = async (event) => {
  try {
    const { openid, user } = await getCurrentUser()
    assertRole(user, DRAWING_UPLOAD_ROLES)

    const projectId = String(event.projectId || '').trim()
    const type = String(event.type || '').trim()
    const space = String(event.space || '').trim()
    const title = String(event.title || '').trim()
    const fileID = String(event.fileID || '').trim()
    const remark = String(event.remark || '').trim()
    const ownerVisible = event.ownerVisible !== false

    if (!projectId) throw new Error('缺少工地 ID')
    if (VALID_TYPES.indexOf(type) === -1) throw new Error('图纸类型无效')
    if (VALID_SPACES.indexOf(space) === -1) throw new Error('空间分类无效')
    if (!title) throw new Error('图纸标题不能为空')
    if (!fileID) throw new Error('缺少图纸文件')

    // 效果图默认业主可见，施工图默认不可见
    const finalOwnerVisible = type === 'render' ? ownerVisible : false

    const now = db.serverDate()
    const drawing = {
      projectId,
      type,
      space,
      title,
      fileID,
      remark,
      ownerVisible: finalOwnerVisible,
      ownerConfirmed: false,
      confirmedAt: null,
      confirmedByOpenid: '',
      readBy: [],
      uploadedBy: {
        openid,
        name: user.name || user.nickName || '未知',
        role: user.role
      },
      createdAt: now,
      updatedAt: now
    }

    const res = await db.collection('design_drawings').add({ data: drawing })

    // 更新工地 updateTime
    await db.collection('projects').doc(projectId).update({
      data: { updatedAt: now }
    })

    return { id: res._id }
  } catch (error) {
    return { error: { message: error.message || '上传图纸失败' } }
  }
}
