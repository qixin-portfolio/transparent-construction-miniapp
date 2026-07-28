---
schema_version: 1
task_id: phase-0f-3c-submission-slot-semantic-validation
revision: 5
owner: codex
status: blocked
updated_at: 2026-07-28T13:11:25+08:00
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

- 高：微信开发者工具当前发布 worktree 的 AppID 关联异常，体验版未能上传。

## Human Gate

生产发布已获齐鑫明确确认。当前唯一阻塞是微信开发者工具的 AppID 关联恢复；恢复后仅重试体验版上传。

## Codex 执行记录

- 合并提交：`70724a7838cb641c2ce7f05fac3b736d2ad8b97b`
- 发布分支：`release/pr5-production`
- 检查命令：`node --test tests/stage-log-behavior/*.test.js`
- 结果：`171/171` 通过；真实测试夹具已清理；`stage_log_submission_keys` 存在且为空、ACL 为 `PRIVATE`；三函数于 2026-07-28 13:05-13:06 部署并与本地源码一致。体验版上传未成功。

## 下一步

在微信开发者工具恢复 `wxbfe2172a118ae67f` 对发布 worktree 的 AppID 关联后，重试一次体验版上传；此前不得提交审核、正式发布、打稳定 tag 或启动 style-preview。
