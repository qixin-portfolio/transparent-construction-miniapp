# V2 Deal Loop Phase 5B-1 API Contract Lock

## 1. 当前阶段

Phase 5B-1：`getV2EvidenceSummary` API 契约冻结设计。

本阶段只冻结 API Contract，不实现云函数，不修改业务代码，不接前端，不读取真实数据，不部署，不上传体验版，不进入 Phase 5B-2。

## 2. 当前 HEAD / tag

当前安全检查点：

```text
07b11c0763dcc43841ae6c72d684329215541f0f
```

对应 tag：

```text
v2-deal-loop-phase5b0-evidence-summary-api-design
```

当前分支：

```text
codex/init-ai-collaboration
```

当前 V2 入口开关：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

## 3. 契约冻结目标

冻结 V2 真实工地证据摘要接口的 v1 契约，保证后续实现阶段不会把“证据摘要接口”做成照片接口、工地详情接口、AI 接口或案例生成接口。

冻结内容：

1. 接口名称。
2. 接口定位。
3. 版本号。
4. 入参。
5. 权限。
6. 租户隔离。
7. 返回结构。
8. 字段允许/禁止清单。
9. 错误码。
10. 安全不变量。
11. Phase 5B-2 最小实现边界。

## 4. 接口名称

接口名称固定为：

```text
getV2EvidenceSummary
```

该接口是 V2 唯一真实工地证据摘要编译接口。

后续 V2 推荐素材、案例草案、AI/GEO 生成链路如果需要真实证据，只能读取该接口的脱敏摘要结果，不能直连 V1 原始数据集合。

## 5. 接口定位

`getV2EvidenceSummary` 不是：

1. 照片接口。
2. 工地详情接口。
3. AI 生成接口。
4. 案例生成接口。
5. 公开素材接口。
6. 营销发布接口。
7. 售后详情接口。
8. 质保卡详情接口。

`getV2EvidenceSummary` 只做三件事：

```text
aggregate
sanitize
authorize
```

含义：

1. `aggregate`：聚合客户关联工地的证据数量、阶段覆盖、授权状态。
2. `sanitize`：脱敏并删除所有原始素材、个人信息和内部字段。
3. `authorize`：根据角色、租户、ownerVisible、case_authorizations 裁剪可用范围。

## 6. 版本号

返回结构必须包含：

```js
version: 'v1'
```

兼容规则：

1. 后续扩展必须兼容 v1。
2. 不允许删除 v1 字段。
3. 不允许改变 v1 字段类型。
4. 可新增可选字段，但不能新增高风险原始数据字段。
5. 前端应以 `version === 'v1'` 判断契约版本。

## 7. 入参契约

冻结入参：

```js
{
  customerId: string,
  projectId?: string
}
```

规则：

1. `customerId` 必填。
2. `projectId` 可选。
3. `tenantId` 不允许前端传，必须从登录态/currentUser 中取。
4. `role` 不允许前端传，必须从 `users` 表或现有权限逻辑中取。
5. 如果 `customerId` 为空，返回 `INVALID_PARAM`。
6. 如果 `projectId` 传入，必须校验它属于该 `customerId` 和当前 `tenantId`。
7. 如果客户有多个项目且未传 `projectId`，返回聚合摘要。
8. 入参不得包含手机号、openid、详细地址、完整 customer 对象。
9. 入参不得包含授权判断结果，授权必须后端读取。

示例：

```js
wx.cloud.callFunction({
  name: 'getV2EvidenceSummary',
  data: {
    customerId: 'customer_xxx',
    projectId: 'project_xxx'
  }
})
```

## 8. 权限契约

第一版允许角色：

```text
admin
boss_qi
boss_hu
```

第一版禁止角色：

```text
owner
worker
designer
sales
project_manager
foreman
```

权限规则：

1. 未登录返回 `UNAUTHENTICATED`。
2. 非允许角色返回 `FORBIDDEN`。
3. 角色必须从当前登录用户记录读取，不允许前端传。
4. Phase 5B-1/5B-2 不做销售、设计师、项目经理的分配权限扩展。
5. 如果后续开放 `sales / designer / project_manager`，必须进入新的权限设计阶段。

无权限返回：

```js
{
  version: 'v1',
  ok: false,
  code: 'FORBIDDEN',
  source: 'real-evidence-summary',
  error: {
    code: 'FORBIDDEN',
    message: '当前账号无权查看该客户证据摘要'
  }
}
```

## 9. 租户隔离契约

所有数据查询必须满足：

```text
tenantId === currentUser.tenantId
```

冻结规则：

1. 不允许前端传 `tenantId`。
2. 必须通过 `OPENID -> users -> currentUser.tenantId` 获取租户。
3. `customers` 必须属于当前 `tenantId`。
4. `projects` 必须属于当前 `tenantId`。
5. `stage_logs / photos / design_drawings / case_authorizations / warranty_cards / after_sales_tickets` 必须属于当前 `tenantId`。
6. 发现客户、项目或证据不属于当前 `tenantId` 时返回 `TENANT_MISMATCH`。
7. 旧数据空 `tenantId` 兼容是否允许，留到实现阶段人工确认；契约默认不跨租户。

租户不匹配返回：

```js
{
  version: 'v1',
  ok: false,
  code: 'TENANT_MISMATCH',
  source: 'real-evidence-summary',
  error: {
    code: 'TENANT_MISMATCH',
    message: '客户或证据不属于当前门店'
  }
}
```

## 10. 返回结构契约

v1 成功返回结构冻结为：

```js
{
  version: 'v1',
  ok: true,
  code: 'OK',
  source: 'real-evidence-summary',
  customerId: 'customer_xxx',
  projectId: 'project_xxx',

  projectSummary: {
    projectCount: 0,
    activeProjectCount: 0,
    completedProjectCount: 0,
    latestStage: null
  },

  evidenceSummary: {
    approvedStageCount: 0,
    ownerVisiblePhotoCount: 0,
    renderDrawingCount: 0,
    warrantyCardCount: 0,
    afterSalesTicketCount: 0,
    afterSalesClosedCount: 0,
    stageCoverage: [],
    availableProofTypes: [],
    dataConfidenceLevel: 'none',
    evidenceCompletenessScore: 0
  },

  authorizationSummary: {
    hasApprovedCase: false,
    canUseForMarketing: false,
    allowedPlatforms: [],
    allowedMaterials: [],
    blockedReasons: []
  },

  recommendedUse: {
    internalTrustMaterials: [],
    publicCaseAssets: [],
    blockedReasons: []
  },

  privacyGuard: {
    noRawPhotos: true,
    noFileIds: true,
    noTempFileURLs: true,
    noPersonalInfo: true,
    noConstructionDrawings: true,
    noDiaryBody: true,
    summaryOnly: true
  }
}
```

字段冻结说明：

1. `version` 固定为 `'v1'`。
2. `ok` 表示调用是否成功。
3. `code` 成功时固定为 `OK`，失败时为错误码。
4. `source` 固定为 `real-evidence-summary`。
5. `customerId` 返回入参客户 ID。
6. `projectId` 仅在指定或选中单项目时返回；多项目聚合可为空字符串。
7. `latestStage` 只返回阶段名或 `null`。
8. `stageCoverage` 只允许字符串数组，存阶段名。
9. `availableProofTypes` 只允许枚举字符串。
10. `dataConfidenceLevel` 只允许 `none / low / medium / high`。
11. `evidenceCompletenessScore` 范围为 `0-100`。

建议 proof type 枚举：

```text
approved_stage
owner_visible_photo
render_drawing
warranty_card
after_sales_closed
public_case_authorization
internal_case_authorization
```

建议 allowed platform 枚举：

```text
internal
xiaohongshu
douyin
website
geo
```

## 11. 字段允许清单

第一版只允许返回：

1. `count`
2. `boolean`
3. `status`
4. `category`
5. `stage name`
6. `authorization flag`
7. `platform flag`
8. `blocked reason`
9. `score`
10. 固定枚举字符串
11. 固定版本号
12. 当前 `customerId`
13. 可选 `projectId`

允许的 stage 信息：

```text
只允许阶段名称，不允许日报正文或节点详情。
```

允许的授权信息：

```text
只允许授权范围、材料类别、平台可用性、阻断原因。
```

允许的售后信息：

```text
只允许数量和关闭数量。
```

## 12. 字段禁止清单

永远禁止返回：

1. `fileID`
2. `cloudPath`
3. `tempFileURL`
4. 图片 URL
5. 原图
6. 缩略图
7. 日报正文
8. `workContent`
9. `ownerSummary` 原文
10. 施工图
11. 图纸下载链接
12. 图纸原始文件
13. 业主姓名
14. 完整手机号
15. 详细地址
16. `openid`
17. `ownerOpenid`
18. `userId`
19. 员工姓名
20. 工长姓名
21. 审核人姓名
22. 审核意见
23. 内部备注
24. 售后投诉原文
25. 售后处理记录详情
26. 业主评价原文
27. 绑定码
28. project_members 明细
29. 任何可直接定位个人、家庭或工地门牌的信息

## 13. 错误码契约

错误码冻结：

```text
OK
INVALID_PARAM
UNAUTHENTICATED
FORBIDDEN
CUSTOMER_NOT_FOUND
TENANT_MISMATCH
PROJECT_NOT_FOUND
NO_PROJECT
NO_EVIDENCE
NO_AUTHORIZATION
READ_FAILED
```

### OK

含义：接口成功返回。

前端展示：

```text
真实证据摘要
```

### INVALID_PARAM

触发：`customerId` 为空或入参格式不合法。

前端展示：

```text
缺少客户 ID，无法读取证据摘要
```

### UNAUTHENTICATED

触发：未登录或找不到当前用户。

前端展示：

```text
请先登录后查看证据摘要
```

### FORBIDDEN

触发：角色不允许调用。

前端展示：

```text
当前账号无权查看真实证据摘要
```

### CUSTOMER_NOT_FOUND

触发：客户不存在、已删除或无法读取。

前端展示：

```text
客户读取失败，请返回客户列表重新打开
```

### TENANT_MISMATCH

触发：客户、项目或证据不属于当前租户。

前端展示：

```text
客户上下文异常，请返回重新打开
```

### PROJECT_NOT_FOUND

触发：传入 `projectId` 但项目不存在。

前端展示：

```text
关联工地不存在，已使用 mock 素材
```

### NO_PROJECT

触发：客户暂无关联工地。

前端展示：

```text
暂无真实工地证据，已使用 mock 素材
```

### NO_EVIDENCE

触发：有工地，但没有 `approved + ownerVisible` 证据摘要。

前端展示：

```text
暂无可用真实证据，已使用 mock 素材
```

### NO_AUTHORIZATION

触发：有内部证据，但没有可公开营销授权。

前端展示：

```text
可用于内部信任跟进，暂不可作为公开案例
```

### READ_FAILED

触发：数据读取异常。

前端展示：

```text
真实证据摘要读取失败，已回退 mock
```

错误返回统一结构：

```js
{
  version: 'v1',
  ok: false,
  code: 'READ_FAILED',
  source: 'real-evidence-summary',
  customerId: 'customer_xxx',
  projectId: '',
  error: {
    code: 'READ_FAILED',
    message: '真实证据摘要读取失败'
  },
  privacyGuard: {
    noRawPhotos: true,
    noFileIds: true,
    noTempFileURLs: true,
    noPersonalInfo: true,
    noConstructionDrawings: true,
    noDiaryBody: true,
    summaryOnly: true
  }
}
```

## 14. 安全不变量

必须长期保持：

1. `ownerVisible = true` 不等于可公开营销使用。
2. 对外营销必须叠加 `case_authorizations`。
3. `getV2EvidenceSummary` 不返回任何原始素材。
4. `trust-materials` 后续只能消费该接口，不能直连 V1 原始数据。
5. AI / GEO / 小红书内容生成后续只能读 summary，不能读 `photos / stage_logs / design_drawings` 原始数据。
6. v1 契约不得破坏，只能兼容扩展。
7. `tenantId` 必须后端读取，不能由前端传入。
8. role 必须后端读取，不能由前端传入。
9. 所有错误态也必须返回 `privacyGuard`，避免前端误判。
10. 第一版不返回任何图片地址，即使已授权。

## 15. Phase 5B-2 最小实现边界

只设计，不实现。

建议下一阶段 Phase 5B-2 最小实现：

1. 只新增 `cloudfunctions/getV2EvidenceSummary`。
2. 不改前端。
3. 不改 `miniprogram/`。
4. 不接 `trust-materials`。
5. 只做云函数本地/云端测试。
6. 第一版只返回 `projectSummary + evidenceSummary + privacyGuard`。
7. `authorizationSummary` 可先返回安全默认值：

```js
{
  hasApprovedCase: false,
  canUseForMarketing: false,
  allowedPlatforms: [],
  allowedMaterials: [],
  blockedReasons: ['Phase 5B-2 暂未启用公开授权输出']
}
```

8. 如果同步实现 `authorizationSummary`，不得扩大返回范围，不得返回业主姓名或授权原始文件。
9. 不返回 `recommendedUse` 中的真实素材内容，只返回字符串类别和阻断原因。

Phase 5B-2 验收重点：

1. 云函数存在。
2. 入参只接受 `customerId / projectId`。
3. 权限只允许 `admin / boss_qi / boss_hu`。
4. 不返回禁止字段。
5. 不写数据库。
6. 不改 V1。
7. 不部署、不上传体验版。

## 16. 风险点

1. 实现时为了方便复用 `getProjectDetail`，可能带出照片 URL。
2. 为了展示更丰富内容，可能把 `stage_logs.workContent` 当摘要返回。
3. 授权判断如果只看 `ownerVisible`，会误把业主可见素材当成公开营销素材。
4. sales/designer/project_manager 权限如果提前开放，可能缺少客户分配边界。
5. `projectId` 如果不校验 `customerId`，会造成串客户证据。
6. 错误态如果不统一，前端可能把读取失败误展示为真实证据为空。
7. 后续 AI 接入如果绕开 summary，仍会泄露隐私。

## 17. 下一步建议

Phase 5B-1 完成后停止，不进入 Phase 5B-2。

进入 Phase 5B-2 前建议人工确认：

1. 是否接受 v1 返回结构冻结。
2. Phase 5B-2 是否只新增云函数、不改前端。
3. Phase 5B-2 是否只开放 `admin / boss_qi / boss_hu`。
4. Phase 5B-2 是否先不实现真实授权输出，只返回安全默认值。
5. 是否把禁止字段扫描作为验收硬门槛。
