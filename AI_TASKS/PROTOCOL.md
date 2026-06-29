# ChatGPT + Codex + GitHub Collaboration Protocol

## 协作定位

1. 仓库是长期记忆，聊天只是临时界面。
2. 用户只提出目标、提供 Issue / PR 编号、做最终决策。
3. ChatGPT 负责拆任务、审 PR、判断风险、给下一步策略。
4. Codex 负责读 Issue、开分支、改代码、跑检查、创建 PR、更新 PR 描述和 `AI_TASKS/handoff.md`。
5. GitHub Issue 和 PR 是任务推进的主载体。

## 标准流程

### 1. ChatGPT 拆任务

- 把用户目标拆成可验收的 Issue。
- 标注风险等级和 Human Gate。
- 明确本次范围、禁止范围、验收标准。

### 2. Codex 执行

- 读取 Issue 或 `AI_TASKS/current.md`。
- 创建任务分支。
- 只做本次范围内的变更。
- 运行检查。
- 提交 commit。
- 推送分支并创建 PR。
- 更新 PR 描述和 `AI_TASKS/handoff.md`。

### 3. ChatGPT 审 PR

- 阅读 PR diff、检查结果和 handoff。
- 判断是否满足验收标准。
- 标注风险、遗漏和下一步。
- 由用户决定是否合并。

## 分支规则

- 默认从主分支创建：`codex/<task-name>`
- 修复 PR 评论：`codex/address-pr-<number>`
- 实验分支：`codex/experiment-<topic>`

## PR 规则

- PR 标题清楚说明任务。
- PR 描述必须包含修改文件、是否业务代码、是否部署配置、是否密钥、检查结果、风险和下一步。
- 不允许自动合并 PR。

## Issue 规则

复杂任务必须先有 Issue，包括：

- 新功能
- 数据结构改动
- 云函数改动
- 权限/认证/支付/生产环境相关任务
- 多文件或多阶段任务
- 需要 ChatGPT 审查的任务

## Human Gate

以下任务必须等待用户明确确认：

- 部署、发布、上传体验版
- 数据库结构变更、数据迁移、批量操作
- 支付、认证、权限、生产环境
- 删除数据或不可逆操作
- 引入真实密钥、真实 AI API、第三方生产服务

## 安全规则

- 不提交 `.env`、真实 token、数据库连接串、账号密码。
- 不在 PR 描述中暴露密钥。
- 不把生产数据复制到文档。
- 不凭空创造接口、字段、业务规则。
