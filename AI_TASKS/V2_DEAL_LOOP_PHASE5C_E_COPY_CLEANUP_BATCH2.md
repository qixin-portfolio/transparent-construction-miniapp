# V2 Deal Loop Phase 5C-E：V2 第二批页面技术词文案清理

## 当前阶段

Phase 5C-E：V2 第二批页面技术词文案清理。

本阶段只清理第二批页面中用户可见的技术词、开发态词、mock 词和内部函数名，让 `pipeline / customer-detail` 更适合老板和销售理解。

## 当前 HEAD / tag

- 当前 HEAD：`1bd096f54f7687eb7a5c31934db6b5724b4142b0`
- 当前 tag：`v2-deal-loop-phase5c-d-copy-cleanup-batch1`

## 本阶段目标

1. 只处理 `pipeline` 和 `customer-detail` 两个页面。
2. 将用户可见的 `Phase 3B / Readonly / Mock fallback / 本地 mock / listCustomers / getCustomer / openid / customerId` 等技术词收口为业务文案。
3. 不改变客户列表、客户详情、推荐素材、AI 建议和跳转逻辑。
4. 不部署云函数，不上传体验版，不打开工作台入口，不进入 Phase 5C-F。

## 修改文件列表

```text
miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.wxml
miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.js
miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.wxml
miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.js
AI_TASKS/V2_DEAL_LOOP_PHASE5C_E_COPY_CLEANUP_BATCH2.md
```

说明：

1. 本阶段未修改 `pipeline.wxss` 和 `customer-detail.wxss`，现有 class 名中的 `mock` 继续作为内部样式标识保留。
2. 本阶段未修改页面 JSON；`customer-detail` 通过运行时标题设置为 `客户成交详情`，`V2 客户详情` 配置文案按本阶段要求允许保留。

## pipeline 文案清理

已完成：

1. 顶部标签：`Phase 3B-1 Readonly / 不影响 V1` -> `V2 试验功能 / 只读客户资料 / 不影响现有数据`。
2. 数据来源：`Mock fallback` -> `示例内容`，`真实客户数据` -> `只读客户资料`。
3. 读取提示：`listCustomers 暂无可展示客户，已使用本地 mock。` -> `暂无可展示客户，当前展示示例内容。`
4. 成功提示：`只读来自 listCustomers，未写入任何集合。` -> `仅用于内部成交跟进，未修改任何数据。`
5. 失败提示：`加载失败，已回退 mock` -> `示例内容`，并提示 `当前无法读取客户资料，暂展示示例内容。`
6. 保护说明：`Phase 2.5 本地 mock 保护规则` -> `V2 试验功能保护说明`。
7. Guard 展示：去掉 `listCustomers / 本地 mock / 不调用云函数` 等开发态表述，改为 `仅读取客户列表 / 不修改现有客户数据`。
8. Toast：`缺少客户ID` -> `未找到客户资料`。

未改变：

1. 仍只读调用 `listCustomers`。
2. 未改变客户卡片筛选、排序、阶段统计和跳转逻辑。
3. 未改变 fallback 使用本地示例客户的规则。

## customer-detail 文案清理

已完成：

1. 运行时页面标题设置为 `客户成交详情`。
2. 数据来源：`Mock fallback` -> `示例内容`，`真实客户详情` -> `只读客户资料`。
3. 数据说明：`未提供客户 ID，已使用本地 mock。` -> `未从客户列表进入，当前展示示例内容。`
4. 数据说明：`未调用真实客户详情，已使用本地 mock。` -> `当前展示本地示例内容，仅供内部参考。`
5. 数据说明：`只读来自 getCustomer，未写入任何集合。` -> `仅用于内部成交跟进，未修改任何数据。`
6. 错误态：`加载失败，已回退 mock` -> `示例内容`，并提示 `客户资料暂时读取失败，当前展示示例内容。`
7. 跟进记录：`本地 mock 跟进记录` -> `示例跟进记录`。
8. 销售助手：`当前为本地 mock 建议，不调用真实 AI。` -> `当前为示例建议，不调用真实 AI。`
9. 安全说明：`openid` -> `微信身份标识`。
10. 保护说明：`Phase 3B-2 本地 mock 保护规则` -> `V2 试验功能保护说明`。
11. Guard 展示：`Phase 3B-2 Readonly / getCustomer / 回写` 等开发态文案改为 `V2 试验功能，只读资料 / 仅读取客户资料 / 不修改客户数据`。
12. Toast：`缺少客户ID` -> `未找到客户资料`。

未改变：

1. 仍只读调用 `getCustomer`。
2. 未改变客户详情映射、跟进记录展示、AI 建议生成、推荐素材跳转和工地草案跳转逻辑。
3. 未改变本地示例 fallback 规则。

## 统一替换词

| 原技术词 / 开发态词 | 替换后文案 |
| --- | --- |
| `mock` | `示例` |
| `Mock fallback` | `示例内容` |
| `本地 mock` | `本地示例` / `示例内容` |
| `Phase 3B / Readonly` | `V2 试验功能 / 只读资料` |
| `listCustomers` | `只读客户列表` / 不展示函数名 |
| `getCustomer` | `只读客户资料` / 不展示函数名 |
| `customerId` | `客户资料` / 不展示 |
| `fallback` | `示例内容` |
| `真实客户数据` | `只读客户资料` |
| `真实客户详情` | `只读客户资料` |
| `openid` | `微信身份标识` |

## 未改变的能力边界

本阶段未改变：

1. `listCustomers` 调用逻辑。
2. `getCustomer` 调用逻辑。
3. `getV2EvidenceSummary` 调用逻辑。
4. fallback 规则。
5. 错误态处理逻辑。
6. 授权判断逻辑。
7. 素材匹配逻辑。
8. 阶段映射逻辑。
9. 客户字段读取逻辑。
10. 工作台入口开关。
11. tabBar。
12. `app.json`。
13. 云函数。
14. 部署配置。

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
node --check miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.js
node --check miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.js
git diff --check
```

结果：

1. JS 语法检查通过。
2. `git diff --check` 通过。
3. `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
4. 未部署云函数。
5. 未上传体验版。
6. 未进入 Phase 5C-F。

## 风险点

1. 本阶段只清理 `pipeline / customer-detail`，不处理其它页面。
2. 内部变量名、class 名、文件路径、路由参数和云函数名仍可能包含 `mock / customerId / listCustomers / getCustomer`，但不作为用户可见问题。
3. `customer-detail.json` 中的 `V2 客户详情` 按需求允许保留；页面加载后运行时标题为 `客户成交详情`。
4. 即使第二批文案已收口，当前仍不建议发布、不建议上传体验版、不建议打开工作台入口。

## 是否建议进入下一阶段

建议先进行 Phase 5C-E 人工验收。

验收通过后，再评估是否进入下一阶段；当前仍不建议发布、不建议上传体验版、不建议打开入口。
