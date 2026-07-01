# V2 Deal Loop Phase 5C-H：V2 全链路最终文案验收

## 当前阶段

Phase 5C-H：V2 全链路最终文案验收。

本阶段只做 V2 deal-loop 六个页面的最终用户可见文案验收，不修改业务代码，不部署云函数，不上传体验版，不打开工作台入口，不进入 Phase 5D。

## 当前 HEAD / tag

- 当前 HEAD：`25ddc4df2d8ad679d9864805e6a2932aae90d9aa`
- 当前 tag：`v2-deal-loop-phase5c-g-trust-materials-copy-patch`

## 最终验收目标

1. 验收 `pipeline / customer-detail / ai-assistant / trust-materials / contract-to-project / case-assets` 六个页面。
2. 确认用户可见文案不再出现技术词、开发态词、mock 词、内部函数名或内部字段名。
3. 确认页面没有误导真实 AI、真实创建工地、自动发布、公开发布的表达。
4. 确认页面仍清楚表达 V2 试验功能、只读资料、内部参考、示例内容、需授权后公开使用等能力边界。
5. 确认当前仍不建议发布、不建议打开工作台入口、不建议给真实业务人员使用。

## 六个页面验收结果

### 1. pipeline

验收结果：通过。

检查结论：

1. 页面用户可见文案未发现 `mock / Mock only / 本地 mock / Phase 3B / Readonly / listCustomers / customerId / fallback / 真实客户数据`。
2. 页面表达已收口为 `V2 试验功能 / 只读客户资料 / 不影响现有数据`。
3. 数据源和保护说明表达为 `示例内容 / 只读客户资料 / 仅用于内部成交跟进 / 不修改现有客户数据`。
4. 未发现误导真实 AI、真实创建工地、自动发布或公开发布的文案。
5. 扫描到的 `listCustomers / customerId / mock` 仅存在于 JS 调用名、路由参数、变量名、class 或样式标识中，不作为用户可见问题。

是否建议后续再修：暂不建议。

### 2. customer-detail

验收结果：通过。

检查结论：

1. 页面用户可见文案未发现 `本地 mock 跟进记录 / 当前为本地 mock 建议 / getCustomer / openid / 真实客户详情 / Mock fallback / customerId`。
2. 页面表达已收口为 `客户成交详情 / 只读客户资料 / 示例跟进记录 / 示例建议 / 不调用真实 AI`。
3. 客户安全说明使用 `微信身份标识`，未展示 `openid`。
4. 未发现误导真实 AI、真实创建工地、自动发布或公开发布的文案。
5. 扫描到的 `getCustomer / customerId / mock-note` 等仅为内部调用名、变量名、class 或路由参数，不作为用户可见问题。

是否建议后续再修：暂不建议。

### 3. ai-assistant

验收结果：通过。

检查结论：

1. 页面用户可见文案未发现 `V2 AI 跟进 mock / Mock only / mock_rule / URL customerId / 当前为本地 mock 建议 / 真实客户字段`。
2. 页面表达已收口为 `AI 跟进助手 / 示例建议 / 内部参考 / 当前关联客户 / 建议来源：客户阶段与当前顾虑`。
3. 页面明确表达 `当前仅根据客户阶段生成跟进建议，不调用真实 AI`。
4. 未发现误导真实 AI、真实创建工地、自动发布或公开发布的文案。
5. 扫描到的 `getCustomer / customerId / mock` 仅存在于 JS 调用名、变量名、路由参数或 class 中，不作为用户可见问题。

是否建议后续再修：暂不建议。

### 4. trust-materials

验收结果：通过。

检查结论：

1. Phase 5C-G 补修后，页面用户可见文案未再发现 `真实客户字段 / 示例客户字段 / 客户字段 / getV2EvidenceSummary`。
2. 页面表达已收口为 `只读客户资料 / 真实证据摘要 / 示例推荐素材 / 正在只读读取证据摘要，不展示原始素材`。
3. 页面明确表达 `仅内部参考 / 暂不可公开发布 / 公开使用需先确认授权`。
4. 页面明确表达 `不展示原始照片和日报正文`，并提示不影响现有客户、工地和日报数据。
5. 扫描到的 `getCustomer / getV2EvidenceSummary / customerId / mock` 仅为 JS 内部云函数调用名、变量名、路由参数或状态 class，不作为用户可见问题。

是否建议后续再修：暂不建议。

### 5. contract-to-project

验收结果：通过。

检查结论：

1. 页面用户可见文案未发现 `createProject / projects / project.customerId / mock / 真实创建工地 / 生成工地草案（mock）`。
2. 页面表达已收口为 `签约转工地草案 / 草案预览 / 内部参考 / 只读客户资料 + 工地草案`。
3. 页面明确表达 `当前仅为草案预览，不会创建真实工地，不影响现有项目数据`。
4. 未发现误导真实 AI、真实创建工地、自动发布或公开发布的文案。
5. 扫描到的 `getCustomer / customerId / mockGenerateDraft / mock-primary-btn` 仅为 JS 调用名、变量名、事件名、路由参数或 class，不作为用户可见问题。

是否建议后续再修：暂不建议。

### 6. case-assets

验收结果：通过。

检查结论：

1. 页面用户可见文案未发现 `mock / customerId / 可直接发布 / 自动发布 / 直接发小红书 / 直接用于官网/GEO` 等误导性文案。
2. 页面表达已收口为 `案例内容草案 / 示例草案 / 内部参考 / 需授权 / 只读客户资料 + 示例案例草案`。
3. 页面明确表达 `当前仅根据客户资料整理小红书、抖音、官网和 GEO 的内容方向，不代表已获得公开发布授权`。
4. 页面出现 `不支持自动发布`，属于限制说明，按本阶段规则不视为误导能力。
5. 页面和文案来源中均明确提示：如需用于小红书、抖音、官网或 GEO 内容，应先确认案例授权。
6. 扫描到的 `mock / customerId / getCustomer` 仅存在于内部变量、示例 ID、路由参数、状态码或云函数调用名，不作为用户可见问题。

是否建议后续再修：暂不建议。

## 禁止技术词检查

已检查六个页面及相关文案来源：

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

禁止词检查结论：

1. 六个页面用户可见文案未发现需立即补修的 `mock / Mock only / 本地 mock / Phase 3B / Readonly / listCustomers / getCustomer / getV2EvidenceSummary / customerId / openid / createProject / projects / project.customerId / fallback / mock_rule / 真实客户字段 / 真实客户数据 / 示例客户字段 / 客户字段`。
2. 未发现 `可直接发布 / 直接发小红书 / 直接用于官网/GEO` 等误导发布文案。
3. `case-assets` 中的 `不支持自动发布` 是限制说明，可以保留，不视为误导能力。
4. `v1ReadonlyAdapters.js` 中仍有内部 tags 值 `真实客户数据`，当前六个页面未展示该 tags 字段，不作为本阶段用户可见问题。
5. `v1ReadonlyAdapters.js` 中 `mapCustomerToProjectDraft` 的内部草案保护项仍包含 `Phase 3B-5 / createProject / projects`，当前 `contract-to-project` 页面未展示该字段，不作为本阶段用户可见问题。

## 允许内部标识说明

以下内容仍存在于代码内部，但本阶段不作为页面展示问题：

1. `mock_material_*`
2. `mock_only`
3. `../../mock/...`
4. `statusClass: 'mock'`
5. CSS class，例如 `mock-btn / mock-primary-btn / mock-note`
6. 事件名，例如 `mockGenerateDraft`
7. 变量名，例如 `customerId / urlCustomerId / fallback`
8. 路由参数名，例如 `?customerId=`
9. 云函数调用名，例如 `getCustomer / listCustomers / getV2EvidenceSummary`
10. 内部字段名，例如 `project.customerId / projects / createMode`

## 能力边界复查

复查结论：

1. `V2 试验功能`：`pipeline / trust-materials / contract-to-project / case-assets / customer-detail / ai-assistant` 均有试验或保护说明。
2. `只读客户资料`：六个页面均已通过数据源或保护说明表达。
3. `内部成交跟进`：`pipeline / customer-detail / trust-materials` 明确表达；其它页面通过内部参考、草案预览表达边界。
4. `示例内容 / 示例建议 / 示例草案`：六个页面对应状态均已收口。
5. `不调用真实 AI`：`customer-detail / ai-assistant` 明确表达。
6. `不会创建真实工地`：`contract-to-project` 明确表达。
7. `不支持自动发布`：`case-assets` 明确表达。
8. `公开使用需先确认授权`：`trust-materials / case-assets` 明确表达。
9. `不展示原始照片和日报正文`：`trust-materials / case-assets` 明确表达。
10. `不影响现有客户、工地和日报数据`：`trust-materials` 明确表达；其它页面对应表达不影响现有数据、客户数据或项目数据。

## 发布判断

当前发布判断：

1. `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
2. 本阶段未部署云函数。
3. 本阶段未上传体验版。
4. 当前仍不建议发布。
5. 当前仍不建议打开工作台入口。
6. 当前仍不建议给真实业务人员使用。

判断依据：

1. 当前仍是 V2 试验功能，工作台入口保持关闭。
2. Phase 5B 遗留错误态仍需要结合前序测试结论管理风险。
3. 本阶段只完成最终文案静态验收，不等于发布验收。

## 风险点

1. 本阶段主要基于页面文件和相关 mock/utils 文案来源做静态验收，未进行微信开发者工具逐页人工截图验收。
2. 内部变量、class、路由参数和云函数名仍保留技术词，后续扫描时需要继续区分内部标识与用户可见文案。
3. `v1ReadonlyAdapters.js` 中仍存在未展示的历史保护文案和内部 tags，若未来页面展示这些字段，需要再次清理。
4. 即使最终文案验收通过，当前仍不建议发布、不建议上传体验版、不建议打开工作台入口。

## 是否建议进入 Phase 5D

不建议直接进入 Phase 5D。

建议先保持：

1. `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
2. 不上传体验版。
3. 不给真实业务人员使用。
4. 如后续要推进，应先做开发者工具逐页人工验收或发布前风险复核，再判断是否进入 Phase 5D。
