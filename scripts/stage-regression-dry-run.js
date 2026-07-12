#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const {
  STAGES,
  resolveStage,
  getStageOrder,
  normalizeProgress
} = require('../shared/stage-flow')

function usage() {
  console.log([
    'Usage:',
    '  node scripts/stage-regression-dry-run.js <data.json>',
    '',
    'Input JSON shape:',
    '  {',
    '    "projects": [{ "_id": "...", "name": "...", "currentStage": "...", "progress": 0, "status": "...", "statusCode": "..." }],',
    '    "stage_logs": [{ "_id": "...", "projectId": "...", "stage": "...", "stageCode": "...", "progress": 0, "reviewStatus": "approved", "workContent": "...", "createdAt": "..." }]',
    '  }'
  ].join('\n'))
}

function maskId(value) {
  const text = String(value || '')
  if (text.length <= 8) return text ? `${text.slice(0, 2)}***` : ''
  return `${text.slice(0, 4)}...${text.slice(-4)}`
}

function toTime(value) {
  if (!value) return 0
  if (value instanceof Date) return value.getTime()
  if (value.$date && value.$date.$numberLong) return Number(value.$date.$numberLong)
  if (value.$numberLong) return Number(value.$numberLong)
  const time = new Date(value).getTime()
  return Number.isNaN(time) ? 0 : time
}

function isDelivered(project) {
  const statusCode = String(project.statusCode || '').trim()
  const status = String(project.status || '').trim()
  return ['completed', 'delivered', 'after_sales'].indexOf(statusCode) !== -1 ||
    ['已完工', '已交付', '竣工验收', '售后中'].indexOf(status) !== -1 ||
    normalizeProgress(project.progress) >= 100
}

function inferProjectRepair(project, logs) {
  const approvedLogs = logs
    .filter((log) => (log.reviewStatus || 'pending') === 'approved')
    .map((log) => {
      const stage = resolveStage(log)
      return Object.assign({}, log, {
        resolvedStage: stage,
        stageOrder: stage ? getStageOrder(stage) : -1,
        resolvedProgress: normalizeProgress(log.progress || (stage && stage.progress) || 0),
        createdTime: toTime(log.createdAt || log.submittedAt || log.updatedAt)
      })
    })
    .sort((a, b) => a.createdTime - b.createdTime)

  const highestStageLog = approvedLogs
    .filter((log) => log.stageOrder >= 0)
    .sort((a, b) => b.stageOrder - a.stageOrder || b.createdTime - a.createdTime)[0] || null
  const highestProgress = Math.max(
    normalizeProgress(project.progress),
    ...approvedLogs.map((log) => log.resolvedProgress)
  )
  const currentStage = resolveStage(project)
  const currentOrder = currentStage ? getStageOrder(currentStage) : -1
  const suggestedStage = isDelivered(project)
    ? (resolveStage({ stage: '竣工验收' }) || highestStageLog && highestStageLog.resolvedStage)
    : (highestStageLog && highestStageLog.resolvedStage) || currentStage

  const suspiciousLogs = approvedLogs.filter((log, index) => {
    if (log.stageOrder < 0) return false
    const previousMax = approvedLogs
      .slice(0, index)
      .reduce((max, item) => Math.max(max, item.stageOrder), -1)
    return previousMax >= 0 && log.stageOrder < previousMax
  })

  return {
    projectId: project._id,
    maskedProjectId: maskId(project._id),
    projectName: project.name || project.projectName || '',
    currentStage: project.currentStage || project.stage || '',
    currentStageCode: project.currentStageCode || project.stageCode || '',
    currentStageOrder: currentOrder,
    currentProgress: normalizeProgress(project.progress),
    approvedLogs,
    highestStageLog,
    highestProgress,
    suggestedStage,
    suggestedProgress: isDelivered(project) ? 100 : highestProgress,
    suspiciousLogs,
    needsRepair: !!suggestedStage && (
      (currentOrder >= 0 && getStageOrder(suggestedStage) > currentOrder) ||
      highestProgress > normalizeProgress(project.progress)
    )
  }
}

function renderMarkdown(results) {
  const lines = ['# 工序倒退修复 dry-run 结果', '']
  results.forEach((item, index) => {
    lines.push(`## ${index + 1}. ${item.projectName || '未命名项目'}（${item.maskedProjectId}）`, '')
    lines.push(`- 当前错误工序：${item.currentStage || '未填写'}`)
    lines.push(`- 当前错误进度：${item.currentProgress}%`)
    lines.push(`- 历史最高合法工序：${item.highestStageLog && item.highestStageLog.resolvedStage ? item.highestStageLog.resolvedStage.name : '无法推导'}`)
    lines.push(`- 历史最高合法进度：${item.highestProgress}%`)
    lines.push(`- 建议恢复工序：${item.suggestedStage ? item.suggestedStage.name : '需人工确认'}`)
    lines.push(`- 建议恢复进度：${item.suggestedProgress}%`)
    lines.push(`- 是否需要修复项目字段：${item.needsRepair ? '是' : '否'}`)
    lines.push(`- 疑似误选工序日报：${item.suspiciousLogs.length} 条`)
    if (item.suspiciousLogs.length) {
      item.suspiciousLogs.forEach((log) => {
        lines.push(`  - ${maskId(log._id)} / ${log.createdAt || log.submittedAt || log.updatedAt || '无日期'} / ${log.stage || log.stageCode || '未知工序'} / ${log.resolvedProgress}%`)
      })
    }
    lines.push('')
    lines.push('| 日期 | 工序 | 进度 | 日报ID |')
    lines.push('| --- | --- | ---: | --- |')
    item.approvedLogs.forEach((log) => {
      lines.push(`| ${log.createdAt || log.submittedAt || log.updatedAt || ''} | ${log.stage || log.stageCode || '未知'} | ${log.resolvedProgress}% | ${maskId(log._id)} |`)
    })
    lines.push('')
  })
  return lines.join('\n')
}

function main() {
  const file = process.argv[2]
  if (!file || file === '-h' || file === '--help') {
    usage()
    process.exit(file ? 0 : 1)
  }
  const inputPath = path.resolve(process.cwd(), file)
  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
  const projects = Array.isArray(raw.projects) ? raw.projects : []
  const logs = Array.isArray(raw.stage_logs) ? raw.stage_logs : []
  const results = projects.map((project) => inferProjectRepair(
    project,
    logs.filter((log) => log.projectId === project._id)
  ))

  console.log(renderMarkdown(results))
}

if (require.main === module) {
  main()
}

module.exports = {
  STAGES,
  inferProjectRepair,
  renderMarkdown,
  maskId
}
