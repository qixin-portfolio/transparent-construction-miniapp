# Current AI Task

## 任务标题

Phase 7-SEC-5：PR #3 邀请码安全阻塞项修复

## 任务来源

- GitHub Issue：https://github.com/qixin-portfolio/transparent-construction-miniapp/issues/1
- PR：https://github.com/qixin-portfolio/transparent-construction-miniapp/pull/2
- 用户目标：依据代码审计建议修复已确认的 BUG 和安全雷点

## 背景

V1 已正式上线。只读审计发现通知、种子数据、完工纪念册、公开案例、套餐管理、日报审核、邀请码兑换和历史空 tenantId 兼容存在风险。

## 本次范围

允许做：

- 补齐高风险云函数鉴权与 tenant 校验
- 收紧完工纪念册和公开案例的授权字段
- 防止旧日报审核导致项目进度倒退
- 为邀请码兑换增加原子状态校验
- 默认关闭真实 AI 外部请求
- 固定云函数 SDK 版本
- 新增安全回归测试

禁止做：

- 不部署云函数
- 不上传体验版
- 不发布正式版
- 不修改 `ENABLE_V2_DEAL_LOOP_ENTRY`
- 不执行生产数据库脚本或批量数据操作

## 交付物

- 安全修复代码
- `tests/security-regression.test.js`
- 更新 `AI_TASKS/handoff.md`

## 验收标准

- 安全回归测试通过
- 所有修改 JS 通过 `node --check`
- 全项目 JS 语法检查通过
- `git diff --check` 通过
- `ENABLE_V2_DEAL_LOOP_ENTRY = false`

## 风险等级

- 高

## Human Gate

是否需要人工确认：是

需要确认的事项：

- 用户已于 2026-07-10 明确要求依据审计建议修复
- 部署、体验版上传和正式发布仍需另行确认

## Codex 执行记录

- 分支：`codex/v1-security-hardening`
- 修复前 HEAD：`bf046dbd747f028bebb8f2264474f549b3f26d4a`
- PR：https://github.com/qixin-portfolio/transparent-construction-miniapp/pull/2
- 阻塞项修复：可信定时任务身份、日报审核并发幂等、纪念册 HMAC 分享凭证、公开案例字段白名单、员工邀请码原子限流与角色白名单
- 检查命令：`node --test tests/security-regression.test.js tests/security-behavior/*.test.js`；修改 JS `node --check`；全仓 JSON 解析；`git diff --check`
- 结果：静态安全回归 20/20；行为测试 38/38；18 个修改 JS 语法通过；138 个 JSON 解析通过；V2 开关保持关闭
- 记录：`AI_TASKS/V1_PR2_SECURITY_BLOCKERS_RESOLUTION.md`
- 状态校准：PR #2 已于 SEC-3 修复提交前合并，merge commit 为 `5f4d94275cee2f9564613efe14470b7c40e0c128`；SEC-3 修复需新建独立 PR 承接
- PR #3：`https://github.com/qixin-portfolio/transparent-construction-miniapp/pull/3`，Draft、OPEN
- SEC-5：增加调用者全局 + 具体 code 双重原子限流；邀请码生成改为事务内使用 code 文档 ID 原子占位
- SEC-5 测试：静态 20/20，行为 43/43，合计 63/63
- SEC-5 记录：`AI_TASKS/V1_PR3_INVITE_SECURITY_BLOCKERS_RESOLUTION.md`

## 下一步

push SEC-5 修复后重新审查 PR #3。部署云函数、上传体验版、生产数据盘点或迁移和正式发布必须另行确认。
