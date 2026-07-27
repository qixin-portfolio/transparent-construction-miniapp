---
schema_version: 1
task_id: phase-0f-3c-submission-slot-semantic-validation
revision: 2
owner: matrix
status: review_ready
updated_at: 2026-07-27T00:00:00+08:00
---

# Current AI Task

## 任务标题

Phase 0F-3C：修复提交槽位语义合法性校验。

## 任务来源

- 用户定向任务；基于 `pr5-remediation-v3-independent-review` 的第四次独立复审阻塞项。

## 本次范围

允许：统一校验 key 和新结构日报的 attemptNo、businessDate、状态、ID 与规范派生 key ID；submit/review service 层失败路径测试；定向文档。

禁止：创建 CloudBase 集合、访问或修改任何云环境、部署、发布候选、push、tag、merge，以及进入量房风格预览 Task 1。

## 交付物

- 共享提交槽位语义校验和生成副本。
- 第四轮 `48` 项本地 service 行为测试。
- `docs/pr5-remediation-v4/` 定向复审资料。

## 验收标准

- 本地日报行为测试 `171/171` 通过。
- 非法新结构 slot 统一返回 `SUBMISSION_STATE_INCONSISTENT`，submit 零写入、review 零半更新且零通知。
- 仅可进入第五次独立代码复审。

## 风险等级

- 高：本地模拟不能证明真实 CloudBase 事务、权限、重试和索引行为。

## Human Gate

是否需要人工确认：是。

需要确认的事项：第五次独立复审通过后，才可由人工讨论测试集合、测试环境或后续发布 Gate；本轮不授权任何此类操作。

## Codex 执行记录

- 分支：`fix/pr5-release-blockers-v4`
- 起点：`56139ab1b69922eaaa6f81b9b4797b0234dc139e`
- PR：未创建，未 push
- 检查命令：`node --test tests/stage-log-behavior/*.test.js`
- 结果：`171/171` 通过；生成副本、JSON、39 页面完整性、V2 双入口关闭、环境变更检查和 `git diff --check` 通过；仅本地验证。

## 下一步

由新的独立复审核对本轮代码与测试；不得直接创建测试集合或部署测试环境。
