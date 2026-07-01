# V2 Deal Loop Phase 5B-2E Frontend Acceptance Checklist

## 1. 当前阶段

Phase 5B-2E：证据摘要前端接入验收清单。

本阶段只设计 Phase 5B-3 前端只读接入 `getV2EvidenceSummary` 前的验收清单，不修改业务代码，不接前端，不部署，不上传体验版，不进入 Phase 5B-3。

## 2. 当前 HEAD / tag

当前安全检查点：

```text
6aac0b739c69f05afa0f6e5985e03f9dfe1b1d2a
```

当前 tag：

```text
v2-deal-loop-phase5b2d-safe-error-convergence
```

当前分支：

```text
codex/init-ai-collaboration
```

当前入口开关：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

## 3. 本阶段目标

冻结 Phase 5B-3 前端接入 `getV2EvidenceSummary` 的验收口径：

1. 只允许一个页面先接真实证据摘要。
2. 只允许只读调用摘要接口。
3. 只展示摘要字段。
4. 不展示真实图片、日报正文或人员隐私。
5. 不把内部摘要误写成公开营销素材。
6. 不打开工作台入口。
7. 不部署，不上传体验版。

## 4. Phase 5B-3 推荐接入范围

推荐 Phase 5B-3 只接入一个页面：

```text
miniprogram/subpackages/deal-loop/pages/trust-materials/
```

优先选择该页面的原因：

1. 当前页面定位就是“信任证据库 / 推荐信任素材”。
2. 当前页面已支持 `customerId` query。
3. 当前页面已展示数据源状态。
4. 当前页面已使用真实客户字段匹配本地 mock 素材。
5. 当前页面已有客户上下文校验逻辑。

Phase 5B-3 不建议同时接入：

```text
case-assets
ai-assistant
contract-to-project
customer-detail
pipeline
```

原因：

1. `case-assets` 涉及公开案例、小红书、抖音、官网、GEO，更容易误把内部摘要当成公开营销授权。
2. `ai-assistant` 涉及话术生成，容易被误解为真实 AI 或真实素材可外发。
3. `contract-to-project` 与工地创建草案相关，不应混入真实证据摘要。
4. `customer-detail / pipeline` 是客户上下文入口，不应在 Phase 5B-3 扩大数据源复杂度。

## 5. 前端调用边界

Phase 5B-3 真实证据摘要接入只允许调用：

```text
getV2EvidenceSummary
```

调用入参必须限定为：

```js
{
  customerId
}
```

如未来确需指定项目，才允许增加：

```js
{
  customerId,
  projectId
}
```

但 Phase 5B-3 第一版建议只传 `customerId`，由云函数聚合客户下的工地摘要。

不得新增：

1. 其它云函数调用。
2. 真实集合直连。
3. `createProject` 调用。
4. 跟进记录写入。
5. 真实 AI API。
6. `wx.request`。
7. 图片临时链接获取。
8. 自动发布逻辑。

说明：

当前 `trust-materials` 已有历史只读 `getCustomer` 调用用于客户上下文。Phase 5B-3 若要严格落实“证据摘要只允许调用 `getV2EvidenceSummary`”，应只新增这一项摘要调用，不再扩展其它云函数；若调整现有客户字段读取方式，必须单独写明，不可顺手改动其它页面。

## 6. 展示字段白名单

Phase 5B-3 前端只允许展示 `getV2EvidenceSummary` 返回的摘要字段。

推荐展示：

### 项目摘要

1. `projectSummary.projectCount`
2. `projectSummary.activeProjectCount`
3. `projectSummary.completedProjectCount`
4. `projectSummary.latestStage`

### 证据摘要

1. `evidenceSummary.approvedStageCount`
2. `evidenceSummary.ownerVisiblePhotoCount`
3. `evidenceSummary.renderDrawingCount`
4. `evidenceSummary.warrantyCardCount`
5. `evidenceSummary.afterSalesTicketCount`
6. `evidenceSummary.afterSalesClosedCount`
7. `evidenceSummary.stageCoverage`
8. `evidenceSummary.availableProofTypes`
9. `evidenceSummary.dataConfidenceLevel`
10. `evidenceSummary.evidenceCompletenessScore`

### 授权摘要

1. `authorizationSummary.hasApprovedCase`
2. `authorizationSummary.canUseForMarketing`
3. `authorizationSummary.allowedPlatforms`
4. `authorizationSummary.allowedMaterials`
5. `authorizationSummary.blockedReasons`

### 推荐使用

1. `recommendedUse.internalTrustMaterials`
2. `recommendedUse.publicCaseAssets`
3. `recommendedUse.blockedReasons`

### 安全摘要

1. `privacyGuard.noRawPhotos`
2. `privacyGuard.noFileIds`
3. `privacyGuard.noTempFileURLs`
4. `privacyGuard.noPersonalInfo`
5. `privacyGuard.noConstructionDrawings`
6. `privacyGuard.noDiaryBody`
7. `privacyGuard.summaryOnly`

页面展示建议：

```text
真实证据摘要 + Mock 素材
```

不要写成：

```text
真实案例素材
真实照片素材
可公开发布素材
```

## 7. 禁止展示字段黑名单

Phase 5B-3 前端不得展示：

```text
手机号
openid
unionid
身份证
详细地址
内部备注
fileID
cloudPath
图片 URL
缩略图 URL
日报正文
审核意见
员工姓名
工长姓名
业主评价原文
投诉原文
售后处理记录详情
施工图文件
图纸下载链接
```

不得展示任何从 V1 原始集合直接读取的：

```text
stage_logs.content
stage_logs.body
stage_logs.remark
photos.fileID
photos.cloudPath
photos.url
design_drawings.fileID
design_drawings.tempFileURL
case_authorizations 原始文件
after_sales_tickets.issueDescription
```

验收时必须用页面全文搜索或截图检查确认以上字段没有出现。

## 8. 错误码展示规则

Phase 5B-3 前端只处理以下对外错误码：

```text
UNAUTHENTICATED
FORBIDDEN
NOT_FOUND
NO_EVIDENCE
NO_MARKETING_AUTHORIZATION
READ_FAILED
```

文案建议：

| code | 展示文案 | 处理方式 |
| --- | --- | --- |
| `UNAUTHENTICATED` | 请先登录后再查看证据摘要。 | 显示登录/权限提示，不 fallback 到其它客户 |
| `FORBIDDEN` | 当前账号暂无查看证据摘要权限。 | 显示权限提示，不展示真实摘要 |
| `NOT_FOUND` | 未找到可用工地证据，请返回客户列表重新打开。 | 显示空状态，不 fallback 到默认客户 |
| `NO_EVIDENCE` | 暂无可用证据摘要，可继续使用 mock 素材。 | 可展示 mock 素材，但必须标明 mock |
| `NO_MARKETING_AUTHORIZATION` | 可内部参考，暂不可公开发布。 | 展示内部摘要，禁用公开营销提示 |
| `READ_FAILED` | 证据摘要读取失败，请稍后重试。 | 显示重试或空状态，不冒充真实证据 |

禁止展示：

```text
TENANT_MISMATCH
CUSTOMER_NOT_FOUND
PROJECT_NOT_FOUND
CUSTOMER_PROJECT_MISMATCH
NO_TENANT
NO_AUTHORIZATION
AUTHORIZATION_NOT_PUBLIC
INVALID_PARAM
NO_PROJECT
```

这些内部原因不得出现在用户界面。

## 9. fallback 规则

Phase 5B-3 必须遵守：

1. 真实 `customerId` 请求失败时，不得 fallback 到其它客户。
2. `NOT_FOUND` 不得 fallback 到 mock 默认客户。
3. `NO_EVIDENCE` 可以显示 mock 素材，但必须标明“mock / 示例素材”。
4. `READ_FAILED` 可以显示空状态或重试按钮，不得冒充真实证据。
5. `NO_MARKETING_AUTHORIZATION` 不阻断内部摘要展示，但必须禁用公开营销提示。
6. `UNAUTHENTICATED / FORBIDDEN` 不得展示真实证据摘要。
7. 有 `customerId` 时，不得使用 `customers[0]` 或默认 mock 客户冒充当前客户。
8. 无 `customerId` 的开发者直达场景，可以保留 mock 演示，但必须显示 `Mock fallback`。

推荐状态文案：

```text
真实证据摘要 + Mock 素材
暂无真实证据，已展示 mock 示例素材
真实证据读取失败
可内部参考，暂不可公开发布
```

## 10. NO_MARKETING_AUTHORIZATION 特殊规则

`NO_MARKETING_AUTHORIZATION` 不是系统错误。

它表示：

1. 内部可信证据摘要可以参考。
2. 小红书不可直接使用。
3. 抖音不可直接使用。
4. 官网案例不可直接使用。
5. GEO 问答不可直接使用。
6. 公开营销素材必须等待明确授权。

Phase 5B-3 前端必须：

1. 展示“可内部参考，暂不可公开发布”。
2. 不展示“可发小红书”。
3. 不展示“可发抖音”。
4. 不展示“可上官网案例”。
5. 不展示“可用于 GEO”。
6. 不把 `publicCaseAssets` 为空误判为系统错误。

## 11. 入口开关要求

Phase 5B-3 仍必须保持：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

要求：

1. 不因为接入真实证据摘要而打开工作台入口。
2. 不修改工作台入口。
3. 不修改 tabBar。
4. 不修改 `miniprogram/app.json`。
5. 不部署。
6. 不上传体验版。

开发者仍可通过页面路径直达验收。

## 12. 验收路径

Phase 5B-3 完成后建议验收路径：

页面路径：

```text
subpackages/deal-loop/pages/trust-materials/trust-materials
```

query：

```text
customerId=<真实客户ID>
```

验收检查：

1. 页面仍是同一个客户。
2. `customerId` 在 URL、客户上下文、证据摘要请求中一致。
3. 数据源显示“真实证据摘要 + Mock 素材”。
4. 无证据时不串客户。
5. 无授权时显示“可内部参考，暂不可公开发布”。
6. `NO_EVIDENCE` 不展示成系统错误。
7. `NO_MARKETING_AUTHORIZATION` 不展示成读取失败。
8. 不展示图片 URL。
9. 不展示日报正文。
10. 不展示 openid。
11. 不展示手机号。
12. 不展示详细地址。
13. 不展示员工/工长姓名。
14. mock 发送按钮仍然只弹窗，不请求 API，不写库。
15. `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
16. 未部署。
17. 未上传体验版。

补充验收场景：

1. 真实客户有项目、有摘要、无公开授权。
2. 真实客户有项目、无可用证据。
3. 真实客户无项目。
4. 错误 `customerId`。
5. 无 `customerId` 直达。
6. 无权限角色。

## 13. 风险点

1. 前端错误 fallback 到默认客户，导致客户串人。
2. 把内部摘要误写成公开营销素材。
3. 把 `NO_EVIDENCE` 当成系统错误。
4. 把 `NO_MARKETING_AUTHORIZATION` 当成失败。
5. 展示原始图片、日报正文或员工信息。
6. 打开工作台入口。
7. 误部署云函数。
8. 误上传体验版。
9. 一次性接入多个页面，导致验收范围失控。
10. 前端绕过 `getV2EvidenceSummary` 直连 V1 集合。

## 14. 是否建议进入 Phase 5B-3

不建议立即进入。

建议先人工确认：

1. Phase 5B-3 是否只接 `trust-materials`。
2. 是否接受 `NO_MARKETING_AUTHORIZATION` 与内部摘要共存。
3. 是否接受 `NO_EVIDENCE` 时展示 mock 示例素材。
4. 是否继续保持 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。

确认后再进入 Phase 5B-3 前端只读接入。
