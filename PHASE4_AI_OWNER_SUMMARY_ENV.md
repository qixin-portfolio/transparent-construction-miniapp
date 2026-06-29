# Phase 4B AI 环境变量配置说明

## 1. 必需环境变量

```txt
AI_API_KEY=你的模型服务 Key
AI_BASE_URL=OpenAI-compatible API 地址
AI_MODEL=模型名称
```

可选环境变量：

```txt
AI_TIMEOUT_MS=15000
```

说明：

- `AI_API_KEY` 只能配置在云函数环境变量中。
- `AI_BASE_URL` 是 OpenAI-compatible 接口地址。
- `AI_MODEL` 是模型名称，例如 `deepseek-chat`、`qwen-plus`。
- `AI_TIMEOUT_MS` 默认 15000 毫秒，最大建议不超过 30000 毫秒。

## 2. DeepSeek 示例

以下为占位示例，不是真实 Key：

```txt
AI_API_KEY=sk-xxxx
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat
```

当前代码会把 `AI_BASE_URL` 自动拼接成 chat completions 地址：

```txt
https://api.deepseek.com/v1/chat/completions
```

也可以直接配置完整地址：

```txt
AI_BASE_URL=https://api.deepseek.com/v1/chat/completions
```

## 3. 通义千问 / 百炼示例

以下为占位示例，不是真实 Key：

```txt
AI_API_KEY=sk-xxxx
AI_BASE_URL=OpenAI-compatible endpoint
AI_MODEL=qwen-plus
```

如果百炼提供的地址已经包含 `/v1`，可以直接填 `/v1` 地址；当前代码会自动追加 `/chat/completions`。

## 4. 微信云函数配置位置

应在微信云开发控制台中配置：

```txt
云开发控制台
-> 云函数
-> aiGenerateOwnerSummary
-> 配置
-> 环境变量
```

不要放入：

- `miniprogram/`
- `project.config.json`
- 代码仓库
- 前端页面
- 文档中的真实值

## 5. 验证方式

部署后先不接前端，使用云函数测试调用：

```json
{
  "stageLogId": "真实待审核日报ID"
}
```

预期成功：

```js
{
  success: true,
  summary: '业主可读摘要',
  provider: 'openai-compatible',
  model: 'deepseek-chat'
}
```

预期配置缺失：

```js
{
  success: false,
  code: 'AI_CONFIG_MISSING',
  message: 'AI 服务未配置'
}
```

## 6. 安全提醒

- 不要把真实 `AI_API_KEY` 发给前端。
- 不要把真实 `AI_API_KEY` 写入仓库。
- 不要在云函数日志里打印 `AI_API_KEY`。
- 不要把包含手机号、openid、tenantId 的文本发送给 AI。
