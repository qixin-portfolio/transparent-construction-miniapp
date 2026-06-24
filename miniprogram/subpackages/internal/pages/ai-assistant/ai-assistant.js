const aiAssistant = require('../../../../config/ai-assistant')
const assistant = require('./assistant-data')
const { call, showError } = require('../../../../services/cloud')

const ALLOWED_ROLES = ['admin', 'boss_qi', 'boss_hu', 'designer', 'sales']
const OUTPUT_PLACEHOLDER = '填写资料后点击“生成”。'
const STORAGE_KEY = 'shengjing-ai-records-mp'

function buildFields(flow, values) {
  const formValues = values || {}
  return flow.fields.map((field) => {
    const next = Object.assign({}, field)
    if (field.type === 'select') {
      const selectedValue = formValues[field.key] || field.options[0]
      const selectedIndex = Math.max(field.options.indexOf(selectedValue), 0)
      next.selectedIndex = selectedIndex
      next.value = field.options[selectedIndex]
      return next
    }
    next.value = formValues[field.key] || ''
    return next
  })
}

Page({
  data: {
    authorized: false,
    loading: true,
    title: aiAssistant.title,
    sourceName: aiAssistant.sourceName,
    localFilePath: aiAssistant.localFilePath,
    flowTabs: assistant.flows.map((flow) => ({
      key: flow.key,
      title: flow.title
    })),
    currentFlowKey: 'customer',
    currentFlow: assistant.getFlow('customer'),
    fields: buildFields(assistant.getFlow('customer')),
    photos: [],
    output: OUTPUT_PLACEHOLDER,
    hasOutput: false,
    toolStats: {
      filled: 0,
      total: assistant.getFlow('customer').fields.filter((field) => field.type !== 'photos').length,
      photos: 0
    },
    history: [],
    syncing: false
  },

  onLoad() {
    const app = getApp()
    app.ensureLogin()
      .then((user) => {
        const authorized = user && ALLOWED_ROLES.indexOf(user.role) !== -1
        this.setData({
          authorized,
          loading: false,
          history: this.getHistory()
        })
        if (!authorized) {
          wx.showToast({
            title: '无权限访问',
            icon: 'none'
          })
          setTimeout(() => {
            wx.switchTab({ url: '/pages/workbench/workbench' })
          }, 600)
        }
      })
      .catch(() => {
        this.setData({ authorized: false, loading: false })
        wx.switchTab({ url: '/pages/workbench/workbench' })
      })
  },

  switchFlow(event) {
    const key = event.currentTarget.dataset.key
    const flow = assistant.getFlow(key)
    this.setData({
      currentFlowKey: key,
      currentFlow: flow,
      fields: buildFields(flow),
      photos: [],
      output: OUTPUT_PLACEHOLDER,
      hasOutput: false,
      toolStats: this.makeToolStats(buildFields(flow), [])
    })
  },

  updateField(event) {
    const index = event.currentTarget.dataset.index
    const fields = this.data.fields.slice()
    fields[index] = Object.assign({}, fields[index], {
      value: event.detail.value
    })
    this.setData({
      fields,
      hasOutput: false,
      toolStats: this.makeToolStats(fields, this.data.photos)
    })
  },

  updatePicker(event) {
    const index = event.currentTarget.dataset.index
    const selectedIndex = Number(event.detail.value)
    const field = this.data.fields[index]
    const fields = this.data.fields.slice()
    fields[index] = Object.assign({}, field, {
      selectedIndex,
      value: field.options[selectedIndex]
    })
    this.setData({
      fields,
      hasOutput: false,
      toolStats: this.makeToolStats(fields, this.data.photos)
    })
  },

  choosePhotos() {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const base = this.data.photos.length
        const photos = res.tempFiles.map((file, index) => ({
          path: file.tempFilePath,
          name: `现场照片${base + index + 1}`
        }))
        const nextPhotos = this.data.photos.concat(photos).slice(0, 9)
        this.setData({
          photos: nextPhotos,
          hasOutput: false,
          toolStats: this.makeToolStats(this.data.fields, nextPhotos)
        })
      }
    })
  },

  removePhoto(event) {
    const index = event.currentTarget.dataset.index
    const photos = this.data.photos.slice()
    photos.splice(index, 1)
    this.setData({
      photos,
      hasOutput: false,
      toolStats: this.makeToolStats(this.data.fields, photos)
    })
  },

  fillSample() {
    const flow = assistant.getFlow(this.data.currentFlowKey)
    const fields = buildFields(flow, flow.sample)
    this.setData({
      fields,
      photos: [],
      output: OUTPUT_PLACEHOLDER,
      hasOutput: false,
      toolStats: this.makeToolStats(fields, [])
    })
  },

  clearForm() {
    const flow = assistant.getFlow(this.data.currentFlowKey)
    const fields = buildFields(flow)
    this.setData({
      fields,
      photos: [],
      output: OUTPUT_PLACEHOLDER,
      hasOutput: false,
      toolStats: this.makeToolStats(fields, [])
    })
  },

  makeToolStats(fields, photos) {
    const normalFields = (fields || []).filter((field) => field.type !== 'photos')
    return {
      filled: normalFields.filter((field) => String(field.value || '').trim()).length,
      total: normalFields.length,
      photos: (photos || []).length
    }
  },

  collectForm() {
    return this.data.fields.reduce((form, field) => {
      if (field.type !== 'photos') {
        form[field.key] = field.value || ''
      }
      return form
    }, {})
  },

  generate() {
    const form = this.collectForm()
    const photoNames = this.data.photos.map((photo) => photo.name)
    const output = assistant.generateOutput(this.data.currentFlowKey, form, photoNames)
    this.setData({ output, hasOutput: true }, () => this.scrollToOutput())
    return output
  },

  scrollToOutput() {
    if (!wx.pageScrollTo) return
    wx.pageScrollTo({
      selector: '.output-card',
      duration: 220
    })
  },

  copyOutput() {
    const output = this.data.output === OUTPUT_PLACEHOLDER ? this.generate() : this.data.output
    wx.setClipboardData({
      data: output,
      success() {
        wx.showToast({
          title: '已复制',
          icon: 'success'
        })
      }
    })
  },

  saveRecord() {
    const output = this.data.output === OUTPUT_PLACEHOLDER ? this.generate() : this.data.output
    const history = this.getHistory()
    const flow = assistant.getFlow(this.data.currentFlowKey)
    history.unshift({
      id: Date.now(),
      flow: flow.title,
      date: this.formatDate(new Date()),
      content: output
    })
    const nextHistory = history.slice(0, 20)
    wx.setStorageSync(STORAGE_KEY, nextHistory)
    this.setData({ history: nextHistory })
    wx.showToast({
      title: '已保存',
      icon: 'success'
    })
  },

  openHistory(event) {
    const id = Number(event.currentTarget.dataset.id)
    const record = this.data.history.find((item) => item.id === id)
    if (record) {
      this.setData({ output: record.content, hasOutput: true }, () => this.scrollToOutput())
    }
  },

  getHistory() {
    return wx.getStorageSync(STORAGE_KEY) || []
  },

  formatDate(date) {
    const month = `${date.getMonth() + 1}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    const hour = `${date.getHours()}`.padStart(2, '0')
    const minute = `${date.getMinutes()}`.padStart(2, '0')
    return `${month}月${day}日 ${hour}:${minute}`
  },

  copyLocalPath() {
    wx.setClipboardData({
      data: this.data.localFilePath,
      success() {
        wx.showToast({
          title: '已复制源文件',
          icon: 'success'
        })
      }
    })
  },

  backHome() {
    wx.switchTab({ url: '/pages/workbench/workbench' })
  },

  syncToCustomer() {
    if (this.data.currentFlowKey !== 'customer') return
    const form = this.collectForm()
    if (!form.name || !form.name.trim()) {
      showError('请先填写客户称呼')
      return
    }

    // AI助理"客户需求整理"字段 → 客户库字段映射
    const address = [form.community, form.area].filter((s) => s && s.trim()).join('，')
    const needParts = []
    if (form.budget) needParts.push('预算：' + form.budget)
    if (form.style) needParts.push('风格：' + form.style)
    if (form.notes) needParts.push('原始记录：' + form.notes)
    const need = needParts.join('\n')

    // AI助理阶段 → 客户库阶段映射
    const stageMap = {
      '刚咨询': '咨询',
      '已到店': '已到店',
      '已量房': '已量房',
      '已看样板间': '已量房',
      '已出图': '已出图',
      '已报价': '已报价',
      '准备签单': '准备签单'
    }
    const stage = stageMap[form.stage] || '咨询'

    const payload = {
      name: form.name.trim(),
      phone: '',
      source: 'AI助理',
      address,
      need,
      stage,
      dealStatus: '未成交'
    }

    this.setData({ syncing: true })
    call('createCustomer', payload)
      .then((res) => {
        if (res.error) {
          showError('同步失败', res.error)
          return
        }
        wx.showModal({
          title: '已同步到客户库',
          content: '客户信息已保存到客户库，可在客户库中查看和补充电话等资料。',
          showCancel: false,
          confirmText: '知道了'
        })
      })
      .catch((error) => {
        showError('同步失败', error)
      })
      .finally(() => {
        this.setData({ syncing: false })
      })
  }
})
