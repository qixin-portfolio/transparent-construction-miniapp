# 透明工地 V2：成交闭环版 — Phase 1 设计

## 1. 当前阶段

Phase 1：V2 模块边界与数据结构设计

- 设计日期：2026-06-29
- 前置状态文件：`AI_TASKS/V2_DEAL_LOOP_STATE.md`
- 本阶段只新增文档，不实现页面，不改业务代码，不改云函数，不改数据库读写逻辑。

## 2. 设计原则

1. V2 必须独立于 V1 主链路，先做 mock，再做只读，再做小范围真实写入。
2. V1 的 `customers`、`projects`、`stage_logs`、`photos` 等集合不重命名、不删字段、不改旧字段语义。
3. V2 新能力优先放在独立分包 `miniprogram/subpackages/deal-loop/`。
4. V2 AI 第一阶段只用 mock 规则，不接真实 API，不复用 `aiGenerateOwnerSummary` 的真实 AI 调用。
5. V2 写入能力后续必须走新增集合或新增云函数，不直接改 V1 云函数。
6. V2 对 V1 数据的第一阶段接入只允许只读聚合。
7. 涉及数据库集合创建、云函数部署、数据迁移、体验版上传的动作必须进入 Human Gate。

## 3. 独立分包方案

### 为什么放在独立分包

1. 隔离 V1 主链路：不影响当前工作台、客户库、工地详情、业主端、日报审核。
2. 可回滚：后续 Phase 2 如只新增 `subpackages/deal-loop`，删除分包即可回退 mock 原型。
3. 可停止：V2 未成熟时不暴露到现有 tabBar，不影响测试版使用。
4. 权限清晰：V2 初期只给 `admin`、`boss_qi`、`boss_hu`、`designer`、`sales` 使用。
5. 数据边界清晰：V2 独立 mock、独立 utils、未来独立云函数，不污染 V1。
6. 便于后续灰度：可通过独立入口、隐藏入口、角色入口逐步开放。

### 建议目录结构

```text
miniprogram/subpackages/deal-loop/
  pages/
    pipeline/
      pipeline.js
      pipeline.json
      pipeline.wxml
      pipeline.wxss
    customer-detail/
      customer-detail.js
      customer-detail.json
      customer-detail.wxml
      customer-detail.wxss
    ai-assistant/
      ai-assistant.js
      ai-assistant.json
      ai-assistant.wxml
      ai-assistant.wxss
    trust-materials/
      trust-materials.js
      trust-materials.json
      trust-materials.wxml
      trust-materials.wxss
    contract-to-project/
      contract-to-project.js
      contract-to-project.json
      contract-to-project.wxml
      contract-to-project.wxss
    case-assets/
      case-assets.js
      case-assets.json
      case-assets.wxml
      case-assets.wxss
  mock/
    customers.js
    followRecords.js
    trustMaterials.js
    aiSuggestions.js
    caseAssets.js
  utils/
    pipelineStatus.js
    materialMapper.js
    aiMockEngine.js
    v1Adapters.js
    riskGuards.js
```

> Phase 1 只设计以上结构，不创建真实页面和 mock 文件。

### 页面职责

- `pipeline`：客户成交管道总览，按阶段查看客户、下一步动作和超时提醒。
- `customer-detail`：客户详情、需求、跟进记录、下一步动作、关联工地状态。
- `ai-assistant`：基于客户阶段和跟进记录生成 mock 跟进建议、话术和素材推荐。
- `trust-materials`：聚合信任素材，后续只读复用 V1 日报、照片、图纸、案例、质保。
- `contract-to-project`：签约后生成工地创建草案，不直接写 V1 `projects`。
- `case-assets`：完工后整理案例资产草案，不自动发布、不写公开案例。

### Mock 文件职责

- `mock/customers.js`：V2 客户管道样例数据，映射 V1 客户字段和 V2 扩展字段。
- `mock/followRecords.js`：客户跟进记录样例，按客户 ID 关联。
- `mock/trustMaterials.js`：信任素材样例，统一表达日报、照片、图纸、案例、质保等来源。
- `mock/aiSuggestions.js`：AI 跟进建议样例，按客户阶段、疑虑、素材类型输出。
- `mock/caseAssets.js`：工地转案例资产样例，表达案例标题、素材、授权状态和内容草案。

### Utils 文件职责

- `utils/pipelineStatus.js`：V1 `stage/dealStatus/lifecycleStatus` 到 V2 管道状态的映射。
- `utils/materialMapper.js`：把 V1 日报、照片、图纸、案例授权映射成 V2 信任素材对象。
- `utils/aiMockEngine.js`：基于 mock 规则生成跟进建议，不接真实 API。
- `utils/v1Adapters.js`：只读适配 V1 数据结构，避免页面直接依赖 V1 字段细节。
- `utils/riskGuards.js`：集中定义禁止写入 V1、禁止真实 API、禁止部署等阶段保护规则。

### 不能直接复用、只能做适配层的逻辑

- `createProject`：后续只能通过草案适配层生成 payload，不能在 V2 初期直接调用写库。
- `updateCustomer`：不能直接扩展 V2 跟进记录到 `customers` 主文档。
- `submitStageLog` / `reviewStageLog`：日报审核可见逻辑与 V1 业主端强绑定，只能只读复用结果。
- `bindOwnerProject` / `createOwnerBindCode`：业主绑定涉及真实身份和权限，V2 不直接改。
- `deliverProject`：交付会更新 `projects`、`customers`、`warranty_cards`，V2 初期只能读交付状态。
- `deleteProject` / `deleteCustomer`：删除逻辑高风险，V2 不复用。
- `aiGenerateOwnerSummary`：已接真实 AI 环境变量，V2 AI 跟进助手不能直接复用。

### 可以只读复用的 V1 能力

- 客户列表与客户字段：`customers`
- 工地与客户关联：`projects.customerId`、`projects.customerName`
- 日报与照片：`stage_logs`、`photos`
- 图纸：`design_drawings`
- 完工资料：`owner_archives`、`warranty_cards`、`completionPhotoFileIDs`
- 案例授权：`case_authorizations`
- 公开案例聚合逻辑：参考 `listPublicCases` 的映射方式，但不直接修改它。
- 角色判断：参考 `ROLES`、`INTERNAL_ROLES`、`CUSTOMER_LIFECYCLE_LABELS`

## 4. 页面边界

### 4.1 pipeline：客户成交管道

- 页面目标：把客户按成交阶段展示，帮助老板和销售看到每个客户卡在哪里。
- 用户角色：`admin`、`boss_qi`、`boss_hu`、`designer`、`sales`
- 数据来源：Phase 2 使用 `mock/customers.js`；Phase 3 可只读 `customers`
- 关键字段：`customerId`、`name`、`phoneMasked`、`stage`、`dealStatus`、`lifecycleStatus`、`pipelineStage`、`nextAction`、`lastFollowAt`、`nextFollowAt`、`riskLevel`、`ownerUserId`
- 主要操作：筛选阶段、查看客户详情、查看超时客户、进入 AI 建议
- 是否读 V1 数据：Phase 2 否，Phase 3 是
- 是否写 V1 数据：否
- 风险等级：低
- 验收标准：能用 mock 数据展示所有管道阶段；不依赖 V1 云函数；不影响 V1 客户库。

### 4.2 customer-detail：客户详情与跟进记录

- 页面目标：展示客户画像、需求、历史跟进、推荐素材和下一步动作。
- 用户角色：`admin`、`boss_qi`、`boss_hu`、`designer`、`sales`
- 数据来源：`mock/customers.js`、`mock/followRecords.js`、`mock/trustMaterials.js`
- 关键字段：`customerId`、`name`、`source`、`phoneMasked`、`community`、`area`、`budgetRange`、`stylePreference`、`painPoints`、`followRecords`、`linkedProjectId`
- 主要操作：查看跟进记录、查看推荐素材、进入 AI 跟进助手、进入签约转工地草案
- 是否读 V1 数据：Phase 2 否，Phase 3 可只读 `customers`、`projects`
- 是否写 V1 数据：否
- 风险等级：中
- 验收标准：跟进记录独立于 `customers` 主文档；不改 V1 客户详情页；不调用 `updateCustomer`。

### 4.3 ai-assistant：AI 跟进助手 mock

- 页面目标：根据客户阶段、疑虑和跟进记录，生成下一句跟进话术和素材推荐。
- 用户角色：`admin`、`boss_qi`、`boss_hu`、`designer`、`sales`
- 数据来源：`mock/aiSuggestions.js`、`mock/customers.js`、`mock/followRecords.js`
- 关键字段：`suggestionId`、`customerId`、`triggerStage`、`customerConcern`、`recommendedMessage`、`recommendedMaterialIds`、`tone`、`confidenceLabel`、`riskNotes`
- 主要操作：生成 mock 建议、复制话术、查看推荐素材、保存为草稿
- 是否读 V1 数据：Phase 2 否；Phase 3 可只读客户阶段和素材
- 是否写 V1 数据：否
- 风险等级：中
- 验收标准：不请求真实 AI API；不调用 `aiGenerateOwnerSummary`；建议内容明确标注 mock。

### 4.4 trust-materials：信任素材库

- 页面目标：把工地照片、日报、图纸、完工案例、质保、售后说明整理成销售可用素材。
- 用户角色：`admin`、`boss_qi`、`boss_hu`、`designer`、`sales`
- 数据来源：Phase 2 使用 `mock/trustMaterials.js`；Phase 3 只读 `stage_logs`、`photos`、`design_drawings`、`case_authorizations`、`warranty_cards`
- 关键字段：`materialId`、`type`、`title`、`sourceCollection`、`sourceId`、`projectId`、`stageCode`、`tags`、`visibleScope`、`authorizationStatus`、`fileIDs`、`summary`
- 主要操作：筛选类型、查看素材详情、复制素材说明、关联到客户跟进建议
- 是否读 V1 数据：Phase 2 否，Phase 3 是
- 是否写 V1 数据：否
- 风险等级：中
- 验收标准：素材对象能表达 V1 多来源；不改变 `ownerVisible`、案例授权和图纸可见逻辑。

### 4.5 contract-to-project：签约转工地适配入口

- 页面目标：客户签约后生成工地创建草案，减少重复录入。
- 用户角色：`admin`、`boss_qi`、`boss_hu`、`designer`、`sales`
- 数据来源：`mock/customers.js`，未来只读 `customers`
- 关键字段：`customerId`、`customerName`、`address`、`projectNameDraft`、`contractStatus`、`projectPayloadDraft`、`createMode`、`riskChecklist`
- 主要操作：预览工地创建草案、校验必填字段、进入 V1 工地创建入口
- 是否读 V1 数据：Phase 2 否，Phase 3 可只读 `customers`
- 是否写 V1 数据：否；真实写入必须等 Phase 4/5 人工确认
- 风险等级：高
- 验收标准：只生成草案，不调用 `createProject`，不写 `projects`，不改客户成交状态。

### 4.6 case-assets：工地转案例资产

- 页面目标：完工后把工地过程资料整理成案例资产草案，用于销售、朋友圈、小红书、官网/GEO。
- 用户角色：`admin`、`boss_qi`、`boss_hu`、`designer`、`sales`
- 数据来源：`mock/caseAssets.js`、`mock/trustMaterials.js`；未来只读 `projects`、`stage_logs`、`photos`、`case_authorizations`
- 关键字段：`caseAssetId`、`projectId`、`customerId`、`title`、`style`、`area`、`materials`、`authorizationStatus`、`contentDrafts`、`publishTargets`、`privacyFlags`
- 主要操作：查看案例素材、生成内容草案、检查授权状态、复制文案
- 是否读 V1 数据：Phase 2 否，Phase 3 是
- 是否写 V1 数据：否
- 风险等级：高
- 验收标准：不自动发布，不创建公开案例，不改变 `case_authorizations`，隐私字段有明确提示。

## 5. Mock 数据结构

以下只是字段草案，不创建真实 mock 文件。

### mock/customers.js

```js
{
  customerId: 'mock_customer_001',
  v1CustomerId: 'optional_v1_customer_id',
  tenantId: 'tenant_shengjing_default',
  name: '王姐',
  phoneMasked: '139****2860',
  source: '老客户推荐',
  community: '万硕花园',
  address: '交城万硕花园 5-1-402',
  area: '148平',
  layout: '四室两厅两卫',
  budgetRange: '15-18万',
  stylePreference: '意式简约',
  need: '环保、收纳、预算透明',
  stage: '已报价',
  dealStatus: '未成交',
  lifecycleStatus: 'quoted',
  pipelineStage: 'quote_following',
  nextAction: '解释报价差异并发送水电验收素材',
  nextFollowAt: '2026-07-01 10:00',
  lastFollowAt: '2026-06-28 16:30',
  riskLevel: 'medium',
  riskReasons: ['对价格敏感', '正在对比别家报价'],
  linkedProjectId: '',
  ownerUserId: '',
  tags: ['新房', '改善型', '重视环保'],
  createdAt: '2026-06-29T00:00:00+08:00',
  updatedAt: '2026-06-29T00:00:00+08:00'
}
```

### mock/followRecords.js

```js
{
  followId: 'mock_follow_001',
  customerId: 'mock_customer_001',
  tenantId: 'tenant_shengjing_default',
  type: 'wechat',
  direction: 'outbound',
  content: '已发送报价拆解和水电验收案例。',
  customerFeedback: '客户觉得价格仍然偏高，想再和家人商量。',
  nextAction: '明天补发同小区案例和环保材料说明',
  nextFollowAt: '2026-07-01 10:00',
  relatedMaterialIds: ['mock_material_001'],
  createdByRole: 'sales',
  createdByName: '胡秀芬',
  createdAt: '2026-06-29T10:30:00+08:00'
}
```

### mock/trustMaterials.js

```js
{
  materialId: 'mock_material_001',
  tenantId: 'tenant_shengjing_default',
  type: 'stage_log_photo',
  title: '水电验收现场照片',
  summary: '展示水电走线、打压记录和现场留痕。',
  sourceCollection: 'stage_logs',
  sourceId: 'optional_v1_stage_log_id',
  projectId: 'optional_v1_project_id',
  stageCode: 'water_electric_acceptance',
  stageName: '水电验收',
  fileIDs: ['cloud://mock-file-id'],
  tags: ['水电', '隐蔽工程', '验收'],
  visibleScope: 'internal_sales',
  authorizationStatus: 'internal_only',
  ownerVisible: true,
  recommendedForConcerns: ['担心施工质量', '担心隐蔽工程'],
  createdAt: '2026-06-29T00:00:00+08:00'
}
```

### mock/aiSuggestions.js

```js
{
  suggestionId: 'mock_ai_001',
  customerId: 'mock_customer_001',
  triggerStage: 'quote_following',
  customerConcern: '觉得报价高',
  recommendedMessage: '王姐，您对比价格很正常。我先把水电和环保材料这两块拆开给您看，哪些钱是必须花在隐蔽工程上的，您心里会更清楚。',
  recommendedMaterialIds: ['mock_material_001'],
  nextAction: '发送报价拆解和水电验收素材',
  tone: '老板娘温柔',
  confidenceLabel: 'mock_high',
  riskNotes: ['不能承诺最低价', '不能承诺绝对无增项'],
  generatedBy: 'mock_rule',
  createdAt: '2026-06-29T00:00:00+08:00'
}
```

### mock/caseAssets.js

```js
{
  caseAssetId: 'mock_case_asset_001',
  tenantId: 'tenant_shengjing_default',
  projectId: 'optional_v1_project_id',
  customerId: 'optional_v1_customer_id',
  title: '万硕花园 148 平意式简约',
  community: '万硕花园',
  area: '148平',
  layout: '四室两厅两卫',
  style: '意式简约',
  projectStatusCode: 'delivered',
  materialIds: ['mock_material_001'],
  authorizationStatus: 'pending',
  privacyFlags: ['hide_owner_name', 'hide_exact_address'],
  contentDrafts: [
    {
      target: 'xiaohongshu',
      title: '交城 148 平意式简约，预算透明比低价更重要',
      body: 'mock 文案草案',
      status: 'draft'
    }
  ],
  publishTargets: ['sales_wechat', 'xiaohongshu', 'douyin', 'geo_site'],
  createdAt: '2026-06-29T00:00:00+08:00'
}
```

## 6. 未来数据库草案

> 本节只做集合草案，不创建集合，不部署云函数，不写入数据。

### v2_customer_followups

用途：存储客户跟进记录，避免把多条跟进历史塞进 V1 `customers` 文档。

建议字段：

- `_id`
- `tenantId`
- `customerId`：关联 V1 `customers._id`
- `projectId`：可选，关联 V1 `projects._id`
- `type`：`wechat` / `phone` / `store_visit` / `measure_house` / `quote` / `other`
- `direction`：`inbound` / `outbound`
- `content`
- `customerFeedback`
- `nextAction`
- `nextFollowAt`
- `relatedMaterialIds`
- `createdBy`
- `createdByOpenid`
- `createdByRole`
- `createdAt`
- `updatedAt`

### v2_trust_materials

用途：沉淀销售可用素材索引。第一阶段建议只读生成，不落库；后续如落库，只保存索引和摘要，不复制 V1 文件。

建议字段：

- `_id`
- `tenantId`
- `type`
- `title`
- `summary`
- `sourceCollection`
- `sourceId`
- `projectId`
- `customerId`
- `stageCode`
- `tags`
- `fileIDs`
- `visibleScope`
- `authorizationStatus`
- `ownerVisibleSnapshot`
- `recommendedForConcerns`
- `createdAt`
- `updatedAt`

### v2_case_assets

用途：工地转案例资产草案，不等于公开案例，不自动发布。

建议字段：

- `_id`
- `tenantId`
- `projectId`：关联 V1 `projects._id`
- `customerId`：关联 V1 `customers._id`
- `title`
- `community`
- `area`
- `layout`
- `style`
- `materialIds`
- `authorizationStatus`
- `privacyFlags`
- `contentDrafts`
- `publishTargets`
- `status`：`draft` / `ready` / `archived`
- `createdBy`
- `createdAt`
- `updatedAt`

### v2_ai_suggestions_mock

用途：保存 mock AI 建议结果，便于验收和复盘。真实 AI 接入前不保存模型请求和真实 API 输出。

建议字段：

- `_id`
- `tenantId`
- `customerId`
- `followId`
- `triggerStage`
- `customerConcern`
- `recommendedMessage`
- `recommendedMaterialIds`
- `nextAction`
- `tone`
- `confidenceLabel`
- `riskNotes`
- `generatedBy`：固定 `mock_rule`
- `createdAt`

## 7. V1 复用策略

1. 客户管道：只读 `customers.stage`、`dealStatus`、`lifecycleStatus`，在 V2 adapter 中映射成 `pipelineStage`。
2. 客户详情：只读 `customers` 基础字段，跟进记录使用 V2 独立 mock 或未来独立集合。
3. 信任素材：只读 `stage_logs`、`photos`、`design_drawings`、`case_authorizations`、`warranty_cards`，统一映射成 `trustMaterial`。
4. 签约转工地：只生成 `projectPayloadDraft`，人工确认后才可能进入真实创建流程。
5. 案例资产：只读 `projects`、`completionPhotoFileIDs`、`stage_logs`、`photos`、`case_authorizations`，生成草案，不自动公开。
6. 权限：参考现有角色常量，V2 初期不设计新权限系统。
7. AI：复用现有本地规则型思路，不复用真实 AI 云函数。

## 8. V1 禁改清单

以下文件和逻辑在 V2 Phase 1 / Phase 2 禁止修改：

- `miniprogram/app.js`
- `miniprogram/app.json`
- `miniprogram/pages/workbench/`
- `miniprogram/pages/customers/`
- `miniprogram/subpackages/internal/pages/customer-edit/`
- `miniprogram/subpackages/internal/pages/project-edit/`
- `miniprogram/subpackages/internal/pages/project-detail/`
- `miniprogram/subpackages/internal/pages/upload-log/`
- `miniprogram/subpackages/internal/pages/review-log/`
- `miniprogram/subpackages/owner/`
- `cloudfunctions/createCustomer/`
- `cloudfunctions/updateCustomer/`
- `cloudfunctions/createProject/`
- `cloudfunctions/submitStageLog/`
- `cloudfunctions/reviewStageLog/`
- `cloudfunctions/getOwnerProject/`
- `cloudfunctions/bindOwnerProject/`
- `cloudfunctions/deliverProject/`
- `cloudfunctions/listPublicCases/`
- `cloudfunctions/aiGenerateOwnerSummary/`
- 现有集合字段：`customers`、`projects`、`stage_logs`、`photos`
- 现有 `ownerVisible`、`reviewStatus`、`tenantId` 兼容逻辑

## 9. 风险点

1. V2 成交管道与 V1 客户阶段有语义重叠，不能直接替换旧字段。
2. 签约转工地涉及真实写入 `projects`，必须到后续阶段再进 Human Gate。
3. 信任素材库涉及业主隐私、公开授权和照片可见性，必须尊重 `ownerVisible` 和 `case_authorizations`。
4. 工地转案例资产涉及小区、户型、价格、业主隐私，默认只能生成内部草案。
5. AI 建议可能产生过度承诺，mock 规则也必须内置风险提示。
6. 当前工作区已有其他文档未提交修改，后续提交前需要区分变更归属。

## 10. Phase 2 建议

Phase 2 只做 V2 Mock 原型，建议边界：

1. 新增 `miniprogram/subpackages/deal-loop/` 分包。
2. 新增 6 个页面空壳和 mock 数据文件。
3. 只使用 mock 数据，不调用 V1 云函数。
4. 不写 `app.json` 注册入口前，先由人工确认是否允许暴露分包页面。
5. 不接真实 AI API。
6. 不创建数据库集合。
7. 验收重点：页面能展示闭环概念、mock 数据完整、删除分包可回滚。

Phase 2 Human Gate：

- 是否允许修改 `miniprogram/app.json` 注册 `deal-loop` 分包。
- 是否允许新增 mock 页面文件。
- 是否允许增加工作台入口或仅保留开发者直达入口。
