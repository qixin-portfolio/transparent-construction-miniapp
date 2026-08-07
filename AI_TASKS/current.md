---
schema_version: 1
task_id: style-preview-v2-real-pipeline
revision: 18
owner: matrix
status: review_ready
updated_at: 2026-08-07T21:18:00+08:00
---

# Current AI Task

## 任务标题

量房风格预览 V2：仅测试环境真实数据、上传与异步 Mock 管线。

## 已完成范围

- 从 Task 1 基线 `c4b7b0c` 建立独立 V2 worktree 和分支。
- 新增 `stylePreviewApi` 与 `processStylePreviewTask`；前者负责服务端身份、tenant、客户、session、task、反馈和临时 URL，后者由测试环境定时触发器领取 queued task。
- 四页接入真实服务端准入；`mock=1` 仍只走本地 Mock，不能打开真实权限。
- 只在 `shengjing-style-test-d3ac90f38b1` 创建 `style_preview_sessions`、`style_preview_tasks` 及所需索引，部署两个 V2 函数与 `style-preview-worker`。
- 合成 `spv2_test_` session/task/图片已完成 worker 成功链路并精确清理。

## 仍关闭的边界

- 生产入口 `ENABLE_STYLE_PREVIEW_ENTRY = false`。
- V2 两处入口 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
- Seedream 真实 Provider 仅在测试环境 worker 中启用；生产环境未配置、未部署、未访问。
- 不部署、查询或修改生产环境业务资源；不修改日报、审核、通知或既有云函数。

## 验收证据

- V2/Task 1 Mock 测试：`7/7`。
- 日报行为回归：`171/171`。
- 两个 V2 函数均为测试环境 `Active`；worker timer `style-preview-worker` 已启用。
- 合成 task 从 `queued` 到 `succeeded`，保存 mock 结果图和风格意向；再次调用返回 `processed:false`。
- 合成 task/session 按 ID 回读为 `0`，`style-preview/spv2_test_tenant_20260804` 文件前缀为空。

## 验收缺口

CloudBase CLI 无法提供小程序 `OPENID` 上下文。因此内部角色/业主拒绝、普通员工隔离、跨 tenant API、真实页面上传和反馈的真机登录态验证，需在微信开发者工具或测试小程序中以合成账号完成。不得以 CLI 伪造身份。

## Seedream 5.0 Task 2B 状态

- 独立分支 `codex/style-preview-v2-seedream5` 只在测试环境代码更新了 `processStylePreviewTask`。
- 用户明确授权的一次真实烟雾 task 已通过非 Lite `doubao-seedream-5-0-pro-260628` 生成并保存；task/session 均为 `succeeded`，usage 为一张图，没有重试或第二个 task。
- 经用户明确确认临时调整 Shadowrocket 路由后，重新打开同一历史记录，原图、参考图和生成结果三张图片均可见；`AI生成图片`、风格意向卡和免责声明同时显示。验证后已恢复原节点与原 `配置` 路由。
- 齐鑫授权的客厅、主卧、厨房三次质量生成均成功，均为单图、`attemptNo=1`、无自动重试；三图人工结构/质量均分 `4.57/5`，没有硬性失败项，达到内部试用标准。
- 本轮真实生成硬上限已用满：冒烟 1 张 + 质量 3 张。四次 provider 平均耗时 `95098 ms`，返回 usage 合计 `generatedImages=4`、`totalTokens=65668`。
- 经齐鑫单独确认后，已按明确 ID/路径删除一名合成客户、五个 session、四个 task 和 12 个文件；session/task/customer/文件前缀及合成权限标记逐项回读均为 `0`。本轮未新建 tenant/user/member/权限夹具。
- 风格预览 `21/21`、日报 `171/171`、全量 JS 语法和 118 个 JSON 解析通过；未访问生产环境，生产和 V2 入口仍关闭。
- 独立分支已 push；Draft PR [#10](https://github.com/qixin-portfolio/transparent-construction-miniapp/pull/10) 以 `codex/style-preview-v2-real-pipeline` 为 base，保持未合并。PR #7、PR #9 未修改。

## 下一步

由 Matrix 审核 Draft PR #10；不得再发起模型请求、部署生产 Provider、打开生产/V2 入口或合并 PR。
