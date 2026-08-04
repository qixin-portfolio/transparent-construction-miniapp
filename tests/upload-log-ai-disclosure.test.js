const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const test = require('node:test')
const assert = require('node:assert/strict')

const root = path.resolve(__dirname, '..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

const pageScript = read('miniprogram/subpackages/internal/pages/upload-log/upload-log.js')
const markup = read('miniprogram/subpackages/internal/pages/upload-log/upload-log.wxml')
const styles = read('miniprogram/subpackages/internal/pages/upload-log/upload-log.wxss')

function loadPage({ call, storedDraft } = {}) {
  let definition
  vm.runInNewContext(pageScript, {
    Page: (page) => { definition = page },
    require: (request) => {
      if (request.includes('constants')) return { STAGES: [] }
      if (request.includes('stage-flow')) return { resolveStage: () => null, getStageOrder: () => -1 }
      if (request.includes('services/cloud')) return {
        call: call || (() => Promise.resolve({})),
        uploadImage: () => Promise.resolve(''),
        showError: () => {}
      }
      throw new Error(`Unexpected module: ${request}`)
    },
    wx: {
      getStorageSync: () => storedDraft,
      setStorageSync: () => {},
      showToast: () => {}
    },
    console,
    Promise,
    Date
  }, { filename: 'upload-log.js' })
  return definition
}

function createPageInstance(definition) {
  return {
    data: JSON.parse(JSON.stringify(definition.data)),
    saveCount: 0,
    setData(patch) {
      Object.assign(this.data, patch)
    },
    saveDraft() {
      this.saveCount += 1
    },
    getCurrentStage() {
      return { name: '水电施工', code: 'water_electric', progress: 30 }
    },
    focusManualNote() {}
  }
}

test('AI-generated drafts show a persistent disclosure immediately above the editable result fields', () => {
  const disclosureIndex = markup.indexOf('class="ai-generated-result"')
  const firstEditableFieldIndex = markup.indexOf('class="card form-card work-card"')

  assert.ok(disclosureIndex > markup.indexOf('class="ai-draft-card"'))
  assert.ok(disclosureIndex < firstEditableFieldIndex)
  assert.match(markup, /wx:if="\{\{aiContentDisclosureVisible\}\}"/)
  assert.match(markup, /AI生成内容/)
  assert.match(markup, /本页文字由人工智能生成，请人工核验并修改后提交。/)
  assert.match(markup, /AI生成草稿/)
  assert.match(markup, /提交前请核验并修改 AI 生成内容；提交后进入人工审核，不会直接展示给业主。/)
})

test('AI disclosure remains visible while generating, after a failure, and when an AI draft is restored', async () => {
  assert.match(pageScript, /aiContentDisclosureVisible:\s*false/)
  assert.match(pageScript, /aiContentDisclosureVisible:\s*!!\([\s\S]*draft\.aiDraft[\s\S]*draft\.sourceType/)
  assert.match(pageScript, /aiGenerating:\s*true,[\s\S]*aiContentDisclosureVisible:\s*true/)
  assert.match(pageScript, /\.catch\(\(error\) => \{[\s\S]*this\.setData\(\{ aiWarning: message \}\)[\s\S]*this\.saveDraft\(\{ silent: true \}\)/)
  assert.match(pageScript, /aiContentDisclosureVisible: this\.data\.aiContentDisclosureVisible/)
  assert.match(pageScript, /aiContentDisclosureVisible:\s*false,[\s\S]*aiWarning:\s*''/)

  const rejectedPage = loadPage({ call: () => Promise.reject(new Error('AI 服务暂不可用')) })
  const rejectedInstance = createPageInstance(rejectedPage)
  rejectedInstance.data.quickNote = '现场已完成水电开槽'
  await assert.rejects(() => rejectedPage.generateAiReport.call(rejectedInstance), /AI 服务暂不可用/)
  assert.equal(rejectedInstance.data.aiContentDisclosureVisible, true)
  assert.equal(rejectedInstance.data.aiWarning, 'AI 服务暂不可用')
  assert.equal(rejectedInstance.saveCount, 1)

  const restoredPage = loadPage({ storedDraft: {
    sourceType: 'ai_local',
    aiContentDisclosureVisible: true,
    form: { workContent: '恢复的 AI 草稿' }
  } })
  const restoredInstance = createPageInstance(restoredPage)
  restoredInstance.makeDraftKey = () => 'stage-log-draft:test'
  restoredPage.loadDraft.call(restoredInstance)
  assert.equal(restoredInstance.data.aiContentDisclosureVisible, true)
  assert.equal(restoredInstance.data.form.workContent, '恢复的 AI 草稿')
})

test('the disclosure is a visible in-page notice and does not alter AI or submission service calls', () => {
  assert.match(styles, /\.ai-generated-notice\s*\{[\s\S]*background:\s*#E8F5EE/)
  assert.match(styles, /\.ai-generated-notice-title\s*\{[\s\S]*font-weight:\s*900/)
  assert.match(pageScript, /call\('generateStageLogDraft', \{[\s\S]*projectId: this\.data\.projectId/)
  assert.match(pageScript, /call\('submitStageLog', \{[\s\S]*projectId: this\.data\.projectId/)
})
