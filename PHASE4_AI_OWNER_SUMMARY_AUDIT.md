# SaaS Phase 4 AI 业主日报摘要 MVP 审计

## 0. 本轮边界

- 当前分支：`saas-phase4-ai-owner-summary`
- 基线 commit：`8078982 docs: add phase3 post merge audit`
- 本轮性质：方案审计，不写业务代码
- 本轮不部署云函数，不上传体验版，不执行数据库脚本，不执行 `initSaasDefaults`
- 本轮不恢复 stash，不修改 `geo-content-center/`

Phase 4 第一版目标只做：

> AI 生成业主版施工日报摘要。

也就是：老板 / 管理员审核日报时，一键让 AI 把工长日报转成业主能看懂的摘要，老板确认后再展示给业主。

## 1. 当前 AI 现状

### 1.1 小程序是否已有真实 AI

当前小程序已有两类“AI”相关能力，但形态不同：

- `miniprogram/subpackages/internal/pages/ai-assistant/ai-assistant.js`
  - 前端本地模板工具。
  - 通过 `assistant-data.js` 的 `generateOutput()` 本地拼接文案。
  - 不调用云函数生成大模型内容。
  - 可保存本机历史，可把客户需求同步到客户库。

- `cloudfunctions/generateStageLogDraft/index.js`
  - 已有真实模型接入能力。
  - 如果云函数环境变量存在 `ZHIPUAI_API_KEY` 或 `BIGMODEL_API_KEY`，会调用智谱接口。
  - 如果未配置 Key、调用失败或没有可用文本，则降级为本地规则生成。
  - 当前入口在 `miniprogram/subpackages/internal/pages/upload-log/upload-log.js`，用于提交日报前整理工长草稿。

因此，当前不是完全没有 AI；但审核页的“业主摘要生成”还没有独立 MVP。

### 1.2 ai-assistant 页面当前定位

`ai-assistant` 页面当前是内部模板工具，不是通用大模型聊天：

- 数据源：`assistant-data.js`、`assistant-knowledge.js`
- 输出方式：前端本地模板拼接
- 主要流程：客户需求整理、报价话术、施工交底、巡检清单、透明工地日报、案例内容、风格方向
- 权限角色：`admin`、`boss_qi`、`boss_hu`、`designer`、`sales`

它不适合作为 Phase 4 第一版 AI 摘要的直接入口。

### 1.3 generateStageLogDraft 当前定位

`generateStageLogDraft` 当前服务的是“提交日报前的草稿整理”：

- 允许角色：`admin`、`boss_qi`、`boss_hu`、`designer`、`worker`、`project_manager`
- 输入：`projectId`、工序、语音识别文本、快记、照片数量等
- 输出：`workContent`、`issue`、`needConfirm`、`tomorrowPlan`、`ownerSummary`、`reviewFocus`
- 保存路径：由 `submitStageLog` 接收并写入 `stage_logs`

它可以作为 Prompt 和降级思路参考，但不建议直接复用为审核页按钮。原因：

- 当前权限包含工人和项目经理。
- 当前使用场景在“提交前”，不是“审核中”。
- Phase 4 MVP 要求老板 / 管理员确认后给业主看。

### 1.4 ownerSummary 字段现状

当前已有 `ownerSummary` 字段：

- `submitStageLog` 写入：`stage_logs.ownerSummary`
- `generateStageLogDraft` 可生成：`draft.ownerSummary`
- `review-log` 展示：`ownerSummaryText: item.ownerSummary || ''`
- 业主端读取：`miniprogram/subpackages/owner/pages/owner/owner.js`
  - `ownerText: item.ownerSummary || item.workContent || ''`

当前问题：

- 审核页只能展示已有 `ownerSummary`，不能在审核时生成或编辑。
- `reviewStageLog` 当前不接收 `ownerSummary`。
- 如果工长提交时没有生成业主文案，老板审核时没有一键补齐入口。

### 1.5 业主端从哪里读取 ownerSummary

业主端读取链路：

1. `cloudfunctions/getOwnerProject/index.js`
   - 查询 `stage_logs`
   - 条件包含：`reviewStatus: 'approved'`、`ownerVisible: true`
   - 返回日志列表给业主端
2. `miniprogram/subpackages/owner/pages/owner/owner.js`
   - 展示字段优先级：`item.ownerSummary || item.workContent || ''`

这说明 Phase 4 不需要新建业主端字段，继续复用 `stage_logs.ownerSummary` 即可。

## 2. 最小 AI MVP 推荐

第一版只做：

- AI 生成业主版施工日报摘要。
- 老板 / 管理员在审核页点击按钮生成。
- 前端展示 AI 文案。
- 老板 / 管理员可编辑。
- 审核通过时保存为 `stage_logs.ownerSummary`。
- 业主端只看到审核通过后的摘要。

第一版不做：

- 万能聊天
- 业主自由提问
- 图片识别验收
- 复杂知识库
- RAG
- 自动发业主消息
- 自动审核日报
- AI 自动写库并直接对业主展示

## 3. 推荐新增云函数

建议新增云函数：

```txt
aiGenerateOwnerSummary
```

功能：

- 输入：`stageLogId`
- 后端通过 `cloud.getWXContext()` 获取当前 `openid`
- 根据 `openid` 查询 `users`
- 校验当前用户是否有审核该日报的权限
- 用当前用户的 `tenantId` 读取对应 `stage_logs`
- 用 `tenantId + projectId` 读取对应 `projects`
- 组装 Prompt
- 调用真实 AI 模型
- 返回业主友好摘要
- 不直接写入数据库
- 前端确认后，再由 `reviewStageLog` 审核通过时保存 `ownerSummary`

返回建议：

```js
{
  success: true,
  summary: '业主可读摘要文本',
  provider: 'deepseek | qwen | openai-compatible | fallback',
  warning: ''
}
```

失败建议：

```js
{
  success: false,
  message: 'AI 摘要暂不可用，请手动填写业主摘要'
}
```

注意：

- AI 失败不影响日报审核流程。
- 前端必须允许老板手动填写或继续审核。

## 4. 权限设计

第一版允许调用角色：

```txt
admin
boss_qi
boss_hu
```

可选后续角色：

```txt
platform_admin
super_admin
```

第一版禁止：

```txt
owner
worker
designer
sales
project_manager
manager
未注册用户
```

原因：

- AI 摘要用于日报审核环节。
- 必须由老板 / 管理员确认后给业主看。
- 不能让业主直接调用 AI。
- 不能让普通员工绕过审核直接生成业主文案。
- `manager` 可能是装修公司内部项目经理，不应默认拥有面向业主发布内容的 AI 审核权限。

建议常量：

```js
const AI_REVIEW_ROLES = ['admin', 'boss_qi', 'boss_hu']
```

后续如果确认平台管理员也要协助调试，可再扩展：

```js
const AI_REVIEW_ROLES = ['admin', 'boss_qi', 'boss_hu', 'platform_admin', 'super_admin']
```

## 5. tenantId / projectId 隔离方案

核心原则：

- 前端只传 `stageLogId`。
- 不信任前端传入的 `tenantId`。
- 不信任前端传入的 `projectId`。
- 云函数必须根据当前 `openid` 查用户和 `tenantId`。

建议流程：

1. `cloud.getWXContext()` 获取 `OPENID`
2. 查询 `users`：
   - `openid: OPENID`
   - `status: 'active'`
3. 校验角色在 `AI_REVIEW_ROLES`
4. 获取 `tenantId`
5. 查询 `stage_logs`
   - 首选：`_id = stageLogId` 后检查 `log.tenantId === tenantId`
   - 兼容旧数据时，仅对默认晟景租户允许 `tenantId` 为空
6. 查询 `projects`
   - 必须使用 `projectId + tenantId`
7. 组装 AI 输入

防护目标：

- 防止 A 租户通过传入 B 租户 `stageLogId` 读取日报。
- 防止前端伪造 `tenantId`。
- 防止普通员工生成业主发布文案。

## 6. Prompt 设计

第一版输入：

```txt
项目名称
施工阶段
工长原始日报
存在问题
明日计划
是否有照片
当前审核状态
```

第一版 System Prompt 建议：

```txt
你是装修公司透明工地日报助理。
你的任务是把工长提交的施工日报，改写成业主能看懂的进度摘要。
只能基于输入内容改写，不能编造未提供的施工内容、材料、验收结论、质量承诺或客户评价。
输出要真实、克制、通俗。
不要使用绝对化词语，不要承诺质量保证，不要夸大进度。
如果存在问题或风险，用温和方式表达为“将继续跟进”。
只输出摘要正文，不输出 Markdown、标题或解释。
```

第一版 User Prompt 结构：

```json
{
  "projectName": "工地名称",
  "stage": "施工阶段",
  "workContent": "工长原始日报",
  "issue": "存在问题",
  "tomorrowPlan": "明日计划",
  "hasPhotos": true,
  "reviewStatus": "pending",
  "outputRules": [
    "50-100字",
    "面向业主",
    "通俗易懂",
    "不夸大承诺",
    "不做质量保证",
    "不使用绝对化词",
    "不暴露内部管理问题",
    "如存在风险，温和表达为“将继续跟进”"
  ]
}
```

输出要求：

- 50-100 字
- 面向业主
- 通俗易懂
- 不夸大承诺
- 不做质量保证
- 不使用绝对化词
- 不暴露内部管理问题
- 如存在风险，温和表达为“将继续跟进”

示例输出：

```txt
今天工地已推进到水电阶段，现场完成了相关点位和施工情况记录，并同步上传了照片。后续会继续跟进现场细节和下一步安排，有需要确认的内容会及时沟通。
```

## 7. 模型接入建议

本节基于官方文档做架构建议，具体价格和模型名部署前需再次确认。

### 7.1 DeepSeek

适合：

- 成本敏感
- 中文摘要类任务
- 希望使用 OpenAI 兼容接口降低接入成本

优点：

- 官方文档说明 DeepSeek API 支持 OpenAI 兼容格式。
- 云函数可以沿用通用 `baseURL + apiKey + model` 的封装。
- 摘要类任务不需要复杂工具调用。

注意：

- API Key 必须放云函数环境变量，例如 `DEEPSEEK_API_KEY`。
- 需要设置调用超时。
- 需要限制输入长度和输出长度，控制成本。

### 7.2 通义千问 / 阿里云百炼

适合：

- 更偏国内云服务合规和稳定性。
- 希望后续接入阿里云百炼工作流、模型管理或企业账号体系。

优点：

- 阿里云百炼官方文档说明千问模型支持 OpenAI 兼容接口。
- 只需调整 API Key、Base URL、模型名，即可复用 OpenAI 兼容调用方式。
- 国内服务对微信云函数网络访问可能更稳定，需要实测。

注意：

- API Key 必须放云函数环境变量，例如 `DASHSCOPE_API_KEY` 或 `BAILIAN_API_KEY`。
- 百炼不同接口参数支持范围可能不同，不能照搬所有 OpenAI 参数。
- 需要先用最简单 Chat Completions 风格接口打通摘要任务。

### 7.3 OpenAI-compatible API

适合：

- 未来希望统一接多家模型供应商。
- 希望用一套云函数封装切换 DeepSeek、千问、OpenAI 或其他兼容服务。

优点：

- 接入层可以统一成：
  - `AI_BASE_URL`
  - `AI_API_KEY`
  - `AI_MODEL`
  - `AI_PROVIDER`
- 后续切换供应商改环境变量即可。
- 官方 OpenAI 文档提供文本生成和 Responses API 参考。

注意：

- 小程序前端不能出现 API Key。
- 云函数需要做失败降级。
- AI 失败不能影响日报审核。
- 不要在日志里打印完整 Prompt 和敏感数据。

### 7.4 第一版推荐

建议第一版优先采用“OpenAI-compatible 封装 + 具体供应商环境变量”的方式：

```txt
AI_PROVIDER=deepseek 或 qwen
AI_BASE_URL=供应商 OpenAI 兼容地址
AI_API_KEY=云函数环境变量
AI_MODEL=具体模型名
AI_TIMEOUT_MS=15000
```

落地顺序建议：

1. 先用 DeepSeek 或通义千问二选一打通。
2. 云函数代码保持 OpenAI-compatible 封装。
3. 后续需要切换模型时，不改前端，只改云函数环境变量。

参考：

- DeepSeek 官方 API 文档：`https://api-docs.deepseek.com/`
- 阿里云百炼 OpenAI 兼容文档：`https://help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope`
- OpenAI 文本生成文档：`https://developers.openai.com/api/docs/guides/text`

## 8. 套餐与用量限制建议

结合 Phase 2 / Phase 3 套餐系统，建议后续在 `subscriptions` 和 / 或 `tenants` 中设计字段：

```js
{
  enabledModules: ['project', 'daily_report', 'owner_view', 'ai_owner_summary'],
  aiMonthlyQuota: 50,
  aiUsedThisMonth: 0,
  aiQuotaResetAt: Date
}
```

套餐建议：

| 套餐 | AI 摘要额度 |
| --- | --- |
| free | 不含 AI，或每月 5 次体验 |
| starter | 每月 50 次 |
| pro | 每月 500 次 |
| enterprise | 自定义 |

第一版建议：

- 先不做计费扣量。
- 先在代码里预留检查点。
- 先只对有 `enabledModules` 包含 `ai_owner_summary` 的租户开放，或后台人工开启。

后续正式限制时再做：

- 调用前检查额度。
- AI 成功返回后扣减次数。
- 失败不扣次数。
- 记录 `ai_usage_logs` 用于排查和成本统计。

本阶段不建议直接批量回填套餐字段；如需给老租户开通，由控制台人工设置。

## 9. 前端入口建议

推荐入口：

```txt
miniprogram/subpackages/internal/pages/review-log/review-log
```

按钮文案：

```txt
AI 生成业主摘要
```

交互流程：

1. 老板打开待审核日报。
2. 点击 `AI 生成业主摘要`。
3. 前端调用 `aiGenerateOwnerSummary`，只传 `stageLogId`。
4. 前端展示 AI 文案。
5. 老板可编辑。
6. 老板点击审核通过。
7. `reviewStageLog` 保存最终 `ownerSummary`。
8. 业主端只看到审核后的摘要。

审核页需要新增的最小状态：

```js
aiGeneratingId
ownerSummaryDrafts
```

审核通过时建议传：

```js
call('reviewStageLog', {
  stageLogId: id,
  action: 'approve',
  ownerSummary
})
```

注意：

- 退回日报时不保存业主摘要。
- AI 生成后必须允许人工修改。
- 没有 AI 摘要时仍允许按原流程审核。

## 10. 数据写入策略

第一版建议：

- `aiGenerateOwnerSummary` 只返回文本，不直接写库。
- `reviewStageLog` 审核通过时接收 `ownerSummary`。
- 保存到 `stage_logs.ownerSummary`。
- 保持现有业主端读取逻辑。

`reviewStageLog` 建议最小扩展：

- 当 `action === 'approve'` 且传入 `ownerSummary`：
  - 清洗文本
  - 限制长度，例如 300 字
  - 写入 `stage_logs.ownerSummary`
- 当 `action === 'reject'`：
  - 不更新 `ownerSummary`

不建议第一版做：

- AI 云函数直接写库。
- 自动审核通过。
- AI 生成后自动推送业主通知。
- 修改业主端读取逻辑。

数据库迁移判断：

- `stage_logs.ownerSummary` 当前已经存在使用。
- 第一版不需要数据库迁移。
- 套餐额度字段如果后续启用，建议先人工设置，不批量回填。

## 11. 风险清单与缓解方式

| 风险 | 说明 | 缓解方式 |
| --- | --- | --- |
| AI 幻觉 | 编造未发生施工内容、材料、验收结论 | Prompt 明确“只基于输入”，输出后必须人工确认 |
| 越权读取 | A 租户读取 B 租户日报 | 只传 `stageLogId`，后端用 `openid -> tenantId` 校验 |
| 业主看到未经确认内容 | AI 文案未经老板确认直接展示 | AI 云函数不写库，审核通过时才保存 |
| API Key 泄露 | Key 出现在小程序前端或日志 | Key 只放云函数环境变量，不在前端和仓库中出现 |
| 调用超时 | AI 服务响应慢影响审核页 | 设置超时，失败返回可手填，不阻断审核 |
| 调用成本失控 | 高频点击造成成本上升 | 后续接 `aiMonthlyQuota`，前端加 loading 防重复 |
| 敏感信息外发 | 把客户电话、地址等无关信息传给模型 | Prompt 只传日报必要字段，不传业主手机号 |
| 套餐额度绕过 | 未开通 AI 的租户调用云函数 | 云函数按 `enabledModules` 和额度校验 |
| 普通员工绕过审核 | 员工自己生成业主文案 | 调用角色只允许老板 / 管理员 |
| 质量承诺风险 | AI 写出“已验收合格”等绝对话术 | Prompt 禁止质量保证和绝对化表述，前端可编辑 |

## 12. Phase 4 实施步骤建议

建议小步推进：

1. Phase 4A：AI 摘要方案审计
   - 当前文档完成后暂停，等确认。
2. Phase 4B：新增 `aiGenerateOwnerSummary` 云函数
   - 只返回文本，不写库。
   - 加权限、tenantId 隔离、超时和失败降级。
3. Phase 4C：审核页增加 AI 生成按钮
   - 增加生成、展示、编辑、审核时保存。
4. Phase 4D：接入模型环境变量
   - 在微信云函数环境变量中配置 Key。
   - 本地和仓库不保存 Key。
5. Phase 4E：体验版测试
   - 老板 / 管理员生成摘要。
   - 普通员工、业主无权调用。
   - AI 失败不影响审核。
6. Phase 4F：验收文档、合并、tag
   - 验收通过后再合并 `master`。

## 13. 推荐验收场景

第一版验收至少覆盖：

1. 老板审核页点击 AI 生成摘要，成功返回 50-100 字业主文案。
2. 老板可编辑摘要。
3. 审核通过后 `stage_logs.ownerSummary` 更新。
4. 业主端看到审核后的摘要。
5. 工人 / 设计师 / 项目经理 / manager 调用 AI 云函数被拒绝。
6. 业主调用 AI 云函数被拒绝。
7. A 租户不能生成 B 租户日报摘要。
8. AI 服务超时或 Key 未配置时，审核流程不受影响。
9. 不执行数据库脚本，不执行 `initSaasDefaults`。

## 14. 最终建议

Phase 4 MVP 推荐采用：

```txt
新增 aiGenerateOwnerSummary 云函数
+ 审核页 AI 生成按钮
+ reviewStageLog 审核通过时保存 ownerSummary
+ 业主端沿用现有 ownerSummary 读取逻辑
```

这条路径的优点：

- 改动范围小。
- 不破坏现有日报提交链路。
- 不让 AI 内容绕过老板审核。
- 不需要数据库迁移。
- 可以复用当前 `ownerSummary` 字段和业主端展示逻辑。

本轮只完成审计文档，未进入代码实现。
