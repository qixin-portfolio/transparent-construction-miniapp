# V2 Deal Loop Phase 5B-0 Evidence Summary API Design

## 1. 当前阶段

Phase 5B-0：真实证据摘要只读接口方案设计。

本阶段只设计 V2 后续“真实证据摘要只读接口”的方案，不实现，不修改业务代码，不新增云函数目录，不接真实数据，不读取或展示真实照片，不部署，不上传体验版，不进入 Phase 5B-1。

## 2. 当前 HEAD / tag

当前安全检查点：

```text
898777632fb35b4a1dc803cd9a5b96e4fe9ad94d
```

对应 tag：

```text
v2-deal-loop-phase5a-real-evidence-audit
```

当前分支：

```text
codex/init-ai-collaboration
```

当前 V2 入口开关：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

当前 V2 `deal-loop` 真实云函数调用范围：

```text
listCustomers
getCustomer
```

## 3. 设计目标

设计一个后续可新增的 V2 独立只读云函数，用于给 V2 成交跟进提供“脱敏、聚合、无原始文件”的真实证据摘要。

它解决的问题：

1. V2 推荐素材需要知道客户背后是否有真实工地证据。
2. V2 信任素材需要区分“内部可信证据”和“可公开营销素材”。
3. V2 案例资产草案需要知道哪些素材有授权，哪些只能作为内部判断。
4. 第一版不能展示真实照片、不能返回文件 ID、不能绕过案例授权。

第一版目标：

```text
客户 -> 关联工地摘要 -> 已审核节点数量 -> 业主可见照片数量 -> 授权状态 -> 推荐用途/阻断原因
```

第一版不做：

```text
真实照片展示
真实案例生成
真实 AI 生成
写入 case_assets
自动发布
```

## 4. 是否新建独立云函数

建议新建 V2 独立只读云函数。

不建议直接复用现有函数：

1. `getProjectDetail` 是工地详情接口，会按角色返回工地日志，并可能附带照片 URL；语义是“查看工地详情”，不是“成交素材摘要”。
2. `getOwnerProject` 是业主端工地进度接口，绑定业主身份语义明确，不适合给内部成交跟进复用。
3. `listPublicCases` 是公开案例接口，已有游客/公开展示语义，会读取授权公开案例和图片，不适合第一版证据摘要。
4. `listDesignDrawings` 是图纸列表接口，会返回图纸记录和临时链接，不适合 V2 第一版。
5. `listAfterSalesTickets` 和 `getWarrantyCard` 有售后/质保业务语义，其中 `getWarrantyCard` 还会写查看埋点，不适合作为只读聚合来源。
6. 多个旧函数返回结构和权限模型不同，直接组合容易把“内部查看”“业主查看”“公开展示”混为一体。

新建独立只读函数更安全：

1. 返回结构可严格控制为摘要。
2. 可以统一做脱敏。
3. 可以明确禁止返回 `fileID / cloudPath / tempFileURL`。
4. 可以专门服务 V2，不影响 V1 主链路。
5. 后续可以逐步扩展字段，不改变旧接口语义。

## 5. 推荐接口名称

推荐云函数名：

```text
getV2EvidenceSummary
```

命名理由：

1. `V2` 明确隔离于 V1 正式链路。
2. `Evidence` 表示真实证据，不等于公开案例或照片。
3. `Summary` 表示只返回摘要，不返回明细和原始文件。

## 6. 接口定位

这个接口不是：

1. 案例生成接口。
2. 照片读取接口。
3. AI 生成接口。
4. 工地详情接口。
5. 公开案例接口。
6. 跟进记录写入接口。

这个接口是：

```text
给 V2 成交跟进提供只读、脱敏、聚合后的信任证据摘要。
```

核心使用场景：

1. `trust-materials` 判断当前客户是否有真实可信证据可参考。
2. V2 推荐素材展示“已有证据类型”，而不是直接展示证据原文或图片。
3. V2 案例资产草案判断“可公开素材是否足够”，并给出阻断原因。

## 7. 入参设计

建议最小入参：

```js
{
  customerId: string,
  projectId?: string
}
```

字段说明：

1. `customerId` 必填。V2 成交闭环从客户出发，接口必须以客户为主上下文。
2. `projectId` 可选。用于客户已签约或有多个工地时指定某个工地。
3. `tenantId` 不允许前端传入，必须通过 `OPENID -> users -> tenantId` 获取。
4. 不允许传手机号、openid、详细地址、完整 customer 对象。
5. 不允许传“是否可公开”等前端判断字段，授权和可见性必须后端查询。

多项目处理建议：

1. 如果传 `projectId`，必须校验该项目属于当前 `customerId` 和当前 `tenantId`。
2. 如果不传 `projectId`，查询该客户关联的同租户项目列表。
3. 多个项目时返回聚合摘要，并标记 `selectedProjectId` 为最近更新项目或已交付项目优先。
4. 如果存在多个候选项目，返回 `projectCandidates` 的脱敏列表，前端可后续让用户选择。

## 8. 权限与租户隔离

必须包含：

1. 登录态校验：通过 `cloud.getWXContext().OPENID` 查询 `users`。
2. 用户状态校验：只允许 `status = active` 的内部用户。
3. 租户隔离：后端从用户记录拿 `tenantId`，所有查询都带 `tenantId`。
4. 不信任前端 `tenantId`。
5. 业主禁止调用。
6. 普通工长禁止调用。
7. 平台管理员默认不跨租户读取经营数据。

建议允许角色：

```text
admin
boss_qi
boss_hu
sales
designer
project_manager
```

建议禁止角色：

```text
owner
worker
```

角色边界：

1. `admin / boss_qi / boss_hu`：可查看当前租户内客户关联证据摘要。
2. `sales / designer / project_manager`：后续需要加“是否分配给自己”或“是否有客户/项目访问权”的限制。
3. Phase 5B-1 如果无法确认客户分配关系，建议第一版只开放 `admin / boss_qi / boss_hu`。

错误码建议：

```text
UNAUTHENTICATED
FORBIDDEN
TENANT_MISMATCH
CUSTOMER_NOT_FOUND
PROJECT_NOT_FOUND
```

无权限返回：

```js
{
  ok: false,
  error: {
    code: 'FORBIDDEN',
    message: '当前账号无权查看该客户证据摘要'
  }
}
```

## 9. 数据源设计

后续接口可读取的数据源及用途：

### customers

用途：

1. 校验 `customerId` 存在。
2. 校验客户属于当前 `tenantId`。
3. 读取脱敏客户阶段、预算段、风格、需求摘要，用于推荐上下文。

不返回：

1. 完整手机号。
2. openid。
3. 身份证。
4. 详细地址。
5. 内部敏感备注。

### projects

用途：

1. 找客户关联工地。
2. 统计工地数量、施工中数量、已完工/已交付数量。
3. 提供最新工地阶段、风格、面积、户型等脱敏摘要。

### stage_logs

用途：

1. 统计已审核业主可见节点数量。
2. 输出阶段覆盖情况。
3. 输出最近更新时间。
4. 判断是否有可用过程证据。

### photos

用途：

1. 统计业主可见照片数量。
2. 统计有照片覆盖的施工节点。
3. 判断是否有照片类授权候选。

第一版不返回任何图片地址。

### design_drawings

用途：

1. 统计效果图数量。
2. 判断是否存在 `type = render` 且 `ownerVisible = true` 的授权候选。

第一版不返回图纸文件、图纸 URL 或施工图。

### case_authorizations

用途：

1. 判断是否有 `approved` 授权。
2. 判断授权范围：`internal / public / private`。
3. 判断 `allowedMaterials`。
4. 判断是否可用于公开营销。
5. 返回阻断原因。

### warranty_cards

用途：

1. 判断是否有质保卡。
2. 统计质保卡数量。
3. 输出“可证明售后保障机制”的摘要。

### after_sales_tickets

用途：

1. 统计售后工单数量。
2. 统计已关闭/已完成数量。
3. 统计处理中数量。
4. 可选计算安全的响应摘要。

第一版不返回投诉原文、图片、联系方式、处理记录详情。

## 10. 过滤条件设计

### projects

必须满足：

```text
tenantId 同当前登录用户租户，兼容旧数据空值
deleted != true
customerId = 入参 customerId
```

只返回摘要：

1. `projectCount`
2. `activeProjectCount`
3. `completedProjectCount`
4. `latestProjectStage`
5. `latestProjectStatus`
6. `selectedProjectId`
7. `projectCandidates` 的脱敏列表

不返回：

1. ownerOpenid。
2. 详细地址。
3. project_members。
4. 绑定码。

### stage_logs

必须满足：

```text
tenantId 同当前登录用户租户，兼容旧数据空值
projectId in 关联项目
reviewStatus = approved
ownerVisible = true
```

第一版只返回：

1. 节点标题。
2. 阶段名称。
3. 数量。
4. 最近更新时间。
5. 阶段覆盖情况。

不返回：

1. 日报正文。
2. `workContent`。
3. `issue`。
4. `needConfirm`。
5. 内部审核意见。
6. 工长/员工姓名。
7. 原始提交人信息。
8. openid。

### photos

必须满足：

```text
tenantId 同当前登录用户租户，兼容旧数据空值
projectId in 关联项目
stageLogId 属于已审核 ownerVisible 日报
ownerVisible = true
```

第一版只返回：

1. 照片数量。
2. 覆盖节点。
3. 是否有可授权素材候选。

不返回：

1. `fileID`。
2. `cloudPath`。
3. `tempFileURL`。
4. 原图。
5. 缩略图。
6. 上传人。
7. 定位。
8. 备注。

### design_drawings

第一版只返回：

1. 效果图数量。
2. 是否有 `type = render`。
3. 是否存在授权候选。

过滤条件：

```text
tenantId 同当前登录用户租户，兼容旧数据空值
projectId in 关联项目
type = render
ownerVisible = true
```

不返回：

1. 施工图。
2. 图纸原图。
3. 施工图下载链接。
4. 详细设计文件。
5. `fileID`。
6. `tempFileURL`。

### case_authorizations

第一版只返回：

1. 是否有 `approved` 授权。
2. 授权范围摘要。
3. 可用于哪些平台。
4. 是否 revoked/private。
5. 阻断原因。

过滤条件：

```text
tenantId 同当前登录用户租户，兼容旧数据空值
projectId in 关联项目
取 updatedAt 最新授权
```

不返回：

1. 授权原始文件。
2. 业主 openid。
3. 业主姓名明细。
4. 联系方式。

### warranty_cards / after_sales_tickets

第一版只返回统计：

1. 是否有质保卡。
2. 质保卡数量。
3. 售后工单数量。
4. 已关闭数量。
5. 处理中数量。
6. 平均响应摘要，如可安全计算。

不返回：

1. 投诉原文。
2. 联系方式。
3. 图片。
4. 处理记录详情。
5. 工单编号。
6. 质保卡编号。

## 11. 返回结构设计

建议第一版返回：

```js
{
  ok: true,
  source: 'real-evidence-summary',
  customerId: 'customer_xxx',
  selectedProjectId: 'project_xxx',
  projectSummary: {
    projectCount: 1,
    activeProjectCount: 1,
    completedProjectCount: 0,
    latestProjectStage: '水电施工',
    latestProjectStatus: '施工中',
    projectCandidates: [
      {
        projectId: 'project_xxx',
        status: '施工中',
        currentStage: '水电施工',
        style: '现代简约',
        areaRange: '100-120㎡'
      }
    ]
  },
  trustEvidenceSummary: {
    approvedStageLogCount: 8,
    ownerVisiblePhotoCount: 36,
    renderDrawingCount: 3,
    warrantyCardCount: 0,
    afterSalesTicketCount: 0,
    afterSalesClosedCount: 0,
    stageCoverage: [
      { stage: '开工交底', count: 1, hasPhotos: true },
      { stage: '水电验收', count: 1, hasPhotos: true }
    ],
    availableProofTypes: [
      'approved_stage_logs',
      'owner_visible_photo_count',
      'render_drawing_count'
    ]
  },
  authorizationSummary: {
    hasAuthorization: false,
    hasPublicAuthorization: false,
    authorizationScope: 'none',
    authorizationStatus: 'none',
    allowedMaterials: [],
    allowedPlatforms: [],
    canUseForPublicMarketing: false
  },
  recommendedUse: {
    internalTrustMaterials: [
      {
        type: 'stage_log_summary',
        title: '可用于内部成交跟进的施工节点摘要',
        reason: '已有已审核业主可见节点'
      }
    ],
    publicCaseAssets: [],
    blockedReasons: [
      '暂无公开案例授权',
      '第一版不返回真实照片'
    ]
  },
  privacyGuard: {
    noRawPhotos: true,
    noFileIds: true,
    noTempFileURLs: true,
    noPersonalInfo: true,
    noConstructionDrawings: true,
    noStageLogBody: true,
    noAfterSalesDetail: true
  }
}
```

补充字段建议：

1. `evidenceLevel`：`none / summary_only / internal_ready / public_ready`。
2. `dataSourceLabel`：前端可展示 `真实证据摘要`。
3. `generatedAt`：仅用于调试，不展示给客户。

## 12. 错误态设计

### 未登录

```js
{ ok: false, error: { code: 'UNAUTHENTICATED', message: '请先登录' } }
```

前端展示：

```text
请先登录后查看证据摘要
```

### 无权限

```js
{ ok: false, error: { code: 'FORBIDDEN', message: '当前账号无权查看该客户证据摘要' } }
```

前端展示：

```text
当前账号无权查看真实证据摘要，已使用 mock 素材
```

### 客户不存在

```js
{ ok: false, error: { code: 'CUSTOMER_NOT_FOUND', message: '客户不存在或已删除' } }
```

前端展示：

```text
客户读取失败，请返回客户列表重新打开
```

### 客户不属于当前租户

```js
{ ok: false, error: { code: 'TENANT_MISMATCH', message: '客户不属于当前门店' } }
```

前端展示：

```text
客户上下文异常，请返回重新打开
```

### 无关联工地

```js
{
  ok: true,
  source: 'real-evidence-summary',
  evidenceLevel: 'none',
  projectSummary: { projectCount: 0 },
  recommendedUse: {
    internalTrustMaterials: [],
    publicCaseAssets: [],
    blockedReasons: ['该客户暂无关联工地']
  }
}
```

前端展示：

```text
暂无真实工地证据，已使用 mock 素材
```

### 暂无可用证据

含义：有工地，但没有 approved + ownerVisible 的证据。

前端展示：

```text
暂无可用真实证据，已使用 mock 素材
```

### 存在证据但未授权公开

含义：有内部可信摘要，但不能用于公开营销。

前端展示：

```text
可用于内部信任跟进，暂不可作为公开案例
```

### 数据读取失败

```js
{ ok: false, error: { code: 'READ_FAILED', message: '证据摘要读取失败' } }
```

前端展示：

```text
真实证据摘要读取失败，已回退 mock
```

## 13. 前端接入设计

只设计，不实现。

### Phase 5B-1

只新增并测试云函数：

```text
cloudfunctions/getV2EvidenceSummary
```

不改前端。

### Phase 5B-2

再接入：

```text
miniprogram/subpackages/deal-loop/pages/trust-materials/
```

接入策略：

1. 页面仍先接收 `customerId`。
2. 先调用 `getCustomer` 保持客户上下文一致。
3. 再调用 `getV2EvidenceSummary` 获取摘要。
4. 有摘要时标记数据源为 `真实证据摘要 + Mock 素材推荐`。
5. 无摘要时保留 `Mock fallback`。
6. 读取失败时显示 `真实证据摘要读取失败，已回退 mock`。
7. 不展示照片、不展示图纸、不展示日报正文。

数据源状态建议：

```text
真实证据摘要
Mock fallback
暂无真实证据
真实证据摘要读取失败
```

避免误导：

1. 页面文案必须写“证据摘要”，不能写“真实案例”。
2. 公开案例资产只有 `hasPublicAuthorization = true` 时才可提示。
3. 第一版推荐素材仍然是 mock 素材，只是推荐原因可参考真实摘要。

是否需要新增入口：

```text
不需要。
```

是否需要修改工作台：

```text
不需要。
```

## 14. Phase 5B-1 最小实现建议

建议 Phase 5B-1 只新增云函数：

```text
cloudfunctions/getV2EvidenceSummary
```

暂不改前端。

建议 Phase 5B-1 验收方式：

1. 使用云函数本地测试或开发者工具云函数调用测试。
2. 输入 `customerId`。
3. 确认只返回摘要。
4. 确认不返回 `fileID / cloudPath / tempFileURL`。
5. 确认不返回日报正文、施工图、售后明细。
6. 确认跨租户客户返回无权限或上下文异常。

拆分评估：

这个拆分合理。

原因：

1. 先把数据安全边界封在云函数，避免前端直接碰真实证据集合。
2. 前端暂不接入，可以单独验证返回结构。
3. Phase 5B-2 再接 `trust-materials`，风险更小。
4. 如果接口字段不合适，调整云函数不影响 V2 页面。

## 15. 禁止事项

Phase 5B-1 仍禁止：

1. 不返回真实照片。
2. 不返回 `fileID`。
3. 不返回 `cloudPath`。
4. 不返回 `tempFileURL`。
5. 不展示施工图。
6. 不展示日报正文。
7. 不展示业主评价原文。
8. 不写数据库。
9. 不生成公开案例。
10. 不自动发布。
11. 不接真实 AI。
12. 不修改 `createProject`。
13. 不改 V1 工地逻辑。
14. 不改 V1 业主端逻辑。
15. 不修改工作台入口。
16. 不部署。
17. 不上传体验版。

## 16. 风险点

1. 复用旧接口容易返回过多真实数据，尤其是照片临时链接。
2. `ownerVisible = true` 只表示业主可见，不等于可公开营销。
3. 客户和工地关联可能存在旧数据缺口，需要明确无关联工地错误态。
4. 多项目客户需要避免把不相关项目证据算到当前客户。
5. 售后统计如果表达不当，可能被理解成负面证据。
6. 未来接真实 AI 时，不能把摘要外的原始字段放进 prompt。
7. `sales / designer / project_manager` 权限如果没有分配关系约束，可能看到过多客户证据摘要。
8. 公开平台权限需要后续细化，不能只用一个 `public` 覆盖小红书/抖音/官网/GEO。

## 17. 下一步建议

Phase 5B-0 完成后停止，不进入 Phase 5B-1。

进入 Phase 5B-1 前建议人工确认：

1. 云函数名是否确定为 `getV2EvidenceSummary`。
2. 第一版是否只开放 `admin / boss_qi / boss_hu`。
3. 第一版是否只返回摘要，不返回任何图片地址。
4. 是否接受 Phase 5B-1 只新增云函数、不改前端。
5. Phase 5B-2 是否再接 `trust-materials` 页面。
