# V2 Deal Loop Phase 5B-2 Evidence Summary Function

## 1. 当前阶段

Phase 5B-2：`getV2EvidenceSummary` 云函数最小实现。

本阶段只新增独立云函数和阶段文档，不接前端，不修改 `miniprogram/`，不修改现有云函数，不部署，不上传体验版，不进入 Phase 5B-3。

## 2. 当前 HEAD / tag

阶段起点 commit：

```text
7ec82c7fb7dda6ad5c1a8bfbab643cc236b393dc
```

阶段起点 tag：

```text
v2-deal-loop-phase5b1-api-contract-lock
```

当前分支：

```text
codex/init-ai-collaboration
```

## 3. 实现目标

按照 Phase 5B-1 已冻结的 v1 契约，最小实现 `getV2EvidenceSummary` 云函数。

目标边界：

1. 聚合真实工地证据摘要。
2. 只返回统计、状态、阶段覆盖、授权摘要和风险阻断原因。
3. 不返回原始素材。
4. 不返回个人隐私。
5. 不写数据库。
6. 不接前端页面。

## 4. 新增文件列表

```text
cloudfunctions/getV2EvidenceSummary/index.js
cloudfunctions/getV2EvidenceSummary/package.json
AI_TASKS/V2_DEAL_LOOP_PHASE5B2_EVIDENCE_SUMMARY_FUNCTION.md
```

## 5. 云函数名称

```text
getV2EvidenceSummary
```

该函数是 V2 第一版真实工地证据摘要编译接口。

## 6. 入参

固定入参：

```js
{
  customerId: string,
  projectId?: string
}
```

规则：

1. `customerId` 必填。
2. `projectId` 可选。
3. `tenantId` 不从前端读取。
4. `role` 不从前端读取。
5. `tenantId / role` 均通过当前登录用户记录获取。

## 7. 权限校验

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

未登录返回：

```text
UNAUTHENTICATED
```

无权限返回：

```text
FORBIDDEN
```

## 8. 租户隔离

所有证据查询均使用当前用户的 `tenantId`，并按 Phase 5B-1 契约采用精确匹配：

```text
tenantId === currentUser.tenantId
```

本阶段没有使用前端传入的 `tenantId`。

客户、项目、日报、照片、图纸、案例授权、质保卡、售后工单均按当前租户限制。

## 9. 数据源

第一版读取以下集合的摘要字段：

```text
customers
projects
stage_logs
photos
design_drawings
case_authorizations
warranty_cards
after_sales_tickets
```

用途：

1. `customers`：校验客户存在与租户归属。
2. `projects`：统计客户关联工地数量、活跃数量、完工数量和最新阶段。
3. `stage_logs`：统计已审核且业主可见的阶段记录数量与阶段覆盖。
4. `photos`：统计已审核业主可见阶段记录下的业主可见照片数量。
5. `design_drawings`：统计业主可见效果图数量。
6. `case_authorizations`：生成案例授权摘要。
7. `warranty_cards`：统计质保卡数量。
8. `after_sales_tickets`：统计售后工单总数与已关闭数量。

## 10. 返回结构

成功返回遵守 Phase 5B-1 v1 契约：

```js
{
  version: 'v1',
  ok: true,
  code: 'OK',
  source: 'real-evidence-summary',
  customerId,
  projectId,
  projectSummary: {
    projectCount,
    activeProjectCount,
    completedProjectCount,
    latestStage
  },
  evidenceSummary: {
    approvedStageCount,
    ownerVisiblePhotoCount,
    renderDrawingCount,
    warrantyCardCount,
    afterSalesTicketCount,
    afterSalesClosedCount,
    stageCoverage,
    availableProofTypes,
    dataConfidenceLevel,
    evidenceCompletenessScore
  },
  authorizationSummary: {
    hasApprovedCase,
    canUseForMarketing,
    allowedPlatforms,
    allowedMaterials,
    blockedReasons
  },
  recommendedUse: {
    internalTrustMaterials,
    publicCaseAssets,
    blockedReasons
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

错误返回同样包含 `version / ok / code / source / privacyGuard / error`。

## 11. 隐私保护

本阶段只返回摘要，不返回：

1. 文件 ID。
2. 云存储路径。
3. 临时访问链接。
4. 图片链接。
5. 原始图片或缩略图。
6. 日报正文。
7. 施工图文件。
8. 客户姓名、完整手机号、详细地址。
9. 员工、工长、审核人的姓名或身份标识。
10. 售后投诉原文和处理记录详情。

代码中未调用临时文件链接接口，也未进行任何发布动作。

## 12. 错误码

已支持：

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

其中 `NO_AUTHORIZATION` 作为授权阻断原因保留在契约中；当前函数在存在内部证据但无公开授权时，优先返回 `OK` 并在 `authorizationSummary.blockedReasons` 中标记 `NO_AUTHORIZATION`，避免影响内部信任素材摘要使用。

## 13. 未接前端说明

本阶段未修改任何 `miniprogram/` 文件。

后续 `trust-materials` 页面如需接入，应进入 Phase 5B-3 或独立阶段，并且只能消费本函数返回的摘要结果，不能直连 V1 原始集合。

## 14. 未部署说明

本阶段未部署云函数，未上传体验版，未发布正式版。

新增云函数目录只是代码实现，不代表线上可调用。

## 15. 风险点

1. 历史数据可能存在空 `tenantId`，本阶段按新契约严格精确匹配，可能导致部分旧数据不计入摘要。
2. 如果某个证据集合缺失或权限规则变更，云函数可能返回 `READ_FAILED`。
3. 当前照片数量依赖已审核业主可见阶段记录的关联关系，缺少关联字段的旧照片不会被统计。
4. `NO_AUTHORIZATION` 不阻断内部摘要，但会阻断公开案例素材建议。
5. 后续前端接入时不能把摘要误展示为真实公开案例。

## 16. 验收方式

代码检查：

```bash
git diff --check
node --check cloudfunctions/getV2EvidenceSummary/index.js
```

范围检查：

1. 只新增 `cloudfunctions/getV2EvidenceSummary/**`。
2. 只新增本阶段文档。
3. 未修改 `miniprogram/`。
4. 未修改现有云函数。
5. 未修改 `app.json`、工作台入口、tabBar、部署配置。

安全检查：

1. 不写数据库。
2. 不调用 `createProject`。
3. 不调用真实 AI API。
4. 不调用临时文件链接接口。
5. 不返回原始素材。
6. 不返回个人隐私字段。

## 17. 下一步建议

Phase 5B-2 人工验收通过后，再考虑提交并打 tag。

下一阶段建议仍不要直接接前端；可以先做云函数测试记录文档，确认不同错误态、无工地、无证据、有证据无授权、有证据有授权等场景稳定后，再进入 `trust-materials` 只读接入阶段。
