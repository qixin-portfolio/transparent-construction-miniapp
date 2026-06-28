# Phase 4B AI 业主摘要云函数测试文档

## 1. 测试范围

本轮只测试新增云函数：

```txt
cloudfunctions/aiGenerateOwnerSummary
```

本轮不测试前端入口，因为 Phase 4B 不修改前端页面。

## 2. 前置条件

- 当前分支：`saas-phase4-ai-owner-summary`
- 已新增云函数：`aiGenerateOwnerSummary`
- 未部署云函数
- 未上传体验版
- 未执行数据库脚本
- 未执行 `initSaasDefaults`
- 云函数环境变量仅在微信云开发控制台配置，不写入代码仓库

建议环境变量：

```txt
AI_API_KEY=
AI_BASE_URL=
AI_MODEL=deepseek-chat
AI_TIMEOUT_MS=15000
```

## 3. 权限规则

允许调用角色：

```txt
admin
boss_qi
boss_hu
```

禁止调用角色：

```txt
owner
worker
designer
sales
project_manager
manager
platform_admin
super_admin
未注册用户
```

说明：

- Phase 4B 是租户内日报审核场景。
- 平台管理员和超级管理员本阶段不放开。
- 业主和普通员工不能直接调用 AI 生成面向业主的发布文案。

## 4. 测试场景

### 场景 1：管理员传入有效 stageLogId，成功返回摘要

操作：

- 使用 `admin` / `boss_qi` / `boss_hu` 账号调用。
- 入参：

```js
{
  stageLogId: '当前租户内待审核日报 ID'
}
```

预期：

```js
{
  success: true,
  summary: '50-100字左右的业主可读摘要',
  provider: 'openai-compatible',
  model: 'xxx'
}
```

验收点：

- 摘要面向业主。
- 通俗易懂。
- 不夸大承诺。
- 不包含标题、编号或 Markdown。
- 云函数不写入 `stage_logs`。

### 场景 2：普通员工调用被拒绝

角色：

```txt
worker
designer
sales
project_manager
manager
```

预期：

```js
{
  success: false,
  code: 'FORBIDDEN',
  message: '当前账号没有生成业主摘要的权限'
}
```

验收点：

- 不调用 AI。
- 不返回日报内容。
- 不写数据库。

### 场景 3：业主调用被拒绝

角色：

```txt
owner
```

预期：

```js
{
  success: false,
  code: 'FORBIDDEN',
  message: '当前账号没有生成业主摘要的权限'
}
```

验收点：

- 业主不能直接调用 AI。
- 业主不能绕过审核流程生成发布文案。

### 场景 4：无 tenantId 用户调用被拒绝

条件：

- 当前登录用户存在，但 `users.tenantId` 为空。

预期：

```js
{
  success: false,
  code: 'NO_TENANT',
  message: '当前账号未绑定租户'
}
```

验收点：

- 不使用默认租户兜底。
- 不跨租户查询。

### 场景 5：传入其他租户的 stageLogId 查不到

操作：

- A 租户管理员传入 B 租户日报 `stageLogId`。

预期：

```js
{
  success: false,
  code: 'STAGE_LOG_NOT_FOUND',
  message: '日报不存在或无权访问'
}
```

验收点：

- 不泄露该日报是否真实存在。
- 不读取其他租户 `stage_logs`。
- 不读取其他租户 `projects`。

### 场景 6：AI 环境变量未配置时返回 AI_CONFIG_MISSING

条件：

- 未配置 `AI_API_KEY` 或未配置 `AI_BASE_URL`。

预期：

```js
{
  success: false,
  code: 'AI_CONFIG_MISSING',
  message: 'AI 服务未配置'
}
```

验收点：

- 不写数据库。
- 不影响原有日报审核流程。
- 不在日志中输出 API Key。

### 场景 7：AI 接口失败时不影响日报审核

条件：

- `AI_BASE_URL` 不可访问。
- 或供应商接口返回异常。
- 或请求超时。

预期：

```js
{
  success: false,
  code: 'AI_REQUEST_FAILED',
  message: 'AI 服务请求失败，请稍后再试'
}
```

验收点：

- 审核页后续仍可人工填写摘要。
- 原 `reviewStageLog` 不受影响。
- 不自动改 `reviewStatus`。
- 不自动改 `ownerVisible`。

### 场景 8：摘要长度控制在 50-100 字左右

操作：

- 使用较长 `workContent` 的日报测试。

预期：

- AI 输出应在 50-100 字左右。
- 云函数最终 `summary` 不超过 120 字。

验收点：

- 如果模型返回过长文本，云函数会截断到 120 字以内。

### 场景 9：摘要不包含敏感信息

检查摘要中不能包含：

```txt
手机号
openid
tenantId
userId
24位数据库 ID
```

预期：

- 云函数发给 AI 前已尽量清理敏感文本。
- 云函数返回前再次清理敏感文本。

### 场景 10：云函数不写入数据库

操作：

- 调用前记录对应 `stage_logs`。
- 调用后再次查看对应 `stage_logs`。

预期：

- `ownerSummary` 不变化。
- `reviewStatus` 不变化。
- `ownerVisible` 不变化。
- `updatedAt` 不变化。

说明：

- Phase 4B 只返回摘要。
- 后续 Phase 4C 才修改审核页。
- 后续应由 `reviewStageLog` 审核通过时保存最终 `ownerSummary`。

## 5. 回归检查

必须确认：

- 未修改 `reviewStageLog`。
- 未修改前端页面。
- 未部署云函数。
- 未上传体验版。
- 未执行数据库脚本。
- 未执行 `initSaasDefaults`。

## 6. 当前结论

Phase 4B 的验收重点是：

```txt
只读当前租户日报 + 只允许老板/管理员调用 + 只返回摘要 + 不写数据库。
```

通过后再进入 Phase 4C：审核页增加 AI 生成按钮和人工确认编辑流程。
