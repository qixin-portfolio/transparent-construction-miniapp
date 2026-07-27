---
schema_version: 1
task_id: phase-0f-3b-business-date-and-submission-slot-consistency
revision: 1
owner: matrix
status: review_ready
updated_at: 2026-07-27T00:00:00+08:00
---

# Current AI Task

## 任务标题

Phase 0F-3B：修复业务日期漂移与提交槽位一致性缺口。

## 任务来源

- 用户定向任务；基于 `pr5-remediation-v2-independent-review` 的第三次独立复审阻塞项。

## 本次范围

允许：固定请求级中国业务日期；提交槽位完整关联校验；旧数据识别；提交和审核事务失败路径测试；定向文档。

禁止：创建 CloudBase 集合、访问或修改任何云环境、部署、发布候选、push、tag、merge，以及进入量房风格预览 Task 1。

## 交付物

- 共享提交槽位校验模块与生成副本。
- 第三轮 `34` 项本地行为测试。
- `docs/pr5-remediation-v3/` 定向复审资料。

## 验收标准

- 本地日报行为测试 `123/123` 通过。
- 新结构日报缺 key 或任一关联字段不一致时零业务写入、零通知。
- 仅可进入新的独立代码复审。

## 风险等级

- 高：本地模拟不能证明真实 CloudBase 事务、权限、重试和索引行为。

## Human Gate

是否需要人工确认：是。

需要确认的事项：独立复审通过后，才可讨论测试集合、测试环境或后续发布 Gate；本轮不授权任何此类操作。

## Codex 执行记录

- 分支：`fix/pr5-release-blockers-v3`
- 起点：`8d4c017ca4b0dfb3cc0f6d32762d7f4d4ae20a35`
- PR：未创建，未 push
- 检查命令：`node --test tests/stage-log-behavior/*.test.js`
- 结果：`123/123` 通过；仅本地验证。

## 下一步

由新的独立复审核对本轮代码与测试；不得直接部署测试环境。
