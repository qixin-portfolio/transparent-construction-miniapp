# V2 Deal Loop Phase 5B-2T Function Test

## 1. 当前阶段

Phase 5B-2T：证据汇总云函数测试与错误态验证。

本阶段只验证 `getV2EvidenceSummary` 的测试场景、错误态、安全边界和返回结构，不接前端，不修改业务逻辑，不部署，不上传体验版，不进入 Phase 5B-3。

## 2. 当前 HEAD / tag

当前安全检查点：

```text
e963445bfe3087e1ac3ca80ebb2e8c2c35bf79be
```

当前 tag：

```text
v2-deal-loop-phase5b2-evidence-summary-function
```

当前分支：

```text
codex/init-ai-collaboration
```

## 3. 测试目标

本阶段目标是冻结 Phase 5B-2 的测试和验收口径：

1. 确认云函数语法正确。
2. 确认输入参数覆盖完整。
3. 确认权限和租户隔离边界。
4. 确认证据过滤规则。
5. 确认返回结构只包含摘要字段。
6. 确认错误态不泄露隐私和原始证据。
7. 确认 `NO_AUTHORIZATION` 只阻断公开营销，不阻断内部摘要。
8. 确认未部署、未上传体验版、未接前端。

## 4. 语法检查结果

已执行：

```bash
node --check cloudfunctions/getV2EvidenceSummary/index.js
```

结果：

```text
通过，无语法错误。
```

说明：

1. 本阶段没有执行云端真实调用。
2. 本阶段没有部署云函数。
3. 本阶段没有读取或展示真实照片文件。

## 5. 输入参数测试用例

### 5.1 缺少 customerId / projectId

输入：

```js
{}
```

期望：

1. 返回 `ok: false`。
2. 返回 `code: 'INVALID_PARAM'`。
3. 不查询客户、项目或证据数据。
4. 不返回任何敏感字段。

### 5.2 只有 customerId

输入：

```js
{ customerId: 'customer_xxx' }
```

期望：

1. 使用当前登录用户的 `tenantId`。
2. 校验客户属于当前租户。
3. 查询该客户下所有同租户项目。
4. 返回聚合摘要。
5. 不返回原始素材。

### 5.3 只有 projectId

输入：

```js
{ projectId: 'project_xxx' }
```

期望：

1. 因 `customerId` 缺失，返回 `INVALID_PARAM`。
2. 不允许绕过客户上下文直接查项目证据。

### 5.4 customerId 和 projectId 都存在

输入：

```js
{
  customerId: 'customer_xxx',
  projectId: 'project_xxx'
}
```

期望：

1. 校验客户属于当前租户。
2. 校验项目属于当前租户。
3. 校验项目关联该客户。
4. 只返回该项目范围内的证据摘要。

### 5.5 customerId 不属于当前 tenantId

期望：

1. 返回 `TENANT_MISMATCH`。
2. 错误信息只表达“客户或证据不属于当前门店”。
3. 不返回客户详情。
4. 不返回其它租户证据数量。

### 5.6 projectId 不属于当前 tenantId

期望：

1. 返回 `TENANT_MISMATCH`。
2. 不返回项目详情。
3. 不返回其它租户证据摘要。

### 5.7 customerId 与 projectId 不匹配

期望：

1. 返回 `PROJECT_NOT_FOUND`。
2. 不返回项目是否属于其它客户的详细原因。
3. 不返回项目详情。

### 5.8 customerId 存在但无项目

期望：

1. 返回 `NO_PROJECT`。
2. 返回空摘要结构。
3. `privacyGuard.summaryOnly = true`。

### 5.9 projectId 存在但无证据

期望：

1. 项目校验通过。
2. 摘要计数为 0。
3. 若无内部证据且无授权，返回 `NO_EVIDENCE`。
4. 不返回任何原始字段。

### 5.10 当前用户无 tenantId

当前实现：

1. 沿用项目既有云函数模式，为缺少 `tenantId` 的历史用户回填 `tenant_shengjing_default`。
2. 不返回独立 `NO_TENANT`。

测试结论：

1. 该行为与现有云函数风格一致。
2. Phase 5B-3 前如要改为强制 `NO_TENANT`，必须进入独立契约变更阶段。

### 5.11 当前用户不存在

期望：

1. 返回 `UNAUTHENTICATED`。
2. 对应业务测试名可记为 `NOT_LOGIN / USER_NOT_FOUND`。
3. 不返回用户、租户或证据信息。

### 5.12 当前用户角色无权限

期望：

1. 返回 `FORBIDDEN`。
2. 对应业务测试名可记为 `NO_PERMISSION`。
3. 禁止角色包括 `owner / worker / designer / sales / project_manager / foreman`。

## 6. 权限与租户隔离验证

已静态确认：

1. 函数不读取前端传入的 `tenantId`。
2. 函数不读取前端传入的 `role`。
3. 当前用户通过 `cloud.getWXContext()` 获取 `OPENID` 后查询 `users`。
4. 允许角色固定为 `admin / boss_qi / boss_hu`。
5. 客户校验使用当前用户 `tenantId`。
6. 项目校验使用当前用户 `tenantId`。
7. `stage_logs / photos / design_drawings / case_authorizations / warranty_cards / after_sales_tickets` 查询均带当前用户 `tenantId`。

跨租户场景：

1. 客户跨租户返回 `TENANT_MISMATCH`。
2. 项目跨租户返回 `TENANT_MISMATCH`。
3. 证据集合查询不会跨租户统计。
4. 错误文案不返回其它租户名称、客户姓名、项目名称或证据数量。

风险记录：

当前实现先按 `_id` 读取客户/项目后再判断 `tenantId`，因此错误码可区分 `CUSTOMER_NOT_FOUND / PROJECT_NOT_FOUND` 与 `TENANT_MISMATCH`。这符合 Phase 5B-1 契约，但如果后续要进一步降低 ID 探测风险，可改为“同租户查询不到统一返回 not found”，该调整需要单独进入契约变更。

## 7. 证据过滤验证

### 7.1 stage_logs

已确认过滤：

```js
reviewStatus: 'approved'
ownerVisible: true
```

只返回：

1. `approvedStageCount`
2. `stageCoverage`

不返回：

1. 日报正文。
2. 审核意见。
3. 提交人。
4. 员工姓名。
5. 工长姓名。

### 7.2 photos

已确认过滤：

1. 只统计已审核、业主可见日报关联的照片。
2. 照片自身必须满足 `ownerVisible: true`。

只返回：

```js
ownerVisiblePhotoCount
```

不返回：

1. `fileID`
2. `cloudPath`
3. `thumbUrl`
4. `url`
5. 原图。
6. 缩略图。
7. 上传人。
8. 定位。
9. 备注。

### 7.3 design_drawings

已确认过滤：

```js
type: 'render'
ownerVisible: true
```

只返回：

```js
renderDrawingCount
```

不返回：

1. 施工图。
2. 图纸文件。
3. 下载链接。
4. 图纸原始路径。

### 7.4 case_authorizations

已确认授权判断：

1. `status === 'approved'` 才视为授权可用。
2. `authorizationScope === 'private'` 不可用于营销。
3. `revokedAt` 存在则不可用。
4. `authorizationScope === 'public'` 才可公开营销。

只返回：

1. `hasApprovedCase`
2. `canUseForMarketing`
3. `allowedPlatforms`
4. `allowedMaterials`
5. `blockedReasons`

不返回：

1. 授权原始文件。
2. 业主敏感信息。
3. 授权签署材料原文。

### 7.5 warranty_cards / after_sales_tickets

已确认只做统计：

1. `warrantyCardCount`
2. `afterSalesTicketCount`
3. `afterSalesClosedCount`

不返回：

1. 投诉原文。
2. 处理记录详情。
3. 联系方式。
4. 图片。
5. 业主姓名。

## 8. 返回结构验证

当前实现返回 Phase 5B-1 v1 契约字段：

```js
{
  version: 'v1',
  ok,
  code,
  source: 'real-evidence-summary',
  customerId,
  projectId,
  projectSummary,
  evidenceSummary,
  authorizationSummary,
  recommendedUse,
  privacyGuard
}
```

摘要字段包括：

1. `projectSummary.projectCount`
2. `projectSummary.activeProjectCount`
3. `projectSummary.completedProjectCount`
4. `projectSummary.latestStage`
5. `evidenceSummary.approvedStageCount`
6. `evidenceSummary.ownerVisiblePhotoCount`
7. `evidenceSummary.renderDrawingCount`
8. `evidenceSummary.warrantyCardCount`
9. `evidenceSummary.afterSalesTicketCount`
10. `evidenceSummary.afterSalesClosedCount`
11. `evidenceSummary.stageCoverage`
12. `evidenceSummary.availableProofTypes`
13. `evidenceSummary.dataConfidenceLevel`
14. `evidenceSummary.evidenceCompletenessScore`
15. `authorizationSummary.hasApprovedCase`
16. `authorizationSummary.canUseForMarketing`
17. `authorizationSummary.allowedPlatforms`
18. `authorizationSummary.allowedMaterials`
19. `authorizationSummary.blockedReasons`

与测试提示字段的映射：

| 测试提示字段 | 当前 v1 字段 |
| --- | --- |
| `approvedStageLogCount` | `evidenceSummary.approvedStageCount` |
| `visiblePhotoCount` | `evidenceSummary.ownerVisiblePhotoCount` |
| `hasPublicAuthorization` | `authorizationSummary.hasApprovedCase` + `authorizationSummary.canUseForMarketing` |
| `marketingAllowed` | `authorizationSummary.canUseForMarketing` |
| `evidenceLevel` | `evidenceSummary.dataConfidenceLevel` |
| `safeSummary` | `projectSummary / evidenceSummary / authorizationSummary / privacyGuard` |

不得返回字段检查：

1. 不返回手机号。
2. 不返回 openid。
3. 不返回身份证。
4. 不返回详细地址。
5. 不返回内部备注。
6. 不返回 `fileID / cloudPath / tempFileURL`。
7. 不返回图片 URL。
8. 不返回日报正文。
9. 不返回员工姓名。
10. 不返回审核意见。

## 9. 错误态设计

Phase 5B-1 冻结的真实返回错误码为：

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

本阶段业务测试错误态与当前代码错误码映射如下：

| 业务测试错误态 | 当前返回码 | 说明 |
| --- | --- | --- |
| `NOT_LOGIN` | `UNAUTHENTICATED` | 未找到当前登录用户 |
| `USER_NOT_FOUND` | `UNAUTHENTICATED` | `users` 中无 active 用户 |
| `NO_TENANT` | 暂无独立返回码 | 当前实现按现有项目模式回填默认租户 |
| `NO_PERMISSION` | `FORBIDDEN` | 当前角色不在 `admin / boss_qi / boss_hu` |
| `CUSTOMER_NOT_FOUND` | `CUSTOMER_NOT_FOUND` | 客户不存在或已删除 |
| `PROJECT_NOT_FOUND` | `PROJECT_NOT_FOUND` | 项目不存在、删除或与客户不匹配 |
| `CUSTOMER_PROJECT_MISMATCH` | `PROJECT_NOT_FOUND` | 不暴露项目属于哪个客户 |
| `NO_EVIDENCE` | `NO_EVIDENCE` | 有项目但无内部证据且无授权 |
| `NO_AUTHORIZATION` | `authorizationSummary.blockedReasons` | 作为公开营销阻断原因 |
| `INTERNAL_ERROR` | `READ_FAILED` | 非预期读取失败 |

错误返回安全要求：

1. 不返回其它租户客户姓名。
2. 不返回其它租户项目名称。
3. 不返回其它租户证据数量。
4. 不返回原始数据库错误堆栈。
5. 保持 `privacyGuard.summaryOnly = true`。

## 10. NO_AUTHORIZATION 风险说明

当前实现策略：

1. 内部摘要可以读取统计信息。
2. 未授权时 `authorizationSummary.canUseForMarketing = false`。
3. 未授权时 `authorizationSummary.blockedReasons` 包含 `NO_AUTHORIZATION`。
4. 未授权时 `recommendedUse.publicCaseAssets = []`。
5. 未授权时不得生成公开营销素材。

Phase 5B-3 前端必须区分：

1. 内部可信证据摘要。
2. 可公开营销素材。

前端禁止：

1. 没有授权时展示“小红书可直接使用”。
2. 没有授权时展示“抖音可直接使用”。
3. 没有授权时展示“官网案例可直接使用”。
4. 没有授权时展示“GEO 可直接使用”。
5. 把内部摘要包装成公开案例。

## 11. 发布状态确认

当前确认：

1. 未部署云函数。
2. 未上传体验版。
3. 未接前端。
4. `trust-materials` 未调用 `getV2EvidenceSummary`。
5. `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
6. 未进入 Phase 5B-3。

## 12. 风险点

1. 当前阶段未做真实云端调用，仅完成静态测试、语法检查和测试用例设计。
2. 当前实现对无 `tenantId` 用户回填默认租户，符合现有云函数模式，但不是独立 `NO_TENANT` 错误。
3. 当前实现区分 `TENANT_MISMATCH` 与 not found，符合 Phase 5B-1 契约；如要降低 ID 探测风险，应单独变更契约。
4. `NO_AUTHORIZATION` 不阻断内部摘要，但 Phase 5B-3 前端必须严格禁止公开营销提示。
5. 旧数据若缺少 `tenantId` 或证据关联字段，可能不会被统计。

## 13. 是否建议进入 Phase 5B-3

不建议立即进入 Phase 5B-3。

建议先完成人工确认：

1. 是否接受当前错误码映射，而不是新增 `NOT_LOGIN / NO_PERMISSION / INTERNAL_ERROR` 等别名。
2. 是否接受无 `tenantId` 用户回填默认租户。
3. 是否接受 `TENANT_MISMATCH` 与 not found 分开返回。
4. 是否需要先做云函数本地 mock 调用或云端测试记录。

人工确认后，再决定是否进入 Phase 5B-3 前端只读接入。
