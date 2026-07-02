# V2 Deal Loop Phase 5C-J：AI 跟进助手阶段码显示最小补修

## 当前阶段

Phase 5C-J：AI 跟进助手阶段码显示最小补修。

本阶段只修复 `ai-assistant` 页面用户可见的英文阶段码，不修改业务逻辑，不修改云函数，不部署云函数，不上传体验版，不打开工作台入口，不进入 Phase 5D。

## 当前截图发现的问题

Phase 5C-I 人工截图发现：

1. `ai-assistant` 页面中 `触发阶段` 仍展示内部阶段码 `quoted`。
2. `quoted` 属于内部阶段标识，老板和销售不应在页面上看到。
3. 需要将这类阶段码在页面展示层转成中文业务文案。

## 补修目标

1. 将 `ai-assistant` 页面用户可见的 `suggestion.triggerStage` 改为展示中文阶段标签。
2. 至少覆盖：
   - `quoted`
   - `signed`
   - `visited`
   - `new`
   - `highRisk`
   - `pending`
   - `unknown / 空值`
3. 不改变 `generateSuggestion` 返回结构的业务含义。
4. 不改变 `getCustomer` 调用逻辑。
5. 不改变页面跳转、fallback、错误态和推荐素材逻辑。

## 修改文件列表

```text
miniprogram/subpackages/deal-loop/pages/ai-assistant/ai-assistant.js
miniprogram/subpackages/deal-loop/pages/ai-assistant/ai-assistant.wxml
AI_TASKS/V2_DEAL_LOOP_PHASE5C_J_AI_STAGE_LABEL_PATCH.md
```

说明：

1. 本阶段未修改 `ai-assistant.wxss`。
2. 本阶段未修改 `utils/aiMockEngine.js`。
3. 本阶段未修改 `mock/aiSuggestions.js`。
4. 本阶段未修改其它 V2 页面。

## 补修内容

已完成：

1. 在 `ai-assistant.js` 内新增页面展示层阶段映射 `STAGE_DISPLAY_LABELS`。
2. 新增 `getStageDisplayLabel`，将内部阶段码转成中文业务文案。
3. 新增 `buildSuggestionView`，只为页面展示补充 `triggerStageLabel`。
4. 将页面生成建议、真实客户建议、切换客户建议统一包一层 `buildSuggestionView`。
5. 将 `ai-assistant.wxml` 中 `触发阶段：{{suggestion.triggerStage}}` 改为 `触发阶段：{{suggestion.triggerStageLabel}}`。

## 阶段码替换表

| 内部阶段码 | 页面展示文案 |
| --- | --- |
| `quoted` | `已报价` |
| `signed` | `已签约` |
| `visited` | `已到店` |
| `new` | `新线索` |
| `new_lead` | `新线索` |
| `highRisk` | `高风险` |
| `high_risk` | `高风险` |
| `pending` | `待跟进` |
| `unknown` | `当前阶段` |
| 空值 | `当前阶段` |

说明：

1. `new_lead / high_risk` 是兼容已有内部命名的补充映射。
2. 映射表中的英文 key 仅作为 JS 内部标识，不在页面中直接展示。

## 未改变的能力边界

本阶段未改变：

1. `getCustomer` 调用逻辑。
2. `generateSuggestion` 生成逻辑。
3. `aiMockEngine` 推荐规则。
4. 客户上下文校验逻辑。
5. fallback 规则。
6. 错误态处理。
7. 推荐素材跳转。
8. 客户详情跳转。
9. 工作台入口开关。
10. tabBar。
11. `app.json`。
12. 云函数。
13. 部署配置。

本阶段未新增：

```text
db.collection
cloud.database
wx.request
真实 AI API
```

## 测试结果

已执行：

```bash
node --check miniprogram/subpackages/deal-loop/pages/ai-assistant/ai-assistant.js
git diff --check
```

结果：

1. `ai-assistant.js` 语法检查通过。
2. `git diff --check` 通过。
3. `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
4. 未部署云函数。
5. 未上传体验版。
6. 未进入 Phase 5D。

## 是否建议重新截图验收

建议重新做微信开发者工具截图验收。

重点只复验：

1. `ai-assistant` 页面 `触发阶段` 是否显示中文业务文案，例如 `已报价`。
2. 页面用户可见区域是否不再出现 `quoted / signed / visited / new / highRisk / pending / unknown` 等内部阶段码。
3. 页面仍显示 `示例建议 / 内部参考 / 不调用真实 AI` 等能力边界。
