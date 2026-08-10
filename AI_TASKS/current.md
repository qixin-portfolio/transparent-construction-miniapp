---
schema_version: 1
task_id: style-preview-v2-real-pipeline
revision: 12
owner: matrix
status: review_ready
updated_at: 2026-08-04T13:45:00+08:00
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
- `STYLE_PREVIEW_PROVIDER=mock`，`STYLE_PREVIEW_REAL_AI_ENABLED=false`。
- 不部署、查询或修改生产环境业务资源；不修改日报、审核、通知或既有云函数。

## 验收证据

- V2/Task 1 Mock 测试：`7/7`。
- 日报行为回归：`171/171`。
- 两个 V2 函数均为测试环境 `Active`；worker timer `style-preview-worker` 已启用。
- 合成 task 从 `queued` 到 `succeeded`，保存 mock 结果图和风格意向；再次调用返回 `processed:false`。
- 合成 task/session 按 ID 回读为 `0`，`style-preview/spv2_test_tenant_20260804` 文件前缀为空。

## 验收缺口

CloudBase CLI 无法提供小程序 `OPENID` 上下文。因此内部角色/业主拒绝、普通员工隔离、跨 tenant API、真实页面上传和反馈的真机登录态验证，需在微信开发者工具或测试小程序中以合成账号完成。不得以 CLI 伪造身份。

## 下一步

创建 Draft PR 供 Matrix 审核；随后由齐鑫在测试小程序登录态完成页面级验收。真实图片模型仍等待单独 provider/凭证授权。
