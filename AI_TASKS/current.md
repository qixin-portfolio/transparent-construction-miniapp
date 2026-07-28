---
schema_version: 1
task_id: phase-0f-3c-submission-slot-semantic-validation
revision: 7
owner: codex
status: in_progress
updated_at: 2026-07-28T13:30:00+08:00
---

# Current AI Task

## 任务标题

PR #6：最小受控生产发布。

## 任务来源

- 用户于 2026-07-28 明确确认生产发布。

## 本次范围

允许：从 PR #6 merge commit 精确部署白名单云函数、上传体验版、完成发布验证与证据记录。

禁止：部署非白名单函数、修改生产集合之外的数据、导入测试数据、合并其它 PR、修改 V2 开关，或进入量房风格预览 Task 1。

## 交付物

- 已部署三函数的生产证据。
- 体验版上传与验证证据。
- 正式发布记录、稳定 tag 与回滚计划。

## 验收标准

- PR #6 merge commit、生产集合 ACL 与三函数源码一致性已验证。
- 体验版 `7.3.2` 上传成功后，完成最小核心链路验证。
- 正式发布成功后，建立 `v1-stage-hotfix-stable` annotated tag 和完整发布记录。

## 风险等级

- 中：体验版已上传；微信公众平台的审核提交与正式发布仍待人工完成。

## Human Gate

生产发布已获齐鑫明确确认。开发者工具 AppID 关联已恢复，体验版已上传；微信公众平台的审核提交与正式发布保留为人工门。

## Codex 执行记录

- 合并提交：`70724a7838cb641c2ce7f05fac3b736d2ad8b97b`
- 发布分支：`release/pr5-production`
- 检查命令：`node --test tests/stage-log-behavior/*.test.js`
- 结果：`171/171` 已在锁定 merge commit 再次通过；真实测试夹具已清理；`stage_log_submission_keys` 存在且为空、ACL 为 `PRIVATE`；三函数于 2026-07-28 13:05-13:06 部署并与本地源码一致。开发者工具已从干净 merge worktree 成功上传体验版 `7.3.2`；体验版最小验证按真实测试环境、既有真机证据和候选回归矩阵固化，未在生产制造 rejected、并发或通知夹具。

## 下一步

在微信公众平台版本管理中确认体验版 `7.3.2`，提交审核；审核通过后发布。正式发布成功前不得打稳定 tag 或启动 style-preview。
