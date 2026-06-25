const cloud = require('wx-server-sdk')
const crypto = require('crypto')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const PLAN_MODULES = ['project', 'daily_report', 'owner_view']
const WORKBENCH_URL = '/pages/workbench/workbench'

function cleanText(value, limit) {
  return String(value || '').trim().slice(0, limit)
}

function makeTenantId(openid) {
  const hash = crypto.createHash('sha1').update(openid).digest('hex').slice(0, 16)
  return `tenant_${hash}`
}

async function getDoc(collectionName, id) {
  try {
    const res = await db.collection(collectionName).doc(id).get()
    return res.data || null
  } catch (_) {
    return null
  }
}

async function setDoc(collectionName, id, data) {
  await db.collection(collectionName).doc(id).set({ data })
}

function validateForm(form) {
  if (!form.companyName) throw new Error('请填写公司名称')
  if (!form.bossName) throw new Error('请填写老板姓名')
  if (!form.phone) throw new Error('请填写手机号')
  if (!/^1\d{10}$/.test(form.phone)) throw new Error('手机号格式不正确')
  if (!form.city) throw new Error('请填写所在城市')
}

exports.main = async (event = {}) => {
  try {
    const { OPENID } = cloud.getWXContext()
    const users = db.collection('users')
    const existingUserRes = await users.where({ openid: OPENID }).limit(1).get()
    const existingUser = existingUserRes.data[0] || null

    if (existingUser && existingUser.status && existingUser.status !== 'active') {
      throw new Error('账号已停用，请联系管理员')
    }

    if (existingUser && existingUser.tenantId) {
      return {
        success: true,
        existing: true,
        tenantId: existingUser.tenantId,
        role: existingUser.role || '',
        message: '当前账号已开通过公司',
        redirectUrl: WORKBENCH_URL,
        user: existingUser
      }
    }

    const form = {
      companyName: cleanText(event.companyName, 60),
      bossName: cleanText(event.bossName, 30),
      phone: cleanText(event.phone, 11),
      city: cleanText(event.city, 30),
      mainBusiness: cleanText(event.mainBusiness, 80)
    }
    validateForm(form)

    const tenantId = makeTenantId(OPENID)
    const existedTenant = await getDoc('tenants', tenantId)
    if (existedTenant && existedTenant.createdByOpenid && existedTenant.createdByOpenid !== OPENID) {
      throw new Error('租户标识冲突，请稍后重试')
    }

    const now = db.serverDate()
    const tenantName = form.companyName

    await setDoc('tenants', tenantId, {
      tenantId,
      tenantName,
      name: tenantName,
      shortName: tenantName,
      logoUrl: '',
      contactName: form.bossName,
      contactPhone: form.phone,
      city: form.city,
      mainBusiness: form.mainBusiness,
      status: 'trial',
      plan: 'free',
      createdByOpenid: OPENID,
      createdAt: now,
      updatedAt: now
    })

    await setDoc('subscriptions', tenantId, {
      tenantId,
      tenantName,
      plan: 'free',
      subscriptionPlan: 'free',
      status: 'trial',
      subscriptionStatus: 'trial',
      startAt: now,
      endAt: null,
      maxProjects: 3,
      maxStaff: 3,
      maxUsers: 3,
      enabledModules: PLAN_MODULES,
      paymentStatus: 'unpaid',
      createdAt: now,
      updatedAt: now
    })

    await setDoc('tenant_branding', tenantId, {
      tenantId,
      tenantName,
      companyName: tenantName,
      shortName: tenantName,
      logoUrl: '',
      brandColor: '#304238',
      primaryColor: '#304238',
      secondaryColor: '#CFAE7B',
      contactPhone: form.phone,
      city: form.city,
      mainBusiness: form.mainBusiness,
      slogan: '',
      tags: [],
      createdAt: now,
      updatedAt: now
    })

    let userId = existingUser ? existingUser._id : ''
    const userPatch = {
      openid: OPENID,
      tenantId,
      tenantName,
      name: form.bossName,
      phone: form.phone,
      role: 'admin',
      userType: 'admin',
      status: 'active',
      updatedAt: now
    }

    if (existingUser) {
      await users.doc(existingUser._id).update({ data: userPatch })
    } else {
      const addRes = await users.add({
        data: Object.assign({}, userPatch, {
          createdAt: now
        })
      })
      userId = addRes._id
    }

    const existingTenantUser = await db.collection('tenant_users')
      .where({ tenantId, openid: OPENID })
      .limit(1)
      .get()

    const tenantUserData = {
      tenantId,
      tenantName,
      userId,
      openid: OPENID,
      name: form.bossName,
      phone: form.phone,
      role: 'admin',
      status: 'active',
      updatedAt: now
    }

    if (existingTenantUser.data.length) {
      await db.collection('tenant_users').doc(existingTenantUser.data[0]._id).update({
        data: tenantUserData
      })
    } else {
      await db.collection('tenant_users').add({
        data: Object.assign({}, tenantUserData, {
          createdAt: now
        })
      })
    }

    return {
      success: true,
      existing: false,
      tenantId,
      plan: 'free',
      role: 'admin',
      redirectUrl: WORKBENCH_URL,
      user: Object.assign({ _id: userId }, userPatch)
    }
  } catch (error) {
    return {
      error: {
        message: error.message || '开通公司账号失败'
      }
    }
  }
}
