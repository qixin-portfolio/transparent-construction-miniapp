# Phase 4B AI 业主摘要云函数部署前检查

## 1. 本次允许部署的云函数

只允许部署：

```txt
aiGenerateOwnerSummary
```

不允许部署其他云函数。

## 2. 本次不允许修改的内容

- 不修改前端页面
- 不修改 `reviewStageLog`
- 不修改 `submitStageLog`
- 不修改业主端页面
- 不写数据库
- 不执行数据库脚本
- 不执行 `initSaasDefaults`
- 不上传体验版
- 不发布正式版
- 不合并 `master`

## 3. 环境变量要求

部署前必须配置：

```txt
AI_API_KEY
AI_BASE_URL
AI_MODEL
```

说明：

- `AI_API_KEY`：模型服务 API Key，必须放云函数环境变量，不能写进代码。
- `AI_BASE_URL`：OpenAI-compatible 接口地址。
- `AI_MODEL`：模型名，例如 `deepseek-chat` 或其他兼容模型。

当前代码支持以下 `AI_BASE_URL` 写法：

- base url：`https://api.deepseek.com`
- `/v1` url：`https://api.deepseek.com/v1`
- 完整 chat completions url：`https://api.deepseek.com/v1/chat/completions`

如果配置为空，云函数返回：

```js
{
  success: false,
  code: 'AI_CONFIG_MISSING',
  message: 'AI 服务未配置'
}
```

## 4. 安全检查

部署前必须确认：

- 代码中没有硬编码 API Key。
- 日志中不打印 API Key。
- 前端只传 `stageLogId`。
- 云函数根据 `OPENID -> users.tenantId` 获取租户。
- 查询 `stage_logs` 必须带 `_id + tenantId`。
- 查询 `projects` 必须带 `_id + tenantId`。
- 云函数不写入数据库。
- 只允许 `admin / boss_qi / boss_hu` 调用。

安全自检命令：

```bash
grep -n "AI_API_KEY\|AI_BASE_URL\|AI_MODEL" cloudfunctions/aiGenerateOwnerSummary/index.js
grep -n "collection('stage_logs')" cloudfunctions/aiGenerateOwnerSummary/index.js
grep -n "collection('projects')" cloudfunctions/aiGenerateOwnerSummary/index.js
grep -n "collection('users')" cloudfunctions/aiGenerateOwnerSummary/index.js
grep -n "update(\|add(\|remove(\|set(" cloudfunctions/aiGenerateOwnerSummary/index.js || true
grep -n "platform_admin\|super_admin\|manager\|owner\|worker\|designer\|sales\|project_manager" cloudfunctions/aiGenerateOwnerSummary/index.js || true
```

## 5. 失败降级

必须确认：

- AI 配置缺失返回 `AI_CONFIG_MISSING`。
- AI 请求失败返回 `AI_REQUEST_FAILED`。
- AI 空响应返回 `AI_EMPTY_RESPONSE`。
- 失败时不影响原日报审核流程。
- 失败时不写数据库。

## 6. 部署前结论

部署前只允许做一件事：

```txt
部署 aiGenerateOwnerSummary 云函数。
```

不允许扩大到前端接入、体验版上传、数据库脚本或其他云函数部署。
