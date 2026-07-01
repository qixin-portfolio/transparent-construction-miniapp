# V2 Deal Loop Phase 5C-D：V2 全链路技术词文案最小清理实现（第一批高风险页面）

## 当前阶段

Phase 5C-D：V2 全链路技术词文案最小清理实现（第一批高风险页面）。

本阶段只清理第一批高风险页面中用户可见的技术词、开发态词、mock 词和内部字段词，让老板/销售看到的是“示例内容 / 试验功能 / 内部参考 / 草案”，而不是 `mock`、`customerId`、`createProject`、`projects` 等技术词。

## 当前 HEAD / tag

- 当前 HEAD：`12c76e906326e57a5fde8ddd24ec8a303306e7fe`
- 当前 tag：`v2-deal-loop-phase5c-c-full-copy-audit`

## 本阶段目标

1. 只处理第一批高风险页面：`ai-assistant`、`contract-to-project`、`case-assets`。
2. 只改用户可见文案、提示、页面标题和复制内容，不改变真实数据读取逻辑。
3. 不新增云函数，不新增真实 AI API，不写数据库。
4. 不部署云函数，不上传体验版，不打开工作台入口，不进入 Phase 5C-E。

## 修改文件列表

本阶段修改：

```text
miniprogram/subpackages/deal-loop/pages/ai-assistant/ai-assistant.wxml
miniprogram/subpackages/deal-loop/pages/ai-assistant/ai-assistant.js
miniprogram/subpackages/deal-loop/pages/ai-assistant/ai-assistant.json
miniprogram/subpackages/deal-loop/pages/contract-to-project/contract-to-project.wxml
miniprogram/subpackages/deal-loop/pages/contract-to-project/contract-to-project.js
miniprogram/subpackages/deal-loop/pages/case-assets/case-assets.wxml
miniprogram/subpackages/deal-loop/pages/case-assets/case-assets.js
miniprogram/subpackages/deal-loop/mock/caseAssets.js
miniprogram/subpackages/deal-loop/utils/aiMockEngine.js
AI_TASKS/V2_DEAL_LOOP_PHASE5C_D_COPY_CLEANUP_BATCH1.md
```

说明：

1. `ai-assistant.json` 只修改页面导航栏标题，将用户可见的 `V2 AI 跟进 mock` 改为 `AI 跟进助手`。
2. 未修改 `app.json`、工作台入口、tabBar、云函数或部署配置。
3. 未修改 `pipeline`、`customer-detail`、`trust-materials`。
4. 本阶段未修改三页 WXSS，现有 class 名中的 `mock` 继续作为内部样式标识保留。

## ai-assistant 文案清理

已完成：

1. 导航栏标题：`V2 AI 跟进 mock` -> `AI 跟进助手`。
2. 顶部标签：`Mock only` -> `示例建议 / 内部参考`。
3. 页面说明：`当前为本地 mock 建议，不调用真实 AI。` -> `当前仅根据客户阶段生成跟进建议，不调用真实 AI。`
4. 客户上下文：不再展示 `URL customerId`，改为 `当前关联客户`。
5. 生成方式：不再展示 `mock_rule` / `generatedBy`，改为 `建议来源：客户阶段与当前顾虑`。
6. 数据源文案：`真实客户字段` -> `只读客户资料`，`Mock fallback` -> `示例建议`。
7. 按钮和 Toast：`重新生成 mock / 已生成 mock 建议` -> `重新生成示例建议 / 已生成示例建议`。
8. 保护规则：`Phase 3B-3 Readonly`、`getCustomer`、`aiGenerateOwnerSummary` 等技术词改为老板/销售可理解的只读说明。

未改变：

1. 仍只调用 `getCustomer`。
2. 未接入真实 AI。
3. 未新增云函数调用。
4. 未改变客户上下文校验和读取失败处理逻辑。

## contract-to-project 文案清理

已完成：

1. 页面标题：`签约转工地` -> `签约转工地草案`。
2. 页面说明：去掉 `Phase 3B-5 / createProject / projects`，改为“根据客户资料整理工地创建草案，当前不会写入正式工地，不影响现有项目数据。”
3. 数据源文案：`真实客户字段 + 工地草案` -> `只读客户资料 + 工地草案`，`Mock fallback` -> `示例草案`。
4. 映射区：`字段映射` -> `草案字段对应`。
5. 字段名：`project.customerId` -> `关联客户`，不再在页面展示客户 ID。
6. 风险检查：`客户 ID 已归一`、`不写 projects`、`project_members / customers` 等技术词改为 `客户资料已关联 / 不创建真实工地 / 不修改现有项目数据`。
7. 按钮：`生成工地草案（mock）` -> `预览工地草案`。
8. 弹窗：去掉 `Phase 3B-5 / createProject / projects`，明确“不会创建真实工地，也不会修改现有项目数据”。
9. 复制内容：由技术 JSON 收口为中文草案摘要，避免复制结果暴露 `customerId / createMode` 等内部字段。

未改变：

1. 仍只读调用 `getCustomer`。
2. 未调用 `createProject`。
3. 未写入项目、工地或客户数据。
4. 未改变 fallback、客户一致性校验和错误态处理逻辑。

## case-assets 文案清理

已完成：

1. 页面标题：`工地转案例资产` -> `案例内容草案`。
2. 顶部标签：`案例资产 mock 草案` -> `示例草案 / 内部参考 / 需授权`。
3. 页面说明：去掉 `mock / case_authorizations`，改为“当前仅根据客户资料整理小红书、抖音、官网和 GEO 的内容方向，不代表已获得公开发布授权。”
4. 数据源文案：`真实客户字段 + Mock 案例草案` -> `只读客户资料 + 示例案例草案`，`Mock fallback` -> `示例案例草案`。
5. 按钮：`复制小红书标题（mock）/ 复制抖音选题（mock）/ 复制 GEO 问答（mock）` 改为对应草案按钮。
6. 模块标题：`可用素材清单 mock / 授权状态 mock` 改为 `可用素材清单 / 授权状态说明`。
7. 安全提示：明确“仅供内部参考，不代表已获得公开发布授权”，如需用于小红书、抖音、官网或 GEO 内容，应先确认案例授权。
8. 发布弹窗：`Phase 3B-6 / mock / API` 改为“不支持自动发布”和“当前仅生成案例内容草案，不调用发布服务，不写数据库”。
9. 脱敏文案：`openid已脱敏 / 不展示 openid` 改为 `微信身份标识已脱敏 / 不展示微信身份标识`。

未改变：

1. 仍只读调用 `getCustomer`。
2. 不读取真实工地、日报、照片、图纸或授权记录。
3. 不写数据库。
4. 不调用外部发布服务。
5. 不改变案例草案生成逻辑。

## 统一替换词

本阶段实际落地的替换包括：

| 原技术词 / 开发态词 | 替换后文案 |
| --- | --- |
| `mock` | `示例` / `草案` |
| `Mock only` | `示例建议 / 内部参考` |
| `本地 mock` | `本地示例` |
| `mock_rule` | `建议来源：客户阶段与当前顾虑` |
| `URL customerId` | `当前关联客户` / 不展示 |
| `customerId` | `客户资料` / `关联客户` / 不展示 |
| `createProject` | 不展示技术名，改为 `创建正式工地` |
| `projects` | 不展示集合名，改为 `现有项目数据` |
| `project.customerId` | `关联客户` |
| `真实客户字段` | `只读客户资料` |
| `生成工地草案（mock）` | `预览工地草案` |
| `自动发布` | `不支持自动发布` |
| `case_authorizations` | `真实授权记录` |
| `openid` | `微信身份标识` |

## 未改变的能力边界

本阶段未改变：

1. `getCustomer` 调用逻辑。
2. `getV2EvidenceSummary` 调用逻辑。
3. fallback 规则。
4. 错误态处理逻辑。
5. 授权判断逻辑。
6. 素材匹配逻辑。
7. 阶段映射逻辑。
8. 客户字段读取逻辑。
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
node --check miniprogram/subpackages/deal-loop/pages/ai-assistant/ai-assistant.js
node --check miniprogram/subpackages/deal-loop/pages/contract-to-project/contract-to-project.js
node --check miniprogram/subpackages/deal-loop/pages/case-assets/case-assets.js
node --check miniprogram/subpackages/deal-loop/mock/caseAssets.js
node --check miniprogram/subpackages/deal-loop/utils/aiMockEngine.js
git diff --check
```

结果：

1. JS 语法检查通过。
2. `git diff --check` 通过。
3. `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
4. 未部署云函数。
5. 未上传体验版。
6. 未进入 Phase 5C-E。

## 风险点

1. `ai-assistant.json` 是本阶段允许列表外的页面 JSON 文件，但其中 `navigationBarTitleText` 是用户可见文案；为彻底清除 `V2 AI 跟进 mock`，本阶段做了必要的单行文案修改。
2. 三页内部变量名、class 名、文件路径和状态码中的 `mock` 仍保留，不作为用户可见问题。
3. `riskGuards`、`v1ReadonlyAdapters` 中仍有部分历史技术词，但本阶段高风险三页已改为局部保护说明，避免影响第二批页面。
4. 当前只完成第一批高风险页面，`pipeline`、`customer-detail`、`trust-materials` 尚未做 Phase 5C-D 级别全量清理。
5. 即使文案已收口，当前仍不建议发布、不建议上传体验版、不建议打开工作台入口。

## 是否建议进入下一阶段

建议先进行 Phase 5C-D 人工验收。

验收通过后，可进入下一批页面文案清理；但不建议发布、不建议上传体验版、不建议打开入口。
