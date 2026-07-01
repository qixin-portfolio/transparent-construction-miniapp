# V2 Deal Loop Phase 5C-F：V2 全链路文案回归验收

## 当前阶段

Phase 5C-F：V2 全链路文案回归验收。

本阶段只做 V2 deal-loop 六个页面的用户可见文案回归验收。不修改业务代码，不部署云函数，不上传体验版，不打开工作台入口，不进入下一阶段。

## 当前 HEAD / tag

- 当前 HEAD：`85bb516164511b60f5e74796ff9bb41707114467`
- 当前 tag：`v2-deal-loop-phase5c-e-copy-cleanup-batch2`

## 回归验收目标

1. 只读检查六个 V2 deal-loop 页面：
   - `pipeline`
   - `customer-detail`
   - `ai-assistant`
   - `trust-materials`
   - `contract-to-project`
   - `case-assets`
2. 检查用户可见文案中是否仍出现技术词、开发态词、mock 词、内部函数名或误导发布/创建/真实 AI 的表达。
3. 区分页面用户可见文案和内部代码标识。
4. 复查当前能力边界是否仍表达清楚。
5. 给出发布判断和是否建议进入下一阶段。

## 六个页面验收结果

### 1. pipeline

结论：通过。

检查结果：

1. 用户可见文案未发现 `Phase 3B / Readonly / Mock fallback / 本地 mock / fallback / 真实客户数据`。
2. `listCustomers` 仍存在于 JS 云函数调用名中，但不作为页面用户可见文案展示。
3. `customerId` 仍作为路由参数、变量名和 `wx:key` 使用，不作为页面用户可见文案展示。
4. 页面已表达 `V2 试验功能 / 只读客户资料 / 不影响现有数据`。
5. 未发现误导发布、创建工地或真实 AI 的文案。

是否建议后续再修：暂无必须项。可在后续视觉验收中考虑是否把内部 class 名 `mock-btn` 重命名，但这不是用户可见问题，当前不建议为此扩大改动。

### 2. customer-detail

结论：通过。

检查结果：

1. 用户可见文案未发现 `本地 mock 跟进记录 / 当前为本地 mock 建议 / getCustomer / openid / 真实客户详情 / Mock fallback / customerId`。
2. `getCustomer / customerId` 仍存在于 JS 调用逻辑、路由参数和变量名中，但不作为页面用户可见文案展示。
3. 页面已表达 `示例跟进记录 / 示例建议 / 不调用真实 AI / 只读客户资料 / 内部成交跟进`。
4. `openid` 已在安全说明中收口为 `微信身份标识`。
5. 未发现误导发布、创建工地或真实 AI 的文案。

是否建议后续再修：暂无必须项。

### 3. ai-assistant

结论：通过。

检查结果：

1. 页面用户可见文案未发现 `Mock only / 本地 mock / mock_rule / URL customerId / 真实客户字段`。
2. `mock_rule_real_customer` 仍存在于内部生成字段中，但 WXML 不展示 `generatedBy`，不作为用户可见问题。
3. `getCustomer / customerId` 仍存在于 JS 调用逻辑、路由参数和变量名中，但不作为页面用户可见文案展示。
4. 页面已表达 `示例建议 / 内部参考 / 当前关联客户 / 不调用真实 AI`。
5. 未发现误导发布、创建工地或真实 AI 的文案。

是否建议后续再修：暂无必须项。

### 4. trust-materials

结论：未完全通过。

发现的用户可见技术词：

1. `真实客户字段`：
   - `dataSourceLabel: '真实客户字段 + 示例推荐素材'`
   - `dataSourceLabel: '真实客户字段 + 真实证据摘要 + 示例推荐素材'`
2. `getV2EvidenceSummary`：
   - `statusHint: '只读调用 getV2EvidenceSummary，不读取原始素材。'`

影响判断：

1. 这两个点属于用户可见文案，不是纯内部代码标识。
2. 当前页面能力边界总体清楚：已表达 `V2 试验功能 / 内部成交跟进 / 真实证据摘要 / 示例推荐素材 / 公开使用需先确认授权`。
3. 但按照本阶段禁止技术词清单，`trust-materials` 仍需要最小文案补修。

建议替换：

| 当前文案 | 建议替换 |
| --- | --- |
| `真实客户字段` | `只读客户资料` |
| `示例客户字段` | `示例客户资料` |
| `客户字段` | `客户资料` |
| `只读调用 getV2EvidenceSummary，不读取原始素材。` | `正在只读读取证据摘要，不展示原始素材。` |

是否建议后续再修：建议优先做 `trust-materials` 最小文案补修。

### 5. contract-to-project

结论：通过。

检查结果：

1. 页面用户可见文案未发现 `createProject / projects / project.customerId / mock / Phase 3B / Readonly`。
2. `getCustomer / customerId` 仍存在于 JS 调用逻辑、路由参数和变量名中，但不作为页面用户可见文案展示。
3. 页面已表达 `草案预览 / 内部参考 / 不会创建真实工地 / 不影响现有项目数据`。
4. 未发现误导真实创建工地的文案。

是否建议后续再修：暂无必须项。

### 6. case-assets

结论：通过，保留说明如下。

检查结果：

1. 页面用户可见文案未发现 `mock / Phase 3B / Readonly / customerId / case_authorizations / 可直接发布 / 直接发小红书 / 直接用于官网/GEO`。
2. `不支持自动发布` 中包含 `自动发布`，但这是明确的否定限制文案，且属于本阶段要求的能力边界表达，不是误导发布。
3. `如需用于小红书、抖音、官网或 GEO 内容，应先确认案例授权` 是授权前置提示，不是“直接用于官网/GEO”的误导表达。
4. 页面已表达 `示例草案 / 内部参考 / 需授权 / 不支持自动发布 / 公开使用需先确认授权`。
5. `getCustomer / customerId / mock_*` 仍存在于 JS 内部调用、变量名、ID 和状态码中，不作为用户可见问题。

是否建议后续再修：暂无必须项。

## 禁止技术词检查

检查范围：

```text
miniprogram/subpackages/deal-loop/pages/pipeline
miniprogram/subpackages/deal-loop/pages/customer-detail
miniprogram/subpackages/deal-loop/pages/ai-assistant
miniprogram/subpackages/deal-loop/pages/trust-materials
miniprogram/subpackages/deal-loop/pages/contract-to-project
miniprogram/subpackages/deal-loop/pages/case-assets
miniprogram/subpackages/deal-loop/mock
miniprogram/subpackages/deal-loop/utils
```

检查结论：

1. `pipeline`、`customer-detail`、`ai-assistant`、`contract-to-project`、`case-assets` 未发现需要立即处理的用户可见禁止技术词。
2. `trust-materials` 仍发现用户可见 `真实客户字段` 和 `getV2EvidenceSummary`。
3. 代码内部仍存在较多 `mock / customerId / getCustomer / listCustomers / getV2EvidenceSummary / fallback`，但多数为变量名、文件路径、云函数调用名、路由参数名、内部字段名或状态 class，不作为用户可见问题。
4. `case-assets` 中的 `不支持自动发布` 是否定限制文案，不作为误导发布问题。

## 允许内部标识说明

以下内容本阶段允许保留：

```text
mock_material_*
mock_only
mock_customer_*
mock_case_asset_*
../../mock/...
statusClass: 'mock'
dataSourceClass: 'mock'
CSS class: mock-btn / mock-primary-btn / mock-note
变量名：customerId / projectId / caseAssetId
路由参数名：customerId
云函数调用名：getCustomer / listCustomers / getV2EvidenceSummary
内部字段名：generatedBy / mock_rule_real_customer / createMode
```

保留原因：

1. 这些标识用于内部数据关联、路由传参、云函数调用、样式或本地示例数据。
2. 直接重命名会扩大改动范围，可能影响页面跳转、素材匹配、状态样式或本地示例数据。
3. Phase 5C-F 是回归验收阶段，不修改业务代码。

## 能力边界复查

当前页面整体已表达：

1. `V2 试验功能`：`pipeline / customer-detail / trust-materials / ai-assistant / contract-to-project / case-assets` 均有对应试验或保护说明。
2. `只读客户资料`：`pipeline / customer-detail / ai-assistant / contract-to-project / case-assets` 已收口；`trust-materials` 仍残留 `真实客户字段`，建议补修为 `只读客户资料`。
3. `内部成交跟进`：`pipeline / customer-detail / trust-materials` 已表达；其它页面也通过 `内部参考 / 草案` 间接表达。
4. `示例内容 / 示例建议`：各页面均已基本表达清楚。
5. `不调用真实 AI`：`customer-detail / ai-assistant` 已表达。
6. `不会创建真实工地`：`contract-to-project` 已表达。
7. `不支持自动发布`：`case-assets` 已表达。
8. `公开使用需先确认授权`：`trust-materials / case-assets` 已表达。
9. `不影响现有客户、工地和日报数据`：`trust-materials` 明确表达；`pipeline / contract-to-project` 对应表达不影响现有数据或项目数据。

## 发布判断

当前判断：

1. `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
2. 未上传体验版。
3. 未部署新云函数。
4. 当前不建议发布。
5. 当前不建议打开工作台入口。
6. 当前不建议给真实业务人员使用。
7. 可以继续开发者工具直达页面做内部技术验证。

原因：

1. `trust-materials` 仍有用户可见技术词遗留。
2. 之前阶段仍记录 `NOT_FOUND / READ_FAILED / FORBIDDEN / UNAUTHENTICATED` 等错误态未完全实机覆盖。
3. 全链路文案虽大部分收口，但还需要一次针对 `trust-materials` 的最小补修和人工验收。

## 风险点

1. `trust-materials` 是真实证据摘要入口，残留 `真实客户字段 / getV2EvidenceSummary` 会削弱老板/销售可理解性。
2. 内部代码标识大量保留，后续检索时需要继续区分“用户可见”和“内部标识”，避免误判。
3. `case-assets` 涉及小红书、抖音、官网、GEO 等公开渠道，后续仍要持续防止“草案”被误解为可直接发布。
4. 即使完成文案补修，也不等于可以发布；入口、错误态和体验版仍需单独验收。

## 是否建议进入下一阶段

不建议直接进入发布或入口开放阶段。

建议下一步先做 `trust-materials` 最小文案补修，将 `真实客户字段 / 示例客户字段 / 客户字段 / getV2EvidenceSummary` 收口为老板和销售能理解的业务文案。

补修通过后，再进行一次轻量复验；当前仍不建议上传体验版、不建议打开工作台入口、不建议给真实业务人员使用。
