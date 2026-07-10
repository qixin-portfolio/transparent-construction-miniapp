# Current AI Task

## 任务标题

V1 上线后安全加固：云函数鉴权、租户隔离与公开数据边界

## 任务来源

- GitHub Issue：https://github.com/qixin-portfolio/transparent-construction-miniapp/issues/1
- PR：待创建
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
- Commit：待创建
- PR：待创建
- 检查命令：`node --test tests/security-regression.test.js`；全项目 JS `node --check`；JSON 解析；页面文件完整性；`git diff --check`
- 结果：20 项安全回归通过；全部 JS 语法通过；64 个 JSON 解析通过；39 个页面文件完整；V2 开关保持关闭

## 下一步

创建 PR，等待人工审查。部署云函数、上传体验版和发布正式版必须另行确认。
