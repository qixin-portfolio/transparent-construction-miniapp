# V2 Deal Loop Phase 5C-G：trust-materials 最小文案补修

## 当前阶段

Phase 5C-G：trust-materials 最小文案补修。

本阶段只补修 `trust-materials` 页面中 Phase 5C-F 遗留的用户可见技术词，不修改业务逻辑，不改云函数，不部署，不上传体验版，不打开工作台入口。

## 当前 HEAD / tag

- 当前 HEAD：`2e2396ad445a05ed4b2d364ebe2e898b573eac86`
- 当前 tag：`v2-deal-loop-phase5c-f-full-copy-regression`

## 本阶段目标

1. 清理 `trust-materials` 页面用户可见文案中的 `真实客户字段`。
2. 清理 `trust-materials` 页面用户可见文案中的 `getV2EvidenceSummary`。
3. 保留页面原有能力边界：真实证据摘要只读展示、示例推荐素材保留、公开使用需先确认授权。
4. 不修改 `getV2EvidenceSummary / getCustomer` 调用逻辑，不改变 fallback、错误态、授权判断和素材匹配规则。

## 修改文件列表

```text
miniprogram/subpackages/deal-loop/pages/trust-materials/trust-materials.js
AI_TASKS/V2_DEAL_LOOP_PHASE5C_G_TRUST_MATERIALS_COPY_PATCH.md
```

说明：

1. 本阶段未修改 `trust-materials.wxml`。
2. 本阶段未修改 `trust-materials.wxss`。
3. 本阶段未修改 `evidenceSummaryAdapter.js`。

## trust-materials 补修内容

已完成：

1. 数据源标签中的 `真实客户字段` 改为 `只读客户资料`。
2. 数据源标签中的 `示例客户字段` 改为 `示例客户资料`。
3. 加载提示中的 `客户字段` 改为 `客户资料`。
4. 用户可见状态提示中的 `只读调用 getV2EvidenceSummary` 改为 `正在只读读取证据摘要`。
5. 保留 `name: 'getV2EvidenceSummary'` 作为内部云函数调用名，不作为用户可见文案。

## 清理前后文案

| 清理前 | 清理后 |
| --- | --- |
| `真实客户字段 + 示例推荐素材` | `只读客户资料 + 示例推荐素材` |
| `真实客户字段 + 真实证据摘要 + 示例推荐素材` | `只读客户资料 + 真实证据摘要 + 示例推荐素材` |
| `示例客户字段 + 示例推荐素材` | `示例客户资料 + 示例推荐素材` |
| `正在只读加载客户字段，并匹配示例推荐素材。` | `正在只读加载客户资料，并匹配示例推荐素材。` |
| `客户字段读取成功后，再读取真实证据摘要。` | `客户资料读取成功后，再读取真实证据摘要。` |
| `客户字段只读加载成功，推荐素材仍为示例素材。` | `客户资料只读加载成功，推荐素材仍为示例素材。` |
| `客户字段暂时读取失败，已切换为示例客户字段和示例推荐素材。` | `客户资料暂时读取失败，已切换为示例客户资料和示例推荐素材。` |
| `只读调用 getV2EvidenceSummary，不读取原始素材。` | `正在只读读取证据摘要，不展示原始素材。` |

## 未改变的能力边界

本阶段未改变：

1. `getV2EvidenceSummary` 调用逻辑。
2. `getCustomer` 调用逻辑。
3. `evidenceSummaryAdapter` 逻辑。
4. 授权判断逻辑。
5. 错误态处理逻辑。
6. fallback 规则。
7. 素材匹配逻辑。
8. 真实证据摘要展示结构。
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
createProject
submitStageLog
reviewStageLog
getTempFileURL
真实 AI API
```

## 测试结果

已执行：

```bash
node --check miniprogram/subpackages/deal-loop/pages/trust-materials/trust-materials.js
git diff --check
```

结果：

1. `trust-materials.js` 语法检查通过。
2. `git diff --check` 通过。
3. 用户可见文案中未再发现 `真实客户字段`。
4. 用户可见文案中未再发现 `getV2EvidenceSummary`；内部调用名仍保留。
5. `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
6. 未部署云函数。
7. 未上传体验版。
8. 未进入下一阶段。

## 风险点

1. 本阶段只做静态文案补修和语法检查，未重新做微信开发者工具人工回归。
2. `getV2EvidenceSummary` 仍作为内部云函数调用名存在于代码中，后续检查时需区分内部标识与用户可见文案。
3. 本阶段不改变 Phase 5B 遗留错误态覆盖情况；发布风险判断仍需结合前序测试结论。
4. 当前仍不建议发布、不建议上传体验版、不建议打开工作台入口。

## 是否建议进入复验阶段

建议进入轻量复验阶段。

复验重点：

1. `trust-materials` 页面用户可见文案不再出现 `真实客户字段 / getV2EvidenceSummary`。
2. 真实证据摘要、示例推荐素材、公开授权提示仍表达清楚。
3. 入口仍保持关闭，不做发布动作。
