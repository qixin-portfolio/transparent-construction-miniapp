# V2 Deal Loop Phase 5B-3 Trust Materials Evidence Summary

## 1. 当前阶段

Phase 5B-3：`trust-materials` 前端只读接入证据摘要。

本阶段只在 V2 `trust-materials` 页面只读接入 `getV2EvidenceSummary`，用于展示“真实证据摘要 + mock 推荐素材”。本阶段不接 `case-assets`，不接 `ai-assistant`，不接 `contract-to-project`，不打开工作台入口，不部署云函数，不上传体验版，不进入 Phase 5B-4。

## 2. 当前 HEAD / tag

阶段起点 commit：

```text
364d8cbf225b3e5c8673104aa58fde0379ceeb3d
```

阶段起点 tag：

```text
v2-deal-loop-phase5b2e-frontend-acceptance-checklist
```

当前分支：

```text
codex/init-ai-collaboration
```

## 3. 本阶段目标

在 `trust-materials` 页面增加真实证据摘要展示区：

1. 客户字段继续只读来自 `getCustomer`。
2. 证据摘要只读来自 `getV2EvidenceSummary`。
3. 推荐素材继续使用本地 mock。
4. 页面明确展示“真实客户字段 + 真实证据摘要 + Mock 推荐素材”。
5. 证据摘要读取失败时，不冒充真实证据。
6. 不展示原始图片、日报正文、人员隐私或内部信息。

## 4. 修改文件列表

```text
miniprogram/subpackages/deal-loop/pages/trust-materials/trust-materials.js
miniprogram/subpackages/deal-loop/pages/trust-materials/trust-materials.wxml
miniprogram/subpackages/deal-loop/pages/trust-materials/trust-materials.wxss
miniprogram/subpackages/deal-loop/utils/evidenceSummaryAdapter.js
AI_TASKS/V2_DEAL_LOOP_PHASE5B3_TRUST_MATERIALS_EVIDENCE_SUMMARY.md
```

未修改：

```text
cloudfunctions/
miniprogram/app.json
工作台入口
tabBar
case-assets
ai-assistant
contract-to-project
customer-detail
pipeline
project.config.json
project.private.config.json
```

## 5. 前端接入范围

本阶段只接入：

```text
miniprogram/subpackages/deal-loop/pages/trust-materials/
```

新增只读 adapter：

```text
miniprogram/subpackages/deal-loop/utils/evidenceSummaryAdapter.js
```

adapter 只负责把 `getV2EvidenceSummary` 返回的安全摘要转换为展示文案，不读取数据库，不请求网络，不写入数据。

本阶段未接入：

```text
case-assets
ai-assistant
contract-to-project
customer-detail
pipeline
```

## 6. 云函数调用范围

本阶段新增调用：

```js
wx.cloud.callFunction({
  name: 'getV2EvidenceSummary',
  data: { customerId }
})
```

说明：

1. `customerId` 来自页面 query 或当前客户上下文。
2. 本阶段没有传 `projectId`，避免凭空构造项目上下文。
3. 未新增其它云函数调用。
4. 未调用 `createProject`。
5. 未调用真实 AI API。
6. 未调用 `getTempFileURL`。
7. 未写数据库。

当前页面原有的 `getCustomer` 仍用于读取客户字段和校验客户上下文。

## 7. 展示字段白名单

页面只展示摘要字段：

```text
projectSummary.projectCount
projectSummary.activeProjectCount
projectSummary.completedProjectCount
projectSummary.latestStage
evidenceSummary.approvedStageCount
evidenceSummary.ownerVisiblePhotoCount
evidenceSummary.renderDrawingCount
evidenceSummary.warrantyCardCount
evidenceSummary.afterSalesTicketCount
evidenceSummary.afterSalesClosedCount
evidenceSummary.stageCoverage
evidenceSummary.availableProofTypes
evidenceSummary.dataConfidenceLevel
evidenceSummary.evidenceCompletenessScore
authorizationSummary.hasApprovedCase
authorizationSummary.canUseForMarketing
authorizationSummary.allowedPlatforms
authorizationSummary.allowedMaterials
authorizationSummary.blockedReasons
recommendedUse.internalTrustMaterials
recommendedUse.publicCaseAssets
recommendedUse.blockedReasons
privacyGuard
```

页面文案使用：

```text
真实证据摘要
只读摘要
仅内部参考，暂不可公开发布
可公开使用
示例推荐素材
```

## 8. 禁止展示字段黑名单

页面不得展示：

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

本阶段没有读取或展示原始素材文件。

`evidenceSummaryAdapter` 对证据类型和公开渠道做已知枚举映射，未知值不会直接透出到页面。

## 9. 错误码处理

前端只处理这些对外错误码：

```text
UNAUTHENTICATED
FORBIDDEN
NOT_FOUND
NO_EVIDENCE
NO_MARKETING_AUTHORIZATION
READ_FAILED
```

展示规则：

| code | 页面语义 |
| --- | --- |
| `UNAUTHENTICATED` | 请先登录后再查看证据摘要 |
| `FORBIDDEN` | 当前账号暂无查看证据摘要权限 |
| `NOT_FOUND` | 未找到可用工地证据，请返回客户列表重新打开 |
| `NO_EVIDENCE` | 暂无可用证据摘要，可继续使用示例素材 |
| `NO_MARKETING_AUTHORIZATION` | 可内部参考，暂不可公开发布 |
| `READ_FAILED` | 证据摘要读取失败，请稍后重试 |

页面不展示内部错误码：

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

## 10. fallback 规则

本阶段遵守：

1. 有真实 `customerId` 时，证据摘要读取失败不会 fallback 到其它客户。
2. `NOT_FOUND` 不会 fallback 到默认 mock 客户。
3. `NO_EVIDENCE` 可以继续展示 mock 推荐素材，但页面标明“示例推荐素材”。
4. `READ_FAILED` 只显示证据摘要读取失败，不冒充真实证据。
5. `NO_MARKETING_AUTHORIZATION` 不阻断内部摘要展示。
6. 未公开授权时，不展示“小红书/抖音/官网/GEO 可直接使用”。
7. mock 发送按钮仍然只弹窗，不请求 API，不写库。

## 11. NO_MARKETING_AUTHORIZATION 处理

`NO_MARKETING_AUTHORIZATION` 不是系统错误。

页面展示语义：

```text
仅内部参考，暂不可公开发布
```

含义：

1. 可以看内部可信证据摘要。
2. 不可以包装为公开案例素材。
3. 不可以提示小红书可直接使用。
4. 不可以提示抖音可直接使用。
5. 不可以提示官网案例可直接使用。
6. 不可以提示 GEO 可直接使用。

## 12. 入口开关确认

已确认本阶段没有修改工作台入口。

入口开关保持：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

本阶段未修改：

```text
miniprogram/pages/workbench/
miniprogram/app.json
tabBar
```

## 13. 测试结果

已执行：

```bash
node --check miniprogram/subpackages/deal-loop/pages/trust-materials/trust-materials.js
node --check miniprogram/subpackages/deal-loop/utils/evidenceSummaryAdapter.js
git diff --check
```

结果：

```text
通过
```

静态检查结果：

1. 未修改 `cloudfunctions/`。
2. 未修改 `app.json`。
3. 未修改工作台入口。
4. 未修改 tabBar。
5. 未修改 `case-assets / ai-assistant / contract-to-project / customer-detail / pipeline`。
6. 未新增 `db.collection / cloud.database / wx.request`。
7. 未新增 `createProject / submitStageLog / reviewStageLog`。
8. 未新增 `getTempFileURL`。
9. 未新增真实 AI API。
10. 未展示敏感字段。
11. `ENABLE_V2_DEAL_LOOP_ENTRY = false`。

## 14. 风险点

1. 当前仍未部署云函数，开发者工具如未部署该函数会进入读取失败提示。
2. `NO_MARKETING_AUTHORIZATION` 与摘要展示共存，人工验收时要确认页面没有公开营销误导。
3. 页面仍保留 mock 推荐素材，必须确认用户能看出它是示例素材。
4. 如果未来接入 `case-assets`，必须重新审计公开授权边界。
5. 如果未来打开工作台入口，必须另走灰度入口验收。

## 15. 人工验收步骤

开发者工具直达：

```text
subpackages/deal-loop/pages/trust-materials/trust-materials
```

query：

```text
customerId=<真实客户ID>
```

验收清单：

1. 页面客户姓名与真实客户一致。
2. 页面显示“真实证据摘要”区域。
3. 数据源显示“真实客户字段 + 真实证据摘要 + Mock 推荐素材”或清晰错误状态。
4. 有证据摘要时只展示数量、等级、阶段覆盖和授权状态。
5. 无证据时显示“暂无可用证据摘要，可继续使用示例素材”。
6. 无公开授权时显示“仅内部参考，暂不可公开发布”。
7. 页面不展示手机号、openid、图片链接、日报正文、员工姓名。
8. mock 素材区标题为“示例推荐素材”。
9. mock 发送按钮只弹窗。
10. `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
11. 未部署云函数。
12. 未上传体验版。

## 16. 是否建议进入下一阶段

不建议立即进入下一阶段。

建议先人工验收 Phase 5B-3 的页面展示和错误态，尤其是：

1. `NO_MARKETING_AUTHORIZATION` 是否被正确理解。
2. `NO_EVIDENCE` 是否没有被当成系统错误。
3. mock 推荐素材是否标识清楚。
4. 入口开关是否保持关闭。

验收通过后，再决定是否进入 Phase 5B-4。
