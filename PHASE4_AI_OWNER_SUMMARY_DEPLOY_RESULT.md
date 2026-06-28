# Phase 4B AI 业主摘要云函数部署测试结果

## 1. 基础状态

- 当前分支：`saas-phase4-ai-owner-summary`
- 当前 commit：`5ef88b8 docs: add phase4 AI owner summary deploy result`
- 部署时间：`2026-06-28`
- 部署环境：`cloud1-d4g7zh8kpca0e26d5`
- 部署云函数：`aiGenerateOwnerSummary`
- 工作区状态：部署前 clean
- stash：仍保留 `stash@{0}: On saas-phase3-manual-plan-admin: wip unrelated files before phase3 merge`

## 2. 部署结果

部署命令只包含一个云函数：

```txt
aiGenerateOwnerSummary
```

部署结果：

- 第一次部署：云函数不存在，云端创建后返回 `Creating` 状态，代码上传阶段失败。
- 第二次部署：等待后仅重试 `aiGenerateOwnerSummary`，部署成功。

部署成功信息：

```txt
aiGenerateOwnerSummary success: true
filesCount: 2
packSize: 3.7 KB
```

云函数状态查询：

```txt
status: Active
runtime: Nodejs16.13
timeout: 15
```

注意：

- 已通过微信云开发控制台把 `aiGenerateOwnerSummary` 超时时间调整为 `15` 秒。
- 本轮未部署其他云函数。

## 3. 环境变量配置状态

已在微信云开发控制台配置 AI 环境变量。

已配置项：

```txt
AI_API_KEY
AI_BASE_URL
AI_MODEL
```

安全说明：

- 真实 `AI_API_KEY` 由用户手动输入控制台。
- 真实 `AI_API_KEY` 未写入代码、文档或终端输出。
- 本文档不记录、不展示真实 Key。

当前代码 URL 规则：

- 如果 `AI_BASE_URL` 是完整 `/v1/chat/completions` 地址，代码会直接使用。
- 如果 `AI_BASE_URL` 是 `/v1` 地址，代码会追加 `/chat/completions`。
- 如果 `AI_BASE_URL` 是 base url，代码会追加 `/v1/chat/completions`。

本次 DeepSeek 配置按代码实际规则使用 base url：

```txt
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat
```

## 4. AI_CONFIG_MISSING 测试

状态：未完成真实调用测试。

原因：

- 微信开发者工具 CLI 只提供 `list / info / deploy / download`，没有可用的云函数 `invoke` 命令。
- `aiGenerateOwnerSummary` 必须通过 `cloud.getWXContext()` 获取真实 `OPENID`。
- 需要真实待审核 `stageLogId` 和真实管理员账号上下文。

待用户在云开发控制台或小程序端测试：

```json
{
  "stageLogId": "真实待审核日报ID"
}
```

未配置 AI 环境变量时预期：

```js
{
  success: false,
  code: 'AI_CONFIG_MISSING'
}
```

补充说明：

- 当前环境变量已配置，因此未再清空环境变量做 `AI_CONFIG_MISSING` 破坏性测试。
- 后续如需补测，可在不影响线上体验的前提下单独临时移除或改错环境变量，并测试后恢复。

## 5. 管理员成功生成摘要测试

状态：未完成真实调用测试。

待测前置：

- 当前调用用户为 `admin / boss_qi / boss_hu`。
- `stageLogId` 属于当前租户。
- 已配置 AI 环境变量。
- 云函数超时时间已调整到 `15` 秒。

预期：

```js
{
  success: true,
  summary: '业主可读摘要',
  provider: 'openai-compatible',
  model: '...'
}
```

摘要质量检查：

- 50-100 字左右。
- 面向业主。
- 通俗易懂。
- 不包含手机号。
- 不包含 `openid`。
- 不包含 `tenantId`。
- 不使用“绝对保证”“一定没问题”等承诺。
- 不暴露内部管理问题。
- 不直接说“返工 / 责任 / 失误”。

## 6. 权限拒绝测试

状态：未完成真实调用测试。

需要分别测试：

```txt
worker
designer
sales
project_manager
manager
owner
未注册用户
```

最低测试要求：

```txt
manager
worker
owner
```

预期：

```js
{
  success: false,
  code: 'FORBIDDEN'
}
```

代码侧已确认允许角色仅为：

```js
['admin', 'boss_qi', 'boss_hu']
```

## 7. 跨租户测试

状态：未完成真实调用测试。

待测方式：

- 使用 A 租户管理员调用 B 租户的 `stageLogId`。

预期：

- 不返回 B 租户日报内容。
- 不返回 B 租户项目内容。
- 返回 `STAGE_LOG_NOT_FOUND` 或等价错误。
- 不泄露该日报是否真实存在。

代码侧已确认：

- 查询 `stage_logs` 使用 `_id + tenantId`。
- 查询 `projects` 使用 `_id + tenantId`。
- 前端不能传 `tenantId`。
- 前端不能传 `projectId` 后被信任。

## 8. 数据库写入检查

状态：未完成真实调用后的控制台核验。

代码侧检查结论：

- `aiGenerateOwnerSummary` 未调用 `update()`。
- `aiGenerateOwnerSummary` 未调用 `add()`。
- `aiGenerateOwnerSummary` 未调用 `remove()`。
- `aiGenerateOwnerSummary` 未调用 `set()`。

预期：

- 调用后 `stage_logs.ownerSummary` 不会自动变化。
- 云函数只返回文本。
- 数据库没有新增 AI 调用记录。
- 原日报审核流程不受影响。

## 9. 本轮未做事项

- 是否上传体验版：否
- 是否修改前端页面：否
- 是否修改 `reviewStageLog`：否
- 是否修改 `submitStageLog`：否
- 是否写数据库：否
- 是否执行数据库脚本：否
- 是否执行 `initSaasDefaults`：否
- 是否部署其他云函数：否
- 是否发布正式版：否
- 是否进入 Phase 4C：否
- 是否恢复 stash：否

## 10. 当前结论

Phase 4B 云函数 `aiGenerateOwnerSummary` 已最小部署成功，云端状态为 `Active`。

但真实调用验收尚未完成，原因是：

- CLI 不支持直接 invoke 云函数。
- 当前没有可在终端安全使用的真实 `stageLogId`。
- 权限、跨租户、摘要质量需要用真实微信账号和云开发控制台测试。

下一步建议：

1. 使用真实管理员微信账号，在云开发控制台或开发者工具测试调用 `aiGenerateOwnerSummary`。
2. 使用真实待审核日报 ID 作为 `stageLogId`。
3. 检查摘要质量、权限拒绝、跨租户隔离和数据库未写入。
4. 验收通过后再进入 Phase 4C 前端接入。
