# Phase 4B AI 业主摘要云函数部署测试结果

## 1. 基础状态

- 当前分支：`saas-phase4-ai-owner-summary`
- 当前 commit：`b831a02 docs: update phase4 AI owner summary deploy result`
- 测试日期：`2026-06-28`
- 部署环境：`cloud1-d4g7zh8kpca0e26d5`
- 部署云函数：`aiGenerateOwnerSummary`
- 云函数状态：`Active`
- 云函数超时时间：`15` 秒
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

状态：未执行破坏性真实调用测试。

原因：

- 当前 AI 环境变量已经配置完成。
- 为避免影响当前已部署云函数的真实调用验收，本轮没有清空或改错环境变量。
- 后续如需补测，可在明确维护窗口内临时移除或改错环境变量，测试后立即恢复。

未配置 AI 环境变量时预期：

```js
{
  success: false,
  code: 'AI_CONFIG_MISSING'
}
```

## 5. 管理员真实调用测试

状态：已完成，真实调用成功。

测试方式：

- 使用微信开发者工具真实管理员登录态调用 `wx.cloud.callFunction`。
- 入参只传 `stageLogId`。
- `stageLogId` 来自 `stage_logs` 集合中真实 `reviewStatus: pending` 的日报。
- 文档不公开记录具体 `stageLogId / projectId / tenantId`。

调用结果：

```js
{
  success: true,
  summary: '...',
  provider: 'openai-compatible',
  model: 'deepseek-v4-flash'
}
```

摘要质量检查结果：通过。

检查项：

- 50-100 字左右：通过。
- 面向业主：通过。
- 通俗易懂：通过。
- 不包含手机号：通过。
- 不包含 `openid`：通过。
- 不包含 `tenantId`：通过。
- 不包含完整详细地址：通过。
- 不使用“绝对保证”“一定没问题”等承诺：通过。
- 不暴露内部管理问题：通过。
- 不直接说“返工 / 责任 / 失误”：通过。

结论：

- `aiGenerateOwnerSummary` 在管理员真实登录态下可以成功生成业主友好摘要。
- AI 失败不会影响原日报审核流程的判断仍需在前端接入后继续验证。

## 6. 权限拒绝测试

状态：本轮未完成真实角色切换测试。

原因：

- `aiGenerateOwnerSummary` 使用 `cloud.getWXContext()` 获取真实 `OPENID`。
- 当前微信开发者工具登录态为管理员账号。
- 自动化测试账号列表为空，无法在本地自动切换到 `manager / worker / owner`。
- 本轮禁止修改数据库，不能通过篡改用户角色模拟权限测试。

待真实账号测试角色：

```txt
manager
worker
owner
```

扩展待测角色：

```txt
designer
sales
project_manager
未注册用户
```

预期返回：

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

结论：

- 代码侧权限白名单符合 Phase 4B 设计。
- 真实 `manager / worker / owner` 拒绝测试尚未完成，进入 Phase 4C 前建议用真实角色账号补测。

## 7. 跨租户测试

状态：暂未执行。

原因：

- 当前本轮未提供第二测试租户的可用 `stageLogId`。
- 本轮不通过数据库脚本造测试数据。

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

结论：

- 代码侧租户隔离逻辑符合 Phase 4B 设计。
- 真实跨租户 stageLogId 验证尚未完成，后续有第二测试租户时补测。

## 8. 数据库写入检查

状态：通过。

代码侧检查结论：

- `aiGenerateOwnerSummary` 未调用 `update()`。
- `aiGenerateOwnerSummary` 未调用 `add()`。
- `aiGenerateOwnerSummary` 未调用 `remove()`。
- `aiGenerateOwnerSummary` 未调用 `set()`。

控制台核验结论：

- 管理员真实调用后，目标日报仍保持原有待审核数据。
- 已观察字段 `aiDraft: null`、`aiGenerated: false` 未变化。
- 未发现 `ownerSummary` 被 `aiGenerateOwnerSummary` 自动写入。

结论：

- 云函数只返回文本。
- 本轮没有向 `stage_logs` 写入 `ownerSummary`。
- 数据库没有新增 AI 调用记录。
- 原日报审核流程未被修改。

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

Phase 4B 云函数 `aiGenerateOwnerSummary` 已完成最小部署，并在真实管理员登录态下成功生成 AI 业主摘要。

当前可以认为管理员真实调用链路通过，摘要质量通过，数据库未写入通过。

仍需在进入 Phase 4C 前补齐：

1. 真实 `manager / worker / owner` 账号权限拒绝测试。
2. 第二测试租户的跨租户 `stageLogId` 验证。

本轮未上传体验版，未修改前端，未修改 `reviewStageLog`，未执行数据库脚本，未执行 `initSaasDefaults`，未进入 Phase 4C。
