---
schema_version: 1
task_id: phase-0f-3c-submission-slot-semantic-validation
revision: 11
owner: matrix
status: review_ready
updated_at: 2026-07-28T16:50:00+08:00
---

# Current AI Task

## 任务标题

量房风格预览 V1 Task 1：独立子包本地 Mock MVP。

## 任务来源

- 用户于 2026-07-28 明确授权独立开发；微信小程序 `7.3.2` 正式审核发布不再阻塞本轮 Mock 开发。

## 本次范围

允许：在 `codex/style-preview-v1` 独立 worktree 中增加隐藏的量房风格预览入口、独立子包页面与本地 Mock service；可本地 commit、push 和创建 Draft PR。

禁止：真实 AI、CloudBase 集合或云函数、部署、体验版上传、生产入口、客户阶段和正式项目写入、业主端入口、报价/BOM/施工图/户型改造/批量生成；不得合并到 release 或生产基线。

## 交付物

- `miniprogram/subpackages/style-preview/` 独立子包，含开始、处理中、结果、历史四页。
- 客户详情隐藏入口：`ENABLE_STYLE_PREVIEW_ENTRY = false`，仅 `stylePreviewMock=1` 显式 Mock 参数可见。
- 独立本地 Mock service 和回归测试；不访问 CloudBase，不产生生产数据。

## 验收标准

- 入口关闭时既有用户不可见，开发 Mock 参数下可进入完整可点击流程。
- 可选择 Mock 客户、两张本地图片、房间类型与备注，并可经过 Mock 处理看到完整结果、保存反馈和查看历史。
- 刷新后本地 fixture 可恢复；V2 两处入口仍关闭；不出现 `wx.cloud`、云函数调用或生产数据写入。

## 风险等级

- 低：仅本地 Mock 子包；入口默认关闭，且无后端、云函数或环境配置改动。

## Human Gate

正式发布仍是未来将本分支 rebase 到稳定 tag 并开启入口前的 Gate。本轮不等待、不部署、不上传体验版。

## Codex 执行记录

- worktree：`/Users/qixin/Documents/晟景AI助理/transparent-construction-style-preview-v1`
- 分支：`codex/style-preview-v1`
- 起点：`821d96efa7f4d1495939703cc58d028a2ea75d6d`
- 本地验收：Mock service 与页面链路回归 `3/3`、既有日报回归 `171/171`、style-preview JS 语法检查、全量 miniprogram JSON 解析、`git diff --check` 均通过；页面链路用小程序 API mock 覆盖开发 Mock 参数进入、两张 `chooseMedia` 本地图片选择、开始页创建、处理完成、结果跳转、反馈保存、历史读取。CloudBase/云函数/真实 AI 扫描为空，V2 两处开关仍为 `false`。
- GUI 验证：开发者工具桌面自动化服务超时；CLI `open` 命令连接到已有 IDE 实例时没有返回项目打开成功。未上传体验版、未部署、未访问 CloudBase；需在桌面工具恢复可用后补一次视觉走查。

## 下一步

提交并推送 `codex/style-preview-v1` 后停止，等待 `7.3.2` 正式发布和一次 GUI 视觉走查；届时 rebase 到稳定 tag，再进入 Task 2 的真实数据层、云函数任务和测试环境 AI 链路。
