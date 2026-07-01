# V2 Deal Loop Phase 5C-C：V2 全链路技术词文案清理设计

## 当前阶段

Phase 5C-C：V2 全链路技术词文案清理设计。

本阶段只审计并设计 V2 deal-loop 页面中的技术词、开发态词、mock 词、内部字段词文案清理方案。不修改业务代码，不部署，不上传体验版，不打开工作台入口，不进入 Phase 5C-D。

## 当前 HEAD / tag

- 当前 HEAD：`8b15488c720148becf77ab5d075b26a707419d8a`
- 当前 tag：`v2-deal-loop-phase5c-b-copy-risk-implementation`

## 审计目标

1. 只读审计 V2 页面：`pipeline / customer-detail / ai-assistant / trust-materials / contract-to-project / case-assets`。
2. 只读审计相关 mock / utils 文案来源。
3. 区分用户可见技术词和内部代码标识。
4. 设计统一替换词表，保证老板/销售看到的是业务语义，不是开发态术语。
5. 给 Phase 5C-D 提供最小实现范围：只改用户可见文案，不改业务逻辑。

## 用户可见技术词清单

本阶段发现的用户可见技术词或开发态词主要包括：

```text
mock
Mock only
V2 AI 跟进 mock
本地 mock
Phase 3B
Phase 2.5
Readonly
customerId
URL customerId
mock_rule
fallback
getCustomer
listCustomers
createProject
projects
project.customerId
customer._id / customerId
真实客户字段
Mock fallback
模拟发送
可直接发布类表达
直接发小红书 / 抖音 / 官网 / GEO 类表达
case_authorizations
openid
```

说明：

1. `trust-materials` 经 Phase 5C-B 后，页面用户可见 mock 文案已基本收口。
2. 其它 V2 页面仍保留较多 Phase 3B / mock / Readonly / customerId / getCustomer 等开发态文案。
3. `case-assets` 中公开平台相关文案需要特别谨慎，避免“草案”被销售理解为可直接发布。
4. `customer-detail` 中出现 `openid` 是“已脱敏隐藏”的安全说明，但对老板/销售仍偏技术，可替换为“微信身份标识”。

## 内部标识保留说明

以下属于内部代码标识，本阶段不作为问题，不建议为文案清理而修改：

```text
mock_material_*
mock_customer_*
mock_only
mock_draft
authorized_public_mock
sourceCollection: mock_trust_materials
statusClass: 'mock'
dataSourceClass: 'mock'
CSS class: mock-btn / mock-primary-btn / mock-note
文件路径：../../mock/...
函数名：getMockCustomerById / buildMockSendText
变量名：customerId / projectId / caseAssetId
```

保留原因：

1. 这些标识用于本地示例数据、样式状态、路由参数和内部数据关联。
2. 直接重命名会扩大影响范围，可能影响素材匹配、页面跳转或样式。
3. Phase 5C-D 的目标应限定为用户可见文案，不做内部标识重命名。

## 各页面文案问题与替换建议

### 1. pipeline

当前发现的问题文案：

| 位置 | 当前文案 | 问题 |
| --- | --- | --- |
| 顶部标签 | `Phase 3B-1 Readonly / 不影响 V1` | 开发阶段词、英文技术词 |
| 数据源 | `Mock fallback` | 开发态 fallback / mock |
| 数据源说明 | `listCustomers 暂无可展示客户，已使用本地 mock。` | 暴露云函数名、mock |
| 数据源说明 | `只读来自 listCustomers，未写入任何集合。` | 暴露云函数名和数据库语义 |
| 保护规则标题 | `Phase 2.5 本地 mock 保护规则` | 开发阶段词、mock |
| 保护规则内容 | `仅 pipeline 只读调用 listCustomers` | 暴露页面内部和云函数名 |
| Toast | `缺少客户ID，无法推荐素材` | ID 技术词 |

推荐替换文案：

| 当前文案 | 推荐替换 |
| --- | --- |
| `Phase 3B-1 Readonly / 不影响 V1` | `V2 试验功能 / 不影响现有业务` |
| `Mock fallback` | `示例内容` |
| `listCustomers 暂无可展示客户，已使用本地 mock。` | `暂无可展示客户，当前展示示例内容。` |
| `只读来自 listCustomers，未写入任何集合。` | `只读展示客户资料，不修改任何数据。` |
| `Phase 2.5 本地 mock 保护规则` | `V2 试验功能保护说明` |
| `仅 pipeline 只读调用 listCustomers` | `仅展示成交跟进队列，不修改客户数据` |
| `缺少客户ID，无法推荐素材` | `未找到客户资料，无法推荐素材` |

风险等级：中。

是否建议 Phase 5C-D 修改：建议。

是否会影响业务逻辑：不会，只改展示文案。

### 2. customer-detail

当前发现的问题文案：

| 位置 | 当前文案 | 问题 |
| --- | --- | --- |
| 跟进记录标题 | `本地 mock 跟进记录` | mock 词用户可见 |
| 空态 | `暂无本地 mock 跟进记录。` | mock 词用户可见 |
| 助手说明 | `当前为本地 mock 建议，不调用真实 AI。` | mock 词和技术态 |
| 安全说明 | `openid` | 技术字段 |
| 保护规则标题 | `Phase 3B-2 本地 mock 保护规则` | 开发阶段词、mock |
| 数据源 | `Mock fallback` | mock / fallback |
| 数据源说明 | `未提供客户 ID，已使用本地 mock。` | ID / mock |
| 数据源说明 | `只读来自 getCustomer，未写入任何集合。` | 暴露云函数名和数据库语义 |
| 错误数据源 | `加载失败，已回退 mock` | mock / fallback |
| 保护规则 | `Phase 3B-2 Readonly` / `仅可调用 getCustomer` | 开发阶段词、英文技术词、云函数名 |
| Toast | `缺少客户ID，无法生成 AI 话术` 等 | ID 技术词 |

推荐替换文案：

| 当前文案 | 推荐替换 |
| --- | --- |
| `本地 mock 跟进记录` | `示例跟进记录` |
| `暂无本地 mock 跟进记录。` | `暂无示例跟进记录。` |
| `当前为本地 mock 建议，不调用真实 AI。` | `当前为示例建议，仅供内部参考。` |
| `openid` | `微信身份标识` |
| `Phase 3B-2 本地 mock 保护规则` | `V2 试验功能保护说明` |
| `Mock fallback` | `示例内容` |
| `未提供客户 ID，已使用本地 mock。` | `未从客户列表进入，当前展示示例内容。` |
| `只读来自 getCustomer，未写入任何集合。` | `只读展示客户资料，不修改任何数据。` |
| `加载失败，已回退 mock` | `客户资料暂时读取失败，已展示示例内容` |
| `Phase 3B-2 Readonly` | `V2 试验功能，只读展示` |
| `仅可调用 getCustomer` | `仅读取客户资料` |
| `缺少客户ID` | `未找到客户资料` |

风险等级：中。

是否建议 Phase 5C-D 修改：建议。

是否会影响业务逻辑：不会，只改展示文案。

### 3. ai-assistant

当前发现的问题文案：

| 位置 | 当前文案 | 问题 |
| --- | --- | --- |
| 导航栏标题 | `V2 AI 跟进 mock` | mock 词用户可见 |
| 顶部标签 | `Mock only` | 英文开发态 |
| 描述 | `当前为本地 mock 建议，不调用真实 AI。` | mock 词 |
| 客户上下文 | `当前 URL customerId` | URL / customerId 技术词 |
| 生成方式 | `mock_rule` / `mock_rule_real_customer` | 内部规则名会展示给用户 |
| 按钮 | `重新生成 mock` | mock 词 |
| 保护规则标题 | `Phase 2.5 本地 mock 保护规则` | 开发阶段词、mock |
| JS 数据源 | `Mock fallback` | mock / fallback |
| JS 提示 | `未提供客户 ID，已使用默认 mock 演示客户。` | ID / mock |
| JS 提示 | `URL customerId...getCustomer 失败...已使用同 ID mock。` | URL / customerId / getCustomer / mock |
| JS 提示 | `已生成 mock 建议` | mock 词 |
| 保护规则 | `Phase 3B-3 Readonly` / `仅可调用 getCustomer` | 技术词 |

推荐替换文案：

| 当前文案 | 推荐替换 |
| --- | --- |
| `V2 AI 跟进 mock` | `V2 AI 跟进建议` |
| `Mock only` | `示例建议` |
| `当前为本地 mock 建议，不调用真实 AI。` | `当前为示例建议，仅供销售跟进参考。` |
| `当前 URL customerId` | `当前客户来源` / 直接隐藏 |
| `生成方式：mock_rule` | `生成方式：示例规则` 或隐藏该行 |
| `重新生成 mock` | `重新生成示例建议` |
| `Phase 2.5 本地 mock 保护规则` | `V2 试验功能保护说明` |
| `Mock fallback` | `示例建议` |
| `未提供客户 ID，已使用默认 mock 演示客户。` | `未从客户列表进入，当前展示示例建议。` |
| `URL customerId...getCustomer 失败...` | `客户资料暂时读取失败，当前展示示例建议。` |
| `已生成 mock 建议` | `已生成示例建议` |
| `Phase 3B-3 Readonly` | `V2 试验功能，只读展示` |
| `仅可调用 getCustomer` | `仅读取客户资料` |

风险等级：高。

原因：AI 页面是销售高频入口，导航标题和页面内容中的 `mock / Mock only / mock_rule / URL customerId` 对老板和销售最刺眼。

是否建议 Phase 5C-D 修改：强烈建议。

是否会影响业务逻辑：不会，只改展示文案。

### 4. trust-materials

当前发现的问题文案：

| 位置 | 当前文案 | 问题 |
| --- | --- | --- |
| 数据源 | `真实客户字段 + 示例推荐素材` | “字段”偏技术 |
| 数据源 | `真实客户字段 + 真实证据摘要 + 示例推荐素材` | “字段”偏技术 |
| 内部状态 | `statusClass: 'mock'` | 内部标识，不是用户可见问题 |
| 内部路径/ID | `mock_material_*` 等 | 内部标识，不是用户可见问题 |

推荐替换文案：

| 当前文案 | 推荐替换 |
| --- | --- |
| `真实客户字段 + 示例推荐素材` | `只读客户资料 + 示例推荐素材` |
| `真实客户字段 + 真实证据摘要 + 示例推荐素材` | `只读客户资料 + 真实证据摘要 + 示例推荐素材` |

风险等级：低。

是否建议 Phase 5C-D 修改：可选，建议顺手收口。

是否会影响业务逻辑：不会，只改展示文案。

### 5. contract-to-project

当前发现的问题文案：

| 位置 | 当前文案 | 问题 |
| --- | --- | --- |
| 描述 | `Phase 3B-5 不调用 createProject，不写 projects。` | 开发阶段词、函数名、集合名 |
| 字段 | `project.customerId` | 内部字段 |
| 按钮 | `生成工地草案（mock）` | mock 词 |
| 保护规则 | `Phase 2.5 本地 mock 保护规则` | 开发阶段词、mock |
| JS 默认客户 | `Mock 演示客户` | mock 词 |
| 数据源 | `Mock fallback` | mock / fallback |
| 数据源 | `真实客户字段 + 工地草案` | “字段”偏技术 |
| 提示 | `未提供客户 ID，使用默认 mock 草案` | ID / mock |
| 提示 | `URL customerId...getCustomer...` | URL / customerId / 云函数名 |
| 映射 | `customer._id / customerId` -> `project.customerId` | 内部字段 |
| 检查项 | `客户 ID 已归一` | 技术词 |
| 检查项 | `不触发真实工地创建，不写 projects` | 集合名 |
| Modal | `Phase 3B-5 仅生成工地草案，不调用 createProject，不写 projects。` | 开发阶段词、函数名、集合名 |

推荐替换文案：

| 当前文案 | 推荐替换 |
| --- | --- |
| `Phase 3B-5 不调用 createProject，不写 projects。` | `当前仅预览工地草案，不创建真实工地。` |
| `project.customerId` | `关联客户` |
| `生成工地草案（mock）` | `预览工地草案` |
| `Phase 2.5 本地 mock 保护规则` | `V2 试验功能保护说明` |
| `Mock 演示客户` | `示例演示客户` |
| `Mock fallback` | `示例草案` |
| `真实客户字段 + 工地草案` | `只读客户资料 + 工地草案` |
| `未提供客户 ID，使用默认 mock 草案` | `未从客户列表进入，当前展示示例草案。` |
| `URL customerId...getCustomer...` | `客户资料只读加载完成，当前仅生成草案。` |
| `customer._id / customerId` | `客户资料` |
| `project.customerId` | `关联客户` |
| `客户 ID 已归一` | `客户资料已关联` |
| `不写 projects` | `不创建真实工地` |

风险等级：高。

原因：该页面涉及“签约转工地”，如果仍暴露 `createProject / projects / project.customerId`，老板/销售难以理解。

是否建议 Phase 5C-D 修改：强烈建议。

是否会影响业务逻辑：不会，只改展示文案。

### 6. case-assets

当前发现的问题文案：

| 位置 | 当前文案 | 问题 |
| --- | --- | --- |
| 顶部标签 | `案例资产 mock 草案` | mock 词 |
| 描述 | `mock 案例内容草案` | mock 词 |
| 描述 | `不修改 case_authorizations` | 内部集合名 |
| 按钮 | `复制小红书标题（mock）` | mock 词 |
| 按钮 | `复制抖音选题（mock）` | mock 词 |
| 按钮 | `复制 GEO 问答（mock）` | mock 词 |
| 标题 | `可用素材清单 mock` | mock 词 |
| 标题 | `授权状态 mock` | mock 词 |
| 按钮 | `确认仅生成 mock 草案` | mock 词 |
| 保护规则 | `Phase 3B-6 保护规则` | 开发阶段词 |
| JS 默认客户 | `Mock 案例演示客户` | mock 词 |
| JS 来源 | `mock 演示` | mock 词 |
| JS 状态 | `Mock fallback` | mock / fallback |
| JS 数据源 | `真实客户字段 + Mock 案例草案` | “字段”技术词 + mock |
| JS 提示 | `未提供客户 ID，使用默认 mock 案例草案` | ID / mock |
| JS 提示 | `URL customerId...getCustomer...本地 mock 草案` | URL / customerId / getCustomer / mock |
| 安全说明 | `当前仅为 mock 案例资产草案...不修改 case_authorizations。` | mock / 内部集合名 |
| Modal | `Phase 3B-6 仅生成 mock 案例资产草案，不请求 API，不写数据库，不自动发布。` | 开发阶段词 / mock / API |

推荐替换文案：

| 当前文案 | 推荐替换 |
| --- | --- |
| `案例资产 mock 草案` | `案例内容草案` |
| `mock 案例内容草案` | `示例案例内容草案` |
| `不修改 case_authorizations` | `不修改真实授权记录` |
| `复制小红书标题（mock）` | `复制小红书标题草案` |
| `复制抖音选题（mock）` | `复制抖音选题草案` |
| `复制 GEO 问答（mock）` | `复制 GEO 问答草案` |
| `可用素材清单 mock` | `可用素材清单` |
| `授权状态 mock` | `授权状态说明` |
| `确认仅生成 mock 草案` | `确认仅生成草案` |
| `Phase 3B-6 保护规则` | `V2 试验功能保护说明` |
| `Mock 案例演示客户` | `示例案例演示客户` |
| `mock 演示` | `示例演示` |
| `Mock fallback` | `示例案例草案` |
| `真实客户字段 + Mock 案例草案` | `只读客户资料 + 示例案例草案` |
| `未提供客户 ID，使用默认 mock 案例草案` | `未从客户列表进入，当前展示示例案例草案。` |
| `URL customerId...getCustomer...` | `客户资料只读加载完成，当前仅生成案例草案。` |
| `不请求 API` | `不调用发布服务` |

风险等级：高。

原因：该页面包含小红书、抖音、官网、GEO 等公开渠道，必须持续强调“草案 / 示例 / 需授权”，避免被理解为可直接公开发布。

是否建议 Phase 5C-D 修改：强烈建议。

是否会影响业务逻辑：不会，只改展示文案。

## 统一替换词表

| 技术词 / 开发态词 | 推荐业务文案 |
| --- | --- |
| `mock` | `示例` |
| `Mock only` | `示例内容` / `示例建议` |
| `本地 mock` | `本地示例` |
| `Mock fallback` | `示例内容` / `示例草案` |
| `fallback` | `示例内容` / `暂时展示示例` |
| `Phase 3B Readonly` | `V2 试验功能 / 只读展示` |
| `Phase 2.5 本地 mock 保护规则` | `V2 试验功能保护说明` |
| `Readonly` | `只读展示` |
| `customerId` | `客户资料` / `关联客户` / 不展示 |
| `URL customerId` | `客户来源` / 不展示 |
| `mock_rule` | `示例规则` / 不展示 |
| `getCustomer` | `读取客户资料` / 不展示 |
| `listCustomers` | `读取客户列表` / 不展示 |
| `getV2EvidenceSummary` | `读取证据摘要` / 不展示 |
| `createProject` | `创建真实工地` |
| `projects` | `工地数据` |
| `project.customerId` | `关联客户` |
| `customer._id / customerId` | `客户资料` |
| `真实客户字段` | `只读客户资料` |
| `真实证据摘要 + Mock 推荐素材` | `真实证据摘要 + 示例推荐素材` |
| `Mock 推荐素材` | `示例推荐素材` |
| `未提供客户入口` | `未从客户列表进入，当前仅展示示例内容。` |
| `模拟发送` | `示例预览` / `查看示例话术` |
| `mock 发送` | `查看示例话术` |
| `可直接发布` | `需授权后公开使用` |
| `直接发小红书 / 抖音 / 官网 / GEO` | `需确认授权后用于公开渠道` |
| `case_authorizations` | `案例授权记录` / `真实授权记录` |
| `openid` | `微信身份标识` |
| `API` | `服务` / 不展示 |

## Phase 5C-D 最小实现建议

Phase 5C-D 如进入实现，建议按页面顺序最小改动：

1. 优先改 `ai-assistant`、`case-assets`、`contract-to-project` 三个高风险页面。
2. 再改 `customer-detail`、`pipeline`。
3. `trust-materials` 只做低风险措辞收口，将“真实客户字段”替换为“只读客户资料”。

允许修改范围建议：

```text
miniprogram/subpackages/deal-loop/pages/pipeline/**
miniprogram/subpackages/deal-loop/pages/customer-detail/**
miniprogram/subpackages/deal-loop/pages/ai-assistant/**
miniprogram/subpackages/deal-loop/pages/trust-materials/**
miniprogram/subpackages/deal-loop/pages/contract-to-project/**
miniprogram/subpackages/deal-loop/pages/case-assets/**
miniprogram/subpackages/deal-loop/mock/caseAssets.js
miniprogram/subpackages/deal-loop/mock/aiSuggestions.js
miniprogram/subpackages/deal-loop/mock/followRecords.js
miniprogram/subpackages/deal-loop/utils/aiMockEngine.js
miniprogram/subpackages/deal-loop/utils/riskGuards.js
```

Phase 5C-D 必须遵守：

1. 只改用户可见文案。
2. 不改业务逻辑。
3. 不改云函数。
4. 不改入口。
5. 不改 `app.json`。
6. 不改 tabBar。
7. 不改真实数据读取逻辑。
8. 不改 fallback / 错误态 / 授权判断逻辑。
9. 不新增云函数调用。
10. 不写数据库。
11. 不部署。
12. 不上传体验版。

建议验收方式：

1. `node --check` 所有被改 JS。
2. `git diff --check`。
3. 搜索用户可见禁用词：

```text
Mock only
本地 mock
mock 已授权公开
当前为本地 mock 建议
mock 发送
模拟发送
Phase 3B
Readonly
URL customerId
getCustomer
getV2EvidenceSummary
可直接发布
直接发小红书
直接用于官网/GEO
```

4. 确认剩余 `mock_material_* / mock_only / statusClass: 'mock' / ../../mock/...` 均为内部标识。

## 风险点

1. 一次性跨 6 个页面清文案，容易误改逻辑；Phase 5C-D 应严格只改字符串和少量展示标签。
2. `case-assets` 涉及公开平台文案，必须避免“可直接发布”的暗示。
3. `contract-to-project` 涉及工地创建草案，必须避免误导为已经创建真实工地。
4. `ai-assistant` 中 `generatedBy` 直接展示内部规则名，建议隐藏或映射为“示例规则”。
5. `riskGuards` 是多页面共享文案来源，修改时要确认所有页面展示语义一致。
6. 内部标识不建议在 Phase 5C-D 重命名，否则可能影响匹配、跳转、样式和本地示例数据。
7. 当前 `ENABLE_V2_DEAL_LOOP_ENTRY = false`，即使清文案完成，也不等于可以发布或打开入口。

## 是否建议进入 Phase 5C-D

建议进入 Phase 5C-D 做最小文案清理实现。

但不建议进入发布、上传体验版或入口开放阶段。Phase 5C-D 完成后仍需单独人工验收全链路页面文案，再评估是否继续后续阶段。
