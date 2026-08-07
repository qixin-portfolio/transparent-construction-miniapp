---
schema_version: 1
task_id: style-preview-v2-real-pipeline
revision: 19
owner: qixin
status: review_ready
updated_at: 2026-08-07T23:53:00+08:00
---

# Current AI Task

## 任务标题

量房风格预览 V2：Seedream 5.0 Provider 接入与安全审查。

## 当前状态

- Seedream 5.0 已在测试环境完成真实验证。
- PR #10 保持 Draft，依赖 PR #9 的 stacked PR 结构。
- ChatGPT 负责当前 PR 审查与后续技术决策，不设置 Matrix Reviewer Gate。

## 已完成范围

- Seedream Provider 接入。
- source/reference 输入校验。
- Ark 请求流程。
- 结果下载、验证、CloudBase 存储。
- 测试环境真实 smoke 和三组质量验证。

## 下一步

- 修复 Seedream Provider 网络 allowlist。
- 完成安全测试。
- ChatGPT 审查 PR diff 和测试结果。
- 不发起新的模型请求。
- 不部署生产。
