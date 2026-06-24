const { call, showError } = require('../../../../services/cloud')

Page({
  data: {
    loading: false,
    submitting: false,
    projectId: '',
    scopeOptions: [
      { code: 'private', name: '仅本人查看' },
      { code: 'internal', name: '仅晟景内部学习' },
      { code: 'public', name: '允许公开展示' }
    ],
    scopeIndex: 0,
    selectedScopeName: '仅本人查看',
    materialOptions: [
      { code: 'completion_photos', name: '竣工照片', checked: true },
      { code: 'process_photos', name: '施工过程照片', checked: false },
      { code: 'house_info', name: '户型/面积/风格', checked: true },
      { code: 'owner_comment', name: '业主评价', checked: false }
    ],
    nameOptions: ['匿名展示', '只显示姓氏', '显示全名'],
    nameIndex: 0,
    selectedNameText: '匿名展示'
  },

  onLoad(options) {
    this.setData({ projectId: String(options.projectId || '').trim() })
    this.loadAuthorization()
  },

  loadAuthorization() {
    this.setData({ loading: true })
    call('getCaseAuthorization', { projectId: this.data.projectId })
      .then((res) => {
        const auth = res.authorization || {}
        const scopeIndex = Math.max(0, this.data.scopeOptions.findIndex((item) => item.code === auth.authorizationScope))
        const allowed = auth.allowedMaterials || []
        const materialOptions = this.data.materialOptions.map((item) => Object.assign({}, item, {
          checked: allowed.length ? allowed.indexOf(item.code) !== -1 : item.checked
        }))
        const nameMap = { anonymous: 0, surname: 1, full: 2 }
        this.setData({
          scopeIndex,
          materialOptions,
          nameIndex: nameMap[auth.ownerNameDisplay] || 0
        }, () => this.syncSelectedText())
      })
      .catch((error) => showError('授权加载失败', error))
      .finally(() => this.setData({ loading: false }))
  },

  syncSelectedText() {
    this.setData({
      selectedScopeName: this.data.scopeOptions[this.data.scopeIndex].name,
      selectedNameText: this.data.nameOptions[this.data.nameIndex]
    })
  },

  onScopeChange(event) {
    this.setData({ scopeIndex: Number(event.detail.value) || 0 }, () => this.syncSelectedText())
  },

  onNameChange(event) {
    this.setData({ nameIndex: Number(event.detail.value) || 0 }, () => this.syncSelectedText())
  },

  toggleMaterial(event) {
    const index = event.currentTarget.dataset.index
    const items = this.data.materialOptions.slice()
    items[index].checked = !items[index].checked
    this.setData({ materialOptions: items })
  },

  submit() {
    if (this.data.submitting) return
    const nameCodes = ['anonymous', 'surname', 'full']
    const allowedMaterials = this.data.materialOptions.filter((item) => item.checked).map((item) => item.code)
    this.setData({ submitting: true })
    call('updateCaseAuthorization', {
      projectId: this.data.projectId,
      authorizationScope: this.data.scopeOptions[this.data.scopeIndex].code,
      allowedMaterials,
      ownerNameDisplay: nameCodes[this.data.nameIndex]
    })
      .then(() => {
        wx.showToast({ title: '已保存', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 600)
      })
      .catch((error) => showError('保存授权失败', error))
      .finally(() => this.setData({ submitting: false }))
  }
})
