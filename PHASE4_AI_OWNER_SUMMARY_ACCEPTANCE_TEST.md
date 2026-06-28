# Phase 4B AI 业主摘要云函数验收清单

## 场景 1：AI 未配置

前置：

- 未配置 `AI_API_KEY` 或未配置 `AI_BASE_URL`。

预期：

```js
{
  success: false,
  code: 'AI_CONFIG_MISSING'
}
```

验收点：

- 不写数据库。
- 不影响原日报审核流程。

## 场景 2：管理员生成摘要成功

前置：

- 当前调用用户为 `admin / boss_qi / boss_hu`。
- `stageLogId` 属于当前租户。
- AI 环境变量已配置。

预期：

```js
{
  success: true,
  summary: '...',
  provider: 'openai-compatible',
  model: '...'
}
```

验收点：

- 摘要为业主能看懂的施工进度说明。
- 不直接写入 `stage_logs.ownerSummary`。
- 不改变日报审核状态。

## 场景 3：普通员工调用被拒绝

角色：

```txt
worker / designer / sales / project_manager / manager
```

预期：

```js
{
  success: false,
  code: 'FORBIDDEN'
}
```

验收点：

- 不调用 AI。
- 不返回日报内容。
- 不写数据库。

## 场景 4：业主调用被拒绝

角色：

```txt
owner
```

预期：

```js
{
  success: false,
  code: 'FORBIDDEN'
}
```

验收点：

- 业主不能直接生成业主摘要。
- 业主不能绕过审核流程。

## 场景 5：跨租户 stageLogId

操作：

- A 租户管理员传入 B 租户的 `stageLogId`。

预期：

- 查不到日报。
- 不泄露该日报是否存在。
- 不返回其他租户内容。

建议返回：

```js
{
  success: false,
  code: 'STAGE_LOG_NOT_FOUND'
}
```

## 场景 6：AI 请求失败

前置：

- `AI_BASE_URL` 不可访问。
- 或模型服务返回异常。
- 或请求超时。

预期：

```js
{
  success: false,
  code: 'AI_REQUEST_FAILED'
}
```

验收点：

- 不影响原日报审核流程。
- 不写数据库。
- 后续仍可人工审核日报。

## 场景 7：摘要内容质量

检查：

- 50-100 字左右。
- 不包含手机号。
- 不包含 `openid`。
- 不包含 `tenantId`。
- 不包含“绝对保证”“一定没问题”等绝对化承诺。
- 不暴露内部管理问题。
- 不直接说“返工 / 责任 / 失误”。
- 如果有现场问题，应温和表达为“将继续跟进”或“后续会同步处理进展”。

## 场景 8：数据库写入检查

操作：

1. 调用前记录对应 `stage_logs`。
2. 调用 `aiGenerateOwnerSummary`。
3. 调用后再次查看对应 `stage_logs`。

预期：

- `stage_logs.ownerSummary` 不会自动变化。
- `stage_logs.reviewStatus` 不会变化。
- `stage_logs.ownerVisible` 不会变化。
- 云函数只返回文本。
- 后续由老板确认后再保存。

## 验收结论模板

```txt
AI 未配置：
管理员成功生成：
普通员工拦截：
业主拦截：
跨租户隔离：
AI 请求失败降级：
摘要内容质量：
数据库写入检查：
是否部署其他云函数：
是否上传体验版：
是否执行数据库脚本：
是否执行 initSaasDefaults：
```
