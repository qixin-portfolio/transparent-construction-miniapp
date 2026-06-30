# 透明工地 V2：成交闭环版 Phase 3A 只读接入方案审计

## 1. 当前阶段

Phase 3A：V1 只读接入方案审计。

安全检查点：

- tag：`v2-deal-loop-phase2-5-polish`
- commit：`602257058a30954272c2147d33177af9d962f437`

本阶段只做审计与设计，不实现真实接入，不修改小程序业务代码，不修改云函数，不调用真实数据库，不部署，不上传体验版。

## 2. 审计目标

Phase 3B 可能开始让 V2 读取 V1 的真实 `customers / projects / stage_logs / photos` 等数据。本阶段先回答：

- 哪些 V1 集合可以只读复用。
- 哪些现有云函数是只读候选。
- 哪些函数虽然名字是 get/list，但存在写入或权限限制，不能直接复用。
- V2 6 个页面如何从 mock fallback 平滑切到只读真实数据。
- Phase 3B 真正实现前需要哪些 Human Gate。

## 3. V1 可复用集合

### 3.1 `customers`

推测字段：

- `_id`
- `tenantId`
- `tenantName`
- `name`
- `phone`
- `source`
- `address`
- `need`
- `stage`
- `dealStatus`
- `lifecycleStatus`
- `ownerOpenid`
- `createdByOpenid`
- `createdBy`
- `updatedByOpenid`
- `updatedBy`
- `deleted`
- `createdAt`
- `updatedAt`

与 V2 的关联方式：

- V2 `customerId` 对应 V1 `customers._id`。
- `projects.customerId` 可反查已签约客户对应工地。
- `stage / dealStatus / lifecycleStatus` 可映射 V2 成交阶段。

可用于 V2 页面：

- `pipeline`
- `customer-detail`
- `ai-assistant`
- `contract-to-project`

权限与过滤：

- 涉及隐私：是，包含姓名、电话、地址、需求。
- 需要过滤 `tenantId`：是。
- 需要过滤 `ownerVisible`：否，客户库不是业主可见素材集合。
- 需要过滤审核状态：否。
- 需要过滤 `deleted !== true`：是。

### 3.2 `projects`

推测字段：

- `_id`
- `tenantId`
- `tenantName`
- `name`
- `customerId`
- `customerName`
- `address`
- `ownerOpenid`
- `ownerOpenids`
- `ownerUserId`
- `ownerUserIds`
- `currentStage`
- `progress`
- `status`
- `statusCode`
- `community`
- `communityName`
- `area`
- `layout`
- `style`
- `decorateType`
- `startDate`
- `completedAt`
- `deliveredAt`
- `completionPhotoFileIDs`
- `designerName`
- `managerName`
- `foremanName`
- `createdAt`
- `updatedAt`

与 V2 的关联方式：

- `projects.customerId` 关联 `customers._id`。
- `projectId` 关联 `stage_logs / photos / design_drawings / warranty_cards / case_authorizations`。
- 已交付项目可沉淀为 V2 案例资产。

可用于 V2 页面：

- `contract-to-project`
- `case-assets`
- `trust-materials`
- `customer-detail`

权限与过滤：

- 涉及隐私：是，包含地址、业主绑定、团队信息。
- 需要过滤 `tenantId`：是。
- 需要过滤 `ownerVisible`：集合本身无统一 `ownerVisible`，但其关联素材需要过滤。
- 需要过滤审核状态：项目本身无审核状态，关联日志/照片需要过滤。
- 需要过滤 `status/statusCode`：case-assets 应优先读取 `completed / delivered`。

### 3.3 `stage_logs`

推测字段：

- `_id`
- `projectId`
- `tenantId`
- `tenantName`
- `projectName`
- `stage`
- `stageCode`
- `progress`
- `workContent`
- `issue`
- `needConfirm`
- `tomorrowPlan`
- `photoFileIDs`
- `voiceFileID`
- `voiceDuration`
- `voiceTranscript`
- `ownerSummary`
- `reviewFocus`
- `aiDraft`
- `aiGenerated`
- `sourceType`
- `reviewStatus`
- `ownerVisible`
- `submittedByOpenid`
- `submittedBy`
- `submittedByName`
- `reviewRecords`
- `rejectReason`
- `createdAt`
- `updatedAt`
- `reviewedAt`

与 V2 的关联方式：

- `projectId` 关联工地。
- `photoFileIDs` 和 `photos.stageLogId` 关联照片。
- `stage/stageCode/workContent/ownerSummary` 可转为信任素材。

可用于 V2 页面：

- `trust-materials`
- `case-assets`
- `customer-detail` 的“关联工地证据”

权限与过滤：

- 涉及隐私：是，可能包含现场问题、业主确认事项、内部审核信息。
- 需要过滤 `tenantId`：是。
- 需要过滤 `ownerVisible`：面向业主或客户展示时必须过滤；内部销售跟进是否可见需 Human Gate。
- 需要过滤审核状态：是，面向客户/案例建议只使用 `reviewStatus === 'approved'`。

### 3.4 `photos`

推测字段：

- `_id`
- `projectId`
- `tenantId`
- `tenantName`
- `stageLogId`
- `fileID`
- `fileId`
- `cloudFileId`
- `stage`
- `ownerVisible`
- `createdByOpenid`
- `createdBy`
- `createdAt`
- `updatedAt`

与 V2 的关联方式：

- `photos.stageLogId` 关联 `stage_logs._id`。
- `photos.projectId` 关联 `projects._id`。
- 需要通过 `cloud.getTempFileURL` 转换临时 URL。

可用于 V2 页面：

- `trust-materials`
- `case-assets`

权限与过滤：

- 涉及隐私：是，现场照片可能包含住户信息、门牌、人物。
- 需要过滤 `tenantId`：是。
- 需要过滤 `ownerVisible`：是。
- 需要过滤审核状态：照片自身无 `reviewStatus`，应通过关联 `stage_logs.reviewStatus === 'approved'` 过滤。

### 3.5 `design_drawings`

推测字段：

- `_id`
- `projectId`
- `tenantId`
- `tenantName`
- `type`
- `space`
- `title`
- `fileID`
- `remark`
- `ownerVisible`
- `ownerConfirmed`
- `confirmedAt`
- `confirmedByOpenid`
- `readBy`
- `uploadedBy`
- `createdAt`
- `updatedAt`

与 V2 的关联方式：

- `projectId` 关联工地。
- `type === 'render'` 的效果图可作为信任素材。
- `type === 'construction'` 的施工图默认更敏感，不建议给成交线索直接展示。

可用于 V2 页面：

- `trust-materials`
- `case-assets`

权限与过滤：

- 涉及隐私：是，设计图纸可能涉及户型、施工细节。
- 需要过滤 `tenantId`：是。
- 需要过滤 `ownerVisible`：是。
- 需要过滤审核状态：无统一审核状态；需按 `type` 和 `ownerVisible` 过滤。

### 3.6 `case_authorizations`

推测字段：

- `_id`
- `tenantId`
- `tenantName`
- `projectId`
- `projectName`
- `ownerId`
- `ownerOpenid`
- `authorizationScope`
- `allowedMaterials`
- `ownerNameDisplay`
- `status`
- `authorizedAt`
- `revokedAt`
- `createdAt`
- `updatedAt`

与 V2 的关联方式：

- `projectId` 关联完工工地。
- `authorizationScope` 决定案例素材可见范围。
- `allowedMaterials` 决定可用素材类型。

可用于 V2 页面：

- `case-assets`
- `trust-materials`

权限与过滤：

- 涉及隐私：是，决定案例公开边界。
- 需要过滤 `tenantId`：是。
- 需要过滤 `ownerVisible`：不直接使用该字段，但需按 `authorizationScope / allowedMaterials / status` 过滤。
- 需要过滤审核状态：是，应只使用 `status === 'approved'` 或明确允许内部使用的授权。

### 3.7 `warranty_cards`

推测字段：

- `_id`
- `tenantId`
- `tenantName`
- `projectId`
- `customerId`
- `ownerUserId`
- `ownerId`
- `ownerOpenid`
- `ownerName`
- `projectName`
- `projectAddress`
- `deliveredAt`
- `warrantyStartAt`
- `warrantyEndAt`
- `warrantyScope`
- `servicePhone`
- `warrantyTerms`
- `status`
- `warrantyNo`
- `startDate`
- `endDate`
- `contactName`
- `contactPhone`
- `items`
- `createdBy`
- `createdByOpenid`
- `createdAt`
- `updatedAt`

与 V2 的关联方式：

- `projectId` 关联工地。
- 可作为签约前“售后/质保”信任素材。

可用于 V2 页面：

- `trust-materials`
- `case-assets`

权限与过滤：

- 涉及隐私：是，包含业主、地址、质保编号和联系方式。
- 需要过滤 `tenantId`：是。
- 需要过滤 `ownerVisible`：集合无该字段，应按 owner/project 权限和 `status` 控制。
- 需要过滤审核状态：无审核状态；应过滤 `status === 'active'`。

## 4. 现有只读云函数清单

### 4.1 `listCustomers`

- 是否只读：是。
- 输入参数：无。
- 输出字段：`{ items }`，items 为客户记录。
- 当前 V1 使用页面：`miniprogram/pages/customers/customers.js`。
- V2 是否可以复用：可以，适合 `pipeline` 第一阶段只读接入。
- 风险等级：中。客户数据含电话、地址；需沿用角色权限和 `tenantId/deleted` 过滤。

### 4.2 `getCustomer`

- 是否只读：是。
- 输入参数：`customerId` 或 `id`。
- 输出字段：`{ customer }`。
- 当前 V1 使用页面：`miniprogram/subpackages/internal/pages/customer-edit/customer-edit.js`。
- V2 是否可以复用：可以，适合 `customer-detail / ai-assistant / contract-to-project`。
- 风险等级：中。非管理员只能看自己创建/负责的客户。

### 4.3 `listMyProjects`

- 是否只读：是。
- 输入参数：无。
- 输出字段：`{ items }`，items 为项目/工地记录。
- 当前 V1 使用页面：`miniprogram/pages/projects/projects.js`、`miniprogram/pages/workbench/workbench.js`。
- V2 是否可以复用：可以，但需要客户端按 `customerId/statusCode` 二次过滤。
- 风险等级：中。角色不同返回范围不同，销售/设计可见全部租户项目。

### 4.4 `getProjectDetail`

- 是否只读：是。会调用 `cloud.getTempFileURL` 获取临时链接，但不写数据库。
- 输入参数：`projectId`。
- 输出字段：`{ project, logs }`，logs 会附带 `photos`。
- 当前 V1 使用页面：`internal/pages/project-detail`、`internal/pages/upload-log`、`internal/pages/deliver-form`、`workbench`。
- V2 是否可以复用：可以，适合 `trust-materials / case-assets / customer-detail` 的只读工地证据。
- 风险等级：中高。内部角色可看到未 ownerVisible 的日报；V2 面向销售时必须明确是否允许读取未公开内容。

### 4.5 `listPendingStageLogs`

- 是否只读：是。
- 输入参数：无。
- 输出字段：`{ items }`，待审核日报，附照片临时 URL。
- 当前 V1 使用页面：`workbench`、`internal/pages/review-log`。
- V2 是否可以复用：不建议用于成交信任素材，除非只做老板内部提醒。
- 风险等级：高。只返回待审核日报，内容未审核，不适合给客户或案例资产。

### 4.6 `listDesignDrawings`

- 是否只读：是。会调用 `cloud.getTempFileURL`，不写数据库。
- 输入参数：`projectId`。
- 输出字段：`{ drawings }`，包含 `tempFileURL/readByMe`。
- 当前 V1 使用页面：`internal/pages/design-drawings`、`owner/pages/archive-drawings`、`owner/pages/owner`。
- V2 是否可以复用：可以，适合 `trust-materials / case-assets`。
- 风险等级：中。施工图敏感，V2 初期建议只使用 `type === 'render' && ownerVisible === true`。

### 4.7 `listPublicCases`

- 是否只读：是。
- 输入参数：`action=list|detail`、`caseId`。
- 输出字段：`{ cases, source, realCount }` 或 `{ case }`。
- 当前 V1 使用页面：`pages/projects`、`owner/pages/case-list`、`owner/pages/case-detail`。
- V2 是否可以复用：可以，适合 `trust-materials / case-assets` 的公开案例素材。
- 风险等级：低到中。已经按公开授权聚合，但要注意只拿公开案例，不反推未授权项目。

### 4.8 `getCaseAuthorization`

- 是否只读：是。
- 输入参数：`projectId`。
- 输出字段：`{ authorization }`。
- 当前 V1 使用页面：`owner/pages/case-authorization`。
- V2 是否可以复用：不建议直接复用给销售侧。它按当前 `ownerOpenid` 查自己的授权，不适合内部销售查看任意项目授权。
- 风险等级：中。权限模型是业主视角。

### 4.9 `getOwnerArchive`

- 是否只读：是。
- 输入参数：`projectId`。
- 输出字段：`{ project, archive, warrantyCard, sections, milestones, completionPhotos, team }` 等。
- 当前 V1 使用页面：`owner/pages/owner-archive`、`owner/pages/completion-album`。
- V2 是否可以复用：不建议直接复用给销售侧。它要求当前用户是业主。
- 风险等级：中高。业主视角权限，不适合内部成交管道直接调用。

### 4.10 `getCompletionAlbum`

- 是否只读：是。
- 输入参数：`projectId`。
- 输出字段：`{ project, album, authorization }`。
- 当前 V1 使用页面：`owner/pages/completion-album`。
- V2 是否可以复用：不建议直接复用给销售侧。可以参考其聚合方式。
- 风险等级：中高。业主视角权限。

### 4.11 `getCompletedOwnerHome`

- 是否只读：是。
- 输入参数：`projectId` 可选。
- 输出字段：`{ project, archive, warrantyCard, authorization, benefits, latestTickets, ticketStats }`。
- 当前 V1 使用页面：`owner/pages/completed-home`。
- V2 是否可以复用：不建议直接复用给销售侧。可参考档案完整度计算。
- 风险等级：中高。业主视角，并聚合售后信息。

### 4.12 `getWarrantyCard`

- 是否只读：否。虽然读取 `warranty_cards`，但会写入 `operation_logs` 的 `warranty_card_viewed` 记录。
- 输入参数：`projectId`。
- 输出字段：`{ project, warrantyCard }`。
- 当前 V1 使用页面：`owner/pages/warranty-card`。
- V2 是否可以复用：不建议在 Phase 3B 作为只读函数复用。
- 风险等级：高。名字像 get，但实际有写操作；违反 V2 只读接入要求。

### 4.13 `getBossDashboard`

- 是否只读：是。
- 输入参数：无。
- 输出字段：`dashboard.metrics / alerts / issueLogs / staffRank / recentActivities`。
- 当前 V1 使用页面：`workbench`。
- V2 是否可以复用：可参考统计逻辑，但不适合作为 V2 pipeline 主数据源，因为不返回完整成交动作字段。
- 风险等级：中。仅 boss 角色可用，输出为聚合视图。

## 5. V2 页面接入策略

### 5.1 `pipeline`

- 第一阶段仍保留 mock fallback：是。云函数失败或未授权时继续显示本地 mock。
- 可只读接入的数据源：`listCustomers`，可选参考 `getBossDashboard` 的统计口径。
- 禁止写入的数据源：`customers / projects / stage_logs / photos`。
- 需要的适配器函数：`mapCustomerToPipelineCard(customer)`、`mapCustomerToDealAction(customer, followups)`。
- 风险点：客户电话和地址敏感；`listCustomers` 返回范围受角色影响；V2 不能扩大 V1 权限。
- 验收标准：客户卡片来自真实 `customers` 时仍只展示允许字段；无写入调用；mock fallback 可用。

### 5.2 `customer-detail`

- 第一阶段仍保留 mock fallback：是。
- 可只读接入的数据源：`getCustomer`；可选 `listMyProjects` 后按 `customerId` 找关联工地。
- 禁止写入的数据源：`customers / projects`。
- 需要的适配器函数：`mapCustomerToPipelineCard(customer)`、`mapCustomerToDealAction(customer, followups)`。
- 风险点：客户手机号、地址、需求属于隐私；V1 暂无独立 followups 集合，不能伪造真实跟进记录。
- 验收标准：只读展示客户详情；无 `updateCustomer/createProject`；无真实 AI API。

### 5.3 `ai-assistant`

- 第一阶段仍保留 mock fallback：是。
- 可只读接入的数据源：`getCustomer`；可选读取本地 mock suggestions。
- 禁止写入的数据源：全部 V1 集合。
- 需要的适配器函数：`mapCustomerToDealAction(customer, followups)`。
- 风险点：真实客户信息进入 AI 提示词前必须脱敏；Phase 3B 仍不允许接真实 AI API，除非 Human Gate 另行确认。
- 验收标准：AI 仍为本地 mock；页面可基于真实客户字段生成本地建议；无网络 AI 调用。

### 5.4 `trust-materials`

- 第一阶段仍保留 mock fallback：是。
- 可只读接入的数据源：`getProjectDetail`、`listDesignDrawings`、`listPublicCases`。
- 禁止写入的数据源：`stage_logs / photos / design_drawings / case_authorizations / warranty_cards`。
- 需要的适配器函数：`mapStageLogsToTrustMaterials(stageLogs)`、`mapPhotosToTrustMaterials(photos)`。
- 风险点：日报和照片必须按 `reviewStatus / ownerVisible / tenantId` 过滤；设计图纸施工图默认敏感；质保卡不能用 `getWarrantyCard` 直接读。
- 验收标准：素材只读展示；mock 发送仍只弹提示；不调用分享、上传或写库接口。

### 5.5 `contract-to-project`

- 第一阶段仍保留 mock fallback：是。
- 可只读接入的数据源：`getCustomer`；可选 `listMyProjects` 判断是否已有项目关联。
- 禁止写入的数据源：`projects / project_members / customers`。
- 需要的适配器函数：`mapProjectToContractDraft(project, customer)`；如客户尚未建项目，则从 `customer` 生成草案。
- 风险点：页面不能触发 `createProject`；不能更新客户生命周期；不能写 `project_members`。
- 验收标准：只生成草案；创建按钮保持 disabled 或 mock 提示；无 `createProject` 调用。

### 5.6 `case-assets`

- 第一阶段仍保留 mock fallback：是。
- 可只读接入的数据源：`listPublicCases`；可参考 `getProjectDetail/listDesignDrawings` 读取已交付项目素材，但需授权过滤。
- 禁止写入的数据源：`case_authorizations / projects / stage_logs / photos / owner_archives`。
- 需要的适配器函数：`mapProjectToCaseAsset(project, logs, photos, authorization)`。
- 风险点：未授权案例不能公开；照片和户型信息必须受 `authorizationScope/allowedMaterials` 控制；不能自动发布。
- 验收标准：只展示案例草案；不修改授权；不写 `case_authorizations`；不调用发布接口。

## 6. 适配层设计

建议未来新增文件，但 Phase 3A 不创建：

`miniprogram/subpackages/deal-loop/utils/v1ReadonlyAdapters.js`

建议函数：

```js
function mapCustomerToPipelineCard(customer) {}
function mapCustomerToDealAction(customer, followups) {}
function mapProjectToContractDraft(project, customer) {}
function mapStageLogsToTrustMaterials(stageLogs) {}
function mapPhotosToTrustMaterials(photos) {}
function mapProjectToCaseAsset(project, logs, photos, authorization) {}
```

设计原则：

- 只做字段映射，不做云函数调用。
- 输入必须是已由云函数按权限过滤后的数据。
- 输出字段兼容 Phase 2.5 当前 mock 页面结构。
- 对缺失字段提供本地兜底文案，但不得伪造“真实跟进记录”。
- 敏感字段默认脱敏，例如手机号、精确门牌、ownerOpenid。

## 7. 权限与隐私风险

主要风险：

- `customers.phone/address/need` 是隐私字段，V2 不能扩大可见角色。
- `stage_logs.issue/needConfirm/reviewFocus/aiDraft` 可能是内部管理信息，不应直接变成客户可发素材。
- `photos` 可能包含门牌、人物、未授权现场信息。
- `design_drawings` 中施工图比效果图更敏感。
- `case_authorizations` 必须决定案例可公开/内部/私有的边界。
- `getWarrantyCard` 会写 `operation_logs`，不符合只读阶段要求。
- `getOwnerArchive/getCompletionAlbum/getCompletedOwnerHome` 是业主视角权限，不适合销售侧直接复用。

建议默认过滤：

- 所有集合都必须按 `tenantId` 过滤。
- 面向客户发送/公开案例素材默认只使用 `reviewStatus === 'approved'`。
- 面向客户发送/公开案例素材默认只使用 `ownerVisible === true`。
- 案例资产默认要求 `case_authorizations.status === 'approved'` 且 `authorizationScope` 允许。
- 质保素材 Phase 3B 不直接调用 `getWarrantyCard`，除非新增纯只读函数或改造前经 Human Gate。

## 8. 禁止写入清单

Phase 3A 和 Phase 3B 只读接入前禁止写入：

- `customers`
- `projects`
- `project_members`
- `stage_logs`
- `photos`
- `design_drawings`
- `case_authorizations`
- `warranty_cards`
- `owner_archives`
- `operation_logs`

禁止调用写入型云函数：

- `createCustomer`
- `updateCustomer`
- `deleteCustomer`
- `createProject`
- `deleteProject`
- `submitStageLog`
- `reviewStageLog`
- `uploadDesignDrawing`
- `updateDesignDrawing`
- `deleteDesignDrawing`
- `updateCaseAuthorization`
- `deliverProject`
- `submitOwnerSupplement`
- `getWarrantyCard`，原因：会写 `operation_logs`

## 9. Phase 3B Human Gate

Phase 3B 真正实现前必须人工确认：

- 是否允许复用现有只读云函数。
- 是否允许新增 V2 只读云函数。
- 是否允许 V2 页面调用 `wx.cloud.callFunction`。
- 是否允许读取真实 `customers`。
- 是否允许读取真实 `projects`。
- 是否允许读取真实 `stage_logs`。
- 是否允许读取真实 `photos`。
- 是否允许读取 `design_drawings`。
- 是否允许读取 `case_authorizations`。
- 是否允许读取或改造 `warranty_cards` 只读查询。
- 是否允许保留 mock fallback。
- 是否继续不增加工作台入口。
- 是否限制 V2 只对 `admin/boss_qi/boss_hu/sales/designer` 可见。

## 10. 下一步建议

建议 Phase 3B 不直接全量接入所有页面，而是拆成更小阶段：

1. Phase 3B-1：只接入 `pipeline`，复用 `listCustomers`，保留 mock fallback。
2. Phase 3B-2：只接入 `customer-detail`，复用 `getCustomer`。
3. Phase 3B-3：只读接入 `trust-materials`，先只接公开案例 `listPublicCases`，再评估 `getProjectDetail/listDesignDrawings`。
4. Phase 3B-4：设计纯只读质保/授权聚合函数，避免误用会写埋点的 `getWarrantyCard`。

每个子阶段都应单独验收：

- 变更范围。
- 云函数调用清单。
- 权限过滤。
- mock fallback。
- 无写入关键字。
- 不部署、不上传体验版，除非另行 Human Gate。
