---
schema_version: 1
task_id: style-preview-v2-real-pipeline
revision: 20
owner: qixin
status: review_ready
updated_at: 2026-08-08T09:47:13+08:00
---

# Current AI Task

## 任务标题

量房风格预览 V2：Seedream 5.0 Provider 接入与安全审查。

## 当前状态

- Seedream 5.0 已在测试环境完成真实验证。
- PR #10 保持 Draft，依赖 PR #9 的 stacked PR 结构。
- Ark 请求和 Seedream 结果下载的精确 hostname allowlist 已完成，等待 ChatGPT 审查。
- ChatGPT 负责当前 PR 审查与后续技术决策，不设置 Matrix Reviewer Gate。

## 已完成范围

- Seedream Provider 接入。
- source/reference 输入校验。
- Ark 请求流程。
- 结果下载、验证、CloudBase 存储。
- Ark API 与 Seedream 结果下载独立 allowlist；非法目标在 dispatch/download 前 fail closed，redirect 不跟随。
- Provider 离线测试 `15/15`、风格预览 `25/25`、日报回归 `171/171`。
- 测试环境真实 smoke 和三组质量验证。

## 下一步

- ChatGPT 审查 PR #9、PR #10、allowlist diff 和测试结果。
- 不发起新的模型请求。
- 不部署云函数或生产环境，不合并 PR #9/#10。
