---
schema_version: 1
task_id: style-preview-v2-real-pipeline
revision: 21
owner: qixin
status: review_ready
updated_at: 2026-08-08T10:54:07+08:00
---

# Current AI Task

## 任务标题

量房风格预览 V2：Seedream 5.0 Provider 接入与安全审查。

## 当前状态

- Seedream 5.0 已在测试环境完成真实验证。
- PR #10 保持 Draft，依赖 PR #9 的 stacked PR 结构。
- ChatGPT 指出的 3 项 P0 已完成：全局 CloudBase 恢复生产环境、Style Preview 请求和上传显式选择独立测试环境、legacy tenant 和图片 fileID 校验 fail closed。
- Ark 请求和 Seedream 结果下载的精确 hostname allowlist 保持不变，Seedream Provider 输入路径已同步收紧。
- ChatGPT 负责当前 PR 审查与后续技术决策，不设置 Matrix Reviewer Gate。

## 已完成范围

- Seedream Provider 接入。
- source/reference 输入仅接受当前 tenant/customer/session/kind 的精确路径，扩展名与 MIME/魔数必须匹配。
- Ark 请求流程。
- 结果下载、验证、CloudBase 存储。
- Ark API 与 Seedream 结果下载独立 allowlist；非法目标在 dispatch/download 前 fail closed，redirect 不跟随。
- 新增 19 项顶层行为测试（PR #9 安全测试 18 项 + PR #10 Provider 严格输入 1 项）。
- Provider 离线测试 `16/16`、风格预览 `44/44`、日报回归 `171/171`；187 个 JS 语法、118 个 JSON、敏感信息和入口/环境隔离检查通过。
- 测试环境真实 smoke 和三组质量验证。

## 下一步

- ChatGPT 二次审查 PR #9、PR #10 的 P0 修复与测试结果。
- 不发起新的模型请求。
- 不部署云函数或生产环境，不合并 PR #9/#10。
