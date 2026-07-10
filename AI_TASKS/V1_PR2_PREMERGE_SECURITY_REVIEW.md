# Phase 7-SEC-2：PR #2 合并前安全审查

## 1. 审查结论先行

- PR：https://github.com/qixin-portfolio/transparent-construction-miniapp/pull/2
- 审查结论：**C：需要补充代码修改后再审**
- PR 当前状态：OPEN，未合并
- 当前 V2 状态：`ENABLE_V2_DEAL_LOOP_ENTRY = false`
- 本阶段未修改业务代码、未部署云函数、未上传体验版、未发布正式版、未执行数据库写入或迁移。

### 合并阻塞项

1. `dailySummary` 强制读取 `OPENID`，定时触发没有用户身份时会直接失败。
2. `reviewStageLog` 的 pending 检查、状态更新、项目进度更新不在同一事务中；并发审核仍可能重复通知，项目进度也可能被较低值覆盖。
3. `getCompletionAlbum` 虽裁剪了 `project.name`，但 `album.title` 仍直接拼接原始项目名，未授权 `house_info` 的公开分享仍可能泄露小区或项目名称。
4. `bindStaffRole` 等邀请码错误次数更新不是原子操作，并发猜码可丢失计数，5 次锁定不能作为可靠限流。
5. `listPublicCases` 仍无条件返回 `planType`、`designHighlights`、`deliveredAt`，这些字段没有对应的业主授权选项。

### 合并前需要明确但不一定必须编码的事项

- 完工纪念册分享凭证支持撤销，但没有有效期；需明确“永久有效直到撤销”是否为产品规则。
- 新后端会让所有旧的无 `shareToken` 纪念册链接失效，需确认是否接受并制定重新分享方案。
- 需要先清点生产数据中非默认租户的空 `tenantId` 记录；存在时必须先补数据或确认放弃访问。

### P0 / P1 分级

- P0：`dailySummary` 定时触发回归；`reviewStageLog` 并发重复审核与进度覆盖；`getCompletionAlbum` 未授权公开标题泄露。
- P1：邀请码限流非原子；公开案例授权字段不完整；分享 token 无有效期；旧链接切换；生产空 tenantId 数据盘点；数据库和云存储规则核验。

## 2. PR 基线与提交范围

### PR base / head

- Base branch：`codex/init-ai-collaboration`
- Base commit：`4da678dff8797dc76287b38559555586c1ca8833`
- PR branch：`codex/v1-security-hardening`
- PR head commit：`bf046dbd747f028bebb8f2264474f549b3f26d4a`
- GitHub 状态：PR OPEN，mergeable 为 MERGEABLE，无 CI check 记录，无 review decision。

### PR 全部 commit

1. `69cfbd6899fce54f923335b8b7490cfbccb77b1d`：`fix: harden V1 authorization and tenant isolation`
2. `bf046dbd747f028bebb8f2264474f549b3f26d4a`：`docs: record V1 security hardening PR`

### 为什么“代码 commit”和“当前 HEAD”不同

`69cfbd6` 包含全部业务安全修复、依赖固定、前端分享改动和测试。随后新增 `bf046dbd`，只更新 `AI_TASKS/current.md` 和 `AI_TASKS/handoff.md` 中的 commit / PR 归档信息。因此 PR 当前 HEAD 比代码 commit 多一个纯文档提交，业务代码没有二次变化。

### 69cfbd6 到 bf046dbd 的变化

- 仅修改：`AI_TASKS/current.md`
- 仅修改：`AI_TASKS/handoff.md`
- 变化量：6 insertions，4 deletions
- 不包含业务代码、云函数或前端变化。

### 总体变化

- 123 files changed
- 1418 insertions
- 498 deletions
- 目录分布：`AI_TASKS/` 2 个、`cloudfunctions/` 118 个、`miniprogram/` 2 个、`tests/` 1 个。

## 3. 全部修改文件清单

### 文档

```text
AI_TASKS/current.md
AI_TASKS/handoff.md
```

### 云函数业务文件（56 个）

```text
cloudfunctions/adminUpdateTenantPlan/index.js
cloudfunctions/aiGenerateOwnerSummary/index.js
cloudfunctions/bindOwnerProject/index.js
cloudfunctions/bindStaffRole/index.js
cloudfunctions/bindWorkerProject/index.js
cloudfunctions/createAfterSalesTicket/index.js
cloudfunctions/createCustomer/index.js
cloudfunctions/createOwnerBindCode/index.js
cloudfunctions/createProject/index.js
cloudfunctions/createReferralRecord/index.js
cloudfunctions/createStaffInviteCode/index.js
cloudfunctions/createWorkerProjectBindCode/index.js
cloudfunctions/dailySummary/index.js
cloudfunctions/deleteCustomer/index.js
cloudfunctions/deleteDesignDrawing/index.js
cloudfunctions/deleteProject/index.js
cloudfunctions/deleteStaffMember/index.js
cloudfunctions/deliverProject/index.js
cloudfunctions/generateStageLogDraft/index.js
cloudfunctions/getAfterSalesTicket/index.js
cloudfunctions/getBossDashboard/index.js
cloudfunctions/getCaseAuthorization/index.js
cloudfunctions/getCompletedOwnerHome/index.js
cloudfunctions/getCompletionAlbum/index.js
cloudfunctions/getCustomer/index.js
cloudfunctions/getOwnerArchive/index.js
cloudfunctions/getOwnerPortal/index.js
cloudfunctions/getOwnerProject/index.js
cloudfunctions/getProjectDetail/index.js
cloudfunctions/getWarrantyCard/index.js
cloudfunctions/listAfterSalesTickets/index.js
cloudfunctions/listCustomerBenefits/index.js
cloudfunctions/listCustomers/index.js
cloudfunctions/listDesignDrawings/index.js
cloudfunctions/listMyProjects/index.js
cloudfunctions/listOwnerProjects/index.js
cloudfunctions/listPendingStageLogs/index.js
cloudfunctions/listPublicCases/index.js
cloudfunctions/listStaffInviteCodes/index.js
cloudfunctions/listStaffMembers/index.js
cloudfunctions/listWorkerCheckins/index.js
cloudfunctions/login/index.js
cloudfunctions/recordWorkerCheckin/index.js
cloudfunctions/reviewStageLog/index.js
cloudfunctions/seedCustomerBenefits/index.js
cloudfunctions/sendOwnerNotice/index.js
cloudfunctions/sendWecomNotice/index.js
cloudfunctions/submitOwnerSupplement/index.js
cloudfunctions/submitStageLog/index.js
cloudfunctions/unbindOwner/index.js
cloudfunctions/updateAfterSalesTicket/index.js
cloudfunctions/updateCaseAuthorization/index.js
cloudfunctions/updateCustomer/index.js
cloudfunctions/updateDesignDrawing/index.js
cloudfunctions/updateStaffMember/index.js
cloudfunctions/uploadDesignDrawing/index.js
```

### 云函数依赖文件（62 个）

以下文件均把 `wx-server-sdk` 固定为 `2.6.3`：

```text
cloudfunctions/adminUpdateTenantPlan/package.json
cloudfunctions/aiGenerateOwnerSummary/package.json
cloudfunctions/bindOwnerProject/package.json
cloudfunctions/bindStaffRole/package.json
cloudfunctions/bindWorkerProject/package.json
cloudfunctions/createAfterSalesTicket/package.json
cloudfunctions/createCustomer/package.json
cloudfunctions/createOwnerBindCode/package.json
cloudfunctions/createProject/package.json
cloudfunctions/createReferralRecord/package.json
cloudfunctions/createStaffInviteCode/package.json
cloudfunctions/createWorkerProjectBindCode/package.json
cloudfunctions/dailySummary/package.json
cloudfunctions/deleteCustomer/package.json
cloudfunctions/deleteDesignDrawing/package.json
cloudfunctions/deleteProject/package.json
cloudfunctions/deleteStaffMember/package.json
cloudfunctions/deliverProject/package.json
cloudfunctions/generateStageLogDraft/package.json
cloudfunctions/getAfterSalesTicket/package.json
cloudfunctions/getBossDashboard/package.json
cloudfunctions/getCaseAuthorization/package.json
cloudfunctions/getCompletedOwnerHome/package.json
cloudfunctions/getCompletionAlbum/package.json
cloudfunctions/getCurrentTenantPlan/package.json
cloudfunctions/getCustomer/package.json
cloudfunctions/getOwnerArchive/package.json
cloudfunctions/getOwnerPortal/package.json
cloudfunctions/getOwnerProject/package.json
cloudfunctions/getProjectDetail/package.json
cloudfunctions/getTenantBranding/package.json
cloudfunctions/getV2EvidenceSummary/package.json
cloudfunctions/getWarrantyCard/package.json
cloudfunctions/initSaasDefaults/package.json
cloudfunctions/listAfterSalesTickets/package.json
cloudfunctions/listCustomerBenefits/package.json
cloudfunctions/listCustomers/package.json
cloudfunctions/listDesignDrawings/package.json
cloudfunctions/listMyProjects/package.json
cloudfunctions/listOwnerProjects/package.json
cloudfunctions/listPendingStageLogs/package.json
cloudfunctions/listPublicCases/package.json
cloudfunctions/listStaffInviteCodes/package.json
cloudfunctions/listStaffMembers/package.json
cloudfunctions/listWorkerCheckins/package.json
cloudfunctions/login/package.json
cloudfunctions/recordWorkerCheckin/package.json
cloudfunctions/registerTenant/package.json
cloudfunctions/reviewStageLog/package.json
cloudfunctions/seedCustomerBenefits/package.json
cloudfunctions/sendOwnerNotice/package.json
cloudfunctions/sendWecomNotice/package.json
cloudfunctions/submitOwnerSupplement/package.json
cloudfunctions/submitStageLog/package.json
cloudfunctions/unbindOwner/package.json
cloudfunctions/updateAfterSalesTicket/package.json
cloudfunctions/updateCaseAuthorization/package.json
cloudfunctions/updateCustomer/package.json
cloudfunctions/updateDesignDrawing/package.json
cloudfunctions/updateMyProfile/package.json
cloudfunctions/updateStaffMember/package.json
cloudfunctions/uploadDesignDrawing/package.json
```

### 小程序前端

```text
miniprogram/subpackages/owner/pages/completion-album/completion-album.js
miniprogram/subpackages/owner/pages/completion-album/completion-album.wxml
```

### 新增测试文件

```text
tests/security-regression.test.js
```

## 4. 逐风险审查

### 4.1 sendWecomNotice 鉴权

- 原风险：任何能调用云函数的人都可使用服务端企业微信 webhook 发送任意内容。
- 修复方式：使用 `cloud.getWXContext()` 识别调用者，查询 active user，并限制 `admin / boss_qi / boss_hu`；内容限制 2000 字。
- 修改文件：`cloudfunctions/sendWecomNotice/index.js`。
- 测试覆盖：只用正则确认存在 `getWXContext` 和角色白名单，没有执行函数或模拟用户。
- 正常业务回归风险：无 OPENID 的后台调用会失败；所有租户老板共用同一个 `WECOM_WEBHOOK_URL`，SaaS 场景仍可能把非默认租户消息发到同一个群。
- 结论：**需人工验证**。当前单企业使用可接受；SaaS 化前需 tenant 级 webhook 或仅允许默认租户。

### 4.2 sendOwnerNotice 鉴权与 miniprogramState

- 原风险：缺少调用者鉴权；日报与项目不匹配也可能发送；未审核日报可能通知业主；消息指向 trial 版。
- 修复方式：增加管理员角色校验、project / stageLog / tenant / approved / ownerVisible 校验；`miniprogramState` 改为 `formal`。
- 修改文件：`cloudfunctions/sendOwnerNotice/index.js`。
- 测试覆盖：正则确认校验函数和 `formal` 字符串，未调用微信订阅消息 API。
- 正常业务回归风险：体验版测试消息会打开正式版；旧调用若未传 `stageLogId` 会从容错发送变成拒绝；`ownerOpenids` 内重复值仍可能重复发送。
- 结论：**需人工验证**。安全方向正确，需使用已订阅测试业主验证模板字段、正式版跳转和多人业主去重。

### 4.3 dailySummary 租户范围和定时任务身份

- 原风险：统计未按 tenant 隔离，可汇总其他企业数据。
- 修复方式：增加管理员身份校验，并按调用者 tenant 查询 pending 日报和未完成任务。
- 修改文件：`cloudfunctions/dailySummary/index.js`。
- 测试覆盖：只确认源码存在身份和角色关键词。
- 正常业务回归风险：`getAllowedCaller()` 在没有 `OPENID` 时直接报错。微信云函数定时触发通常没有前端用户 OPENID，因此现有定时任务若存在，部署后会停止工作。本地仓库没有触发器配置，无法确认线上是否已配置定时触发。
- 结论：**需修改**。必须设计可信的定时任务入口和明确 tenant 来源；修复前禁止部署 `dailySummary`。

### 4.4 seedCustomerBenefits 鉴权

- 原风险：公开可调用的种子函数可批量写入或覆盖权益数据。
- 修复方式：增加管理员角色校验，按调用者 tenant upsert。
- 修改文件：`cloudfunctions/seedCustomerBenefits/index.js`。
- 测试覆盖：仅源码正则。
- 正常业务回归风险：调用即写库；默认租户调用会把匹配到的历史空 tenant 权益归入默认 tenant；现有更新仍会重写权益固定文案。
- 结论：**通过鉴权，需人工验证写入结果**。不应纳入常规部署后自动执行，必须保留单独 Human Gate。

### 4.5 getCompletionAlbum 分享凭证、撤销、过期和敏感字段

- 原风险：仅凭 projectId 即可外部访问完工纪念册，分享不可撤销，并可能返回原始 fileID 和过多授权记录字段。
- 修复方式：业主或同租户管理员可私有访问；外部访问必须同时提供授权记录 ID 作为 `shareToken`；每次读取授权记录并验证 public + approved + tenant + project；撤销授权后旧 token 失效；按 `allowedMaterials` 裁剪房屋信息和照片；不回传原始 fileID；授权对象被裁剪。
- 修改文件：`cloudfunctions/getCompletionAlbum/index.js`、`miniprogram/subpackages/owner/pages/completion-album/completion-album.js`、`.wxml`。
- 测试覆盖：正则确认 token、授权范围、字段裁剪和不回退 fileID；没有真实分享、撤销或游客访问测试。
- 正常业务回归风险：
  - 旧分享链接只有 `projectId&share=1`，部署新后端后全部失效。
  - token 没有 `expiresAt` 校验，当前规则是永久有效直到撤销。
  - `album.title` 仍使用原始 `project.name`，即便未授权 `house_info` 仍可能泄露小区/项目名（`getCompletionAlbum/index.js:376`）。
  - 云函数部署会立即影响正式版旧客户端，而前端新代码要经过体验版和发布流程，存在前后端切换窗口。
- 结论：**需修改**。必须修复标题泄露，并明确 token 有效期和旧链接切换策略。

### 4.6 listPublicCases 云端返回字段裁剪

- 原风险：公开案例可能无条件返回小区、户型、面积、风格、预算、照片及原始 fileID。
- 修复方式：按 `house_info / budget / completion_photos / process_photos` 裁剪主要字段和照片；授权必须 public + approved；验证授权 tenant 与 project tenant；临时链接失败时不回传 fileID。
- 修改文件：`cloudfunctions/listPublicCases/index.js`。
- 测试覆盖：正则确认主要条件字段和 tenant helper，没有执行返回值断言。
- 正常业务回归风险：`planType`、`designHighlights`、`deliveredAt` 仍无条件返回，但授权页面没有这些独立选项；`budget` 代码存在但授权页面没有预算选项，实际业主无法主动勾选。
- 结论：**需修改**。应建立服务端允许字段白名单，并让前后端授权选项一致。

### 4.7 adminUpdateTenantPlan 本 tenant 限制

- 原风险：普通企业管理员可传任意 tenantId 修改其他企业套餐。
- 修复方式：仅 `platform_admin / super_admin` 可跨 tenant；普通管理员只允许 `tenantId === user.tenantId`；未传 tenantId 时使用当前用户 tenant。
- 修改文件：`cloudfunctions/adminUpdateTenantPlan/index.js`。
- 测试覆盖：正则确认平台角色和 `CROSS_TENANT_FORBIDDEN`，没有模拟不同角色调用。
- 正常业务回归风险：旧调用若依赖普通管理员代管其他 tenant 会被拒绝，这是预期安全收紧；subscriptions 与 tenants 两次写入仍非事务，可能部分成功，此问题不是本 PR 新增。
- 结论：**通过，需人工角色矩阵验证**。

### 4.8 reviewStageLog pending、幂等、进度和通知

- 原风险：重复审核可重复写状态和通知；旧日报可能让项目进度倒退；项目归属校验不足。
- 修复方式：仅 pending 可审核；校验日报和项目 tenant；进度使用 `Math.max`；审核函数内部直接发送正式版订阅消息。
- 修改文件：`cloudfunctions/reviewStageLog/index.js`。
- 测试覆盖：正则确认 pending 错误码、`Math.max`、项目 tenant 和直接发送 API。
- 正常业务回归风险：
  - 读取 pending、更新日报、更新照片、更新项目均不在事务中；两个并发审核都可能通过读取检查并各自发送通知。
  - 两个不同进度日报并发审核时都基于旧 project.progress 计算，较低进度写入若最后完成，仍可覆盖较高进度。
  - 日报已更新但照片或项目更新失败时会出现部分状态。
  - 通知发送失败只记录日志，前端仍显示审核成功，属于当前设计但需确认。
- 结论：**需修改**。pending 状态转换和项目进度至少应在事务中完成，通知应仅由事务成功后的唯一审核者发送。

### 4.9 空 tenantId 兼容

- 原风险：所有 tenant 都使用 `_.in([tenantId, '', null])`，非默认租户可能读写默认历史数据。
- 修复方式：只有 `tenant_shengjing_default` 查询空 tenant；非默认租户只匹配精确 tenant；按 ID 读取使用 `tenantMatches`。
- 修改文件：30 多个 V1 云函数。
- 测试覆盖：全仓库正则扫描和指定文件 helper 存在检查；未用样例数据执行查询。
- 正常业务回归风险：如果生产库已经存在“实际属于非默认租户但 tenantId 为空”的数据，部署后这些数据会立刻不可见或不可操作。
- 结论：**通过静态审查，部署前必须做只读数据盘点**。

### 4.10 bindStaffRole 邀请码角色、并发和限流

- 原风险：邀请码重复兑换存在并发窗口；错误猜码无限制；tenant 边界不完整。
- 修复方式：角色限制使用 `INVITABLE_ROLES`；事务内重新读取 active code 并写 user + code；5 次失败锁定 15 分钟；验证 code tenant。
- 修改文件：`cloudfunctions/bindStaffRole/index.js`，同类改动还包括 `bindOwnerProject`、`bindWorkerProject`。
- 测试覆盖：只确认存在 `runTransaction` 和 tenant helper，没有执行并发或锁定测试。
- 正常业务回归风险：
  - `recordCodeFailure` 基于函数开始时读取的 user 计数，在事务外直接 update；并发猜码会丢失增量，限流可被绕过。
  - 三类邀请码共用 user 的 `codeFailedAttempts / codeLockedUntil`，一种绑定码输错会影响其他绑定流程。
  - 非默认租户的历史空 tenantId 邀请码会失效，需要补 tenantId 或重新生成。
- 结论：**需修改**。兑换事务有效，但限流不能视为已完成。

### 4.11 aiGenerateOwnerSummary / generateStageLogDraft 部署边界

- 原风险：只要环境中存在 Key 就可能调用真实外部 AI。
- 修复方式：必须显式设置 `ENABLE_REAL_AI_API === 'true'` 才允许外部请求。
- 修改文件：`cloudfunctions/aiGenerateOwnerSummary/index.js`、`cloudfunctions/generateStageLogDraft/index.js`。
- 测试覆盖：只确认源码中存在开关和严格等于 `true`。
- 正常业务回归风险：
  - `aiGenerateOwnerSummary` 被老板审核页的“AI 摘要”按钮直接调用；部署后未配置新开关时按钮必然返回“AI 服务未配置”。
  - `generateStageLogDraft` 未配置开关时会降级本地规则，主流程仍可继续，但输出会从真实 AI 变成本地整理。
- 结论：**需人工验证，排除出本轮安全部署**。需单独决定是否关闭 UI、启用真实 AI 或保留本地 fallback。

### 4.12 数据库和云存储安全规则

- 原风险：即使云函数鉴权正确，数据库或云存储规则过宽仍可能允许小程序端直连绕过。
- 修复方式：PR 未修改规则。
- 修改文件：无。
- 测试覆盖：无。仓库未找到可确认生产规则的安全规则文件。
- 正常业务回归风险：无法从本地代码判断线上规则是否限制读写，也无法确认云文件 URL、上传目录和临时链接权限。
- 结论：**需人工验证**。必须在微信云开发控制台核对生产数据库和云存储权限。

## 5. 历史数据兼容审查

### 空 tenantId

- 默认租户历史空数据：代码继续兼容，不强制迁移。
- 非默认租户历史空数据：新代码会拒绝访问；如果存在，部署前必须回填正确 tenantId。
- 当前未连接生产数据库，无法确认数量。
- 建议迁移：先只读统计各集合空 tenantId 数量及业务归属，人工确认后再单独执行迁移，不在本阶段执行。

### 旧完工纪念册分享链接

- 旧链接没有 `shareToken`，新 `getCompletionAlbum` 会拒绝外部访问。
- 不需要修改历史业务记录，但需要业主重新保存公开授权并重新分享。
- 若必须兼容旧链接，需要额外设计一次性迁移或过渡策略；不能继续仅凭 projectId 公开访问。

### 旧邀请码

- 默认租户空 tenantId 邀请码仍可兼容。
- 非默认租户空 tenantId 邀请码会被拒绝。
- 建议在部署前使旧码过期并重新生成，或经人工确认后回填 tenantId。

### 旧日报状态

- `reviewStatus` 缺失时按 pending 处理，兼容旧日报。
- rejected / approved 日报会被拒绝重复审核，符合新规则。
- 非默认租户且 tenantId 为空的旧日报仍需迁移。

### 旧套餐调用参数

- 普通管理员不传 tenantId：改用当前 user.tenantId，兼容。
- 普通管理员传自己的 tenantId：兼容。
- 普通管理员传其他 tenantId：现在拒绝，属于预期安全变化。
- 平台管理员跨 tenant：继续支持。
- 无数据库字段迁移要求，但需人工验证现有后台调用者角色。

## 6. 20 个测试的真实性与类型

结论：20 个测试全部使用 Node `node:test` 读取源码文本，再用正则或字符串断言检查。它们不是云函数行为测试，不执行数据库查询、事务、微信订阅 API、HTTP 请求或页面逻辑。

| # | 测试名称 | 验证方式 | 类型 |
|---|---|---|---|
| 1 | sensitive notification and seed functions authenticate callers | 搜索 `getWXContext` 和角色常量 | 静态正则 |
| 2 | owner notifications validate the stage log and target the formal mini program | 搜索校验函数和 `formal` | 静态正则 |
| 3 | completion album requires owner access or a revocable public share token | 搜索 token、授权、字段裁剪和 fileID 回退 | 静态正则 |
| 4 | public cases omit house and budget fields unless explicitly authorized | 搜索条件表达式和 tenant helper | 静态正则 |
| 5 | tenant administrators cannot update another tenant plan | 搜索平台角色和错误码 | 静态正则 |
| 6 | stage log review is pending-only and project progress is monotonic | 搜索 pending 错误码、`Math.max` | 静态正则 |
| 7 | non-default tenants never inherit blank legacy tenant records | 扫描所有云函数中的危险查询写法 | 静态代码扫描 |
| 8 | direct resource checks reject blank legacy tenants outside the default tenant | 检查指定文件存在 tenant helper | 静态代码扫描 |
| 9 | invite code redemptions use database transactions | 搜索 `runTransaction` 和 tenant helper | 静态正则 |
| 10 | real AI network calls are opt-in and disabled by default | 搜索 AI 开关严格等于 true | 静态正则 |
| 11 | cloud function SDK versions are pinned | 解析 package.json 并比较版本字符串 | 静态配置测试 |
| 12 | review sends owner notifications inside the authenticated review function | 搜索直接发送 API，排除嵌套云函数调用 | 静态正则 |
| 13 | project creation commits the project and initial membership atomically | 搜索事务集合写入调用 | 静态正则 |
| 14 | project delivery uses an atomic transaction and deterministic warranty id | 搜索事务和确定性 ID helper | 静态正则 |
| 15 | project deletion scans all records and reports cleanup failures | 搜索分页 helper、错误字段并排除固定 limit | 静态正则 |
| 16 | an empty database never promotes the first visitor to administrator | 排除首用户管理员逻辑文本 | 静态正则 |
| 17 | referrals require an owner-bound project | 搜索 projectId 必填判断 | 静态正则 |
| 18 | design drawing metadata and project timestamp commit atomically | 搜索事务集合写入调用 | 静态正则 |
| 19 | stage log and photo metadata commit atomically | 搜索事务集合写入调用 | 静态正则 |
| 20 | V2 deal loop remains disabled | 搜索两个 `ENABLE_V2_DEAL_LOOP_ENTRY = false` | 静态正则 |

### 测试类型统计

- 行为测试：0
- 真正的函数级单元测试：0
- 数据库模拟测试：0
- 并发测试：0
- 云函数集成测试：0
- 微信订阅消息模拟测试：0
- 真机测试：0
- 静态源码 / 正则 / 配置测试：20

### 尚未被真实运行覆盖的高风险点

- 定时任务无 OPENID 的调用。
- 两人同时审核同一日报。
- 两条不同进度日报同时审核。
- 两人同时兑换同一个邀请码。
- 并发错误猜码是否真的在第 5 次锁定。
- owner / boss / 外部游客三类纪念册访问。
- 授权撤销后旧链接是否立即失效。
- 无 `house_info` 授权时完整返回体是否无敏感字段。
- 旧无 token 分享链接的用户体验。
- 微信正式版订阅消息模板字段和跳转。
- 62 个云函数使用 `wx-server-sdk 2.6.3` 的真实云端兼容性。
- 数据库和云存储生产安全规则。

## 7. 部署清单

### A. 修复阻塞项后必须部署的云函数

这些函数的 `index.js` 有安全或一致性变化，只有部署后线上才生效：

```text
adminUpdateTenantPlan
bindOwnerProject
bindStaffRole
bindWorkerProject
createAfterSalesTicket
createCustomer
createOwnerBindCode
createProject
createReferralRecord
createStaffInviteCode
createWorkerProjectBindCode
deleteCustomer
deleteDesignDrawing
deleteProject
deleteStaffMember
deliverProject
getAfterSalesTicket
getBossDashboard
getCaseAuthorization
getCompletedOwnerHome
getCompletionAlbum
getCustomer
getOwnerArchive
getOwnerPortal
getOwnerProject
getProjectDetail
getWarrantyCard
listAfterSalesTickets
listCustomerBenefits
listCustomers
listDesignDrawings
listMyProjects
listOwnerProjects
listPendingStageLogs
listPublicCases
listStaffInviteCodes
listStaffMembers
listWorkerCheckins
login
recordWorkerCheckin
reviewStageLog
sendOwnerNotice
sendWecomNotice
submitOwnerSupplement
submitStageLog
unbindOwner
updateAfterSalesTicket
updateCaseAuthorization
updateCustomer
updateDesignDrawing
updateStaffMember
uploadDesignDrawing
```

以上云函数一旦部署会立即影响正式线上用户，尤其是登录、项目创建/删除/交付、日报提交/审核、业主读取、售后、绑定码和公开分享相关函数。不得一次性盲目全量部署，应按链路分批并保留回滚版本。

### B. 有前端修改，需要上传小程序体验版

- 必须上传小程序代码包，因为完工纪念册页面新增 `shareToken`、授权入口和房屋信息显示控制。
- 体验版至少需要验证：私有访问、公开分享、撤销、未授权字段、旧链接、空照片、业主和游客路径。
- `getCompletionAlbum` 后端不能提前独立部署到生产，否则正式版旧分享链接会立即失效，而新前端尚未发布。

### C. 不应在本轮部署的函数

```text
dailySummary
aiGenerateOwnerSummary
generateStageLogDraft
seedCustomerBenefits
```

- `dailySummary`：先修定时任务身份。
- `aiGenerateOwnerSummary`：会直接影响审核页 AI 摘要按钮。
- `generateStageLogDraft`：会改变日报整理 provider，需独立体验验证。
- `seedCustomerBenefits`：写库种子函数，只在单独 Human Gate 下部署和人工调用。

仅修改 package.json、没有修改 index.js 的函数也不应为了依赖固定单独部署：

```text
getCurrentTenantPlan
getTenantBranding
getV2EvidenceSummary
initSaasDefaults
registerTenant
updateMyProfile
```

其中 `getV2EvidenceSummary` 属于关闭中的 V2，`initSaasDefaults` 是高风险初始化函数。

### D. 需要先处理数据迁移才能部署的函数

没有可无条件断言的迁移，因为尚未读取生产数据。以下条件成立时必须先迁移：

- 非默认租户存在空 tenantId 项目、客户、日报、照片、图纸、工单、成员、邀请码或授权记录。
- 非默认租户仍在使用空 tenantId 的旧邀请码。

涉及范围是所有 tenant 隔离改动函数。先做只读盘点，再开独立迁移阶段；本阶段不执行。

### E. 只修改测试或文档，无需部署

```text
AI_TASKS/current.md
AI_TASKS/handoff.md
tests/security-regression.test.js
```

## 8. 合并 Gate

### 合并前必须完成

1. 修复 `dailySummary` 定时触发身份和 tenant 来源，或从 PR 移除该业务改动。
2. 把 `reviewStageLog` pending 状态转换和项目进度更新改为并发安全，防止重复通知和进度覆盖。
3. 修复 `getCompletionAlbum` 公开返回中的 `album.title` 项目名泄露。
4. 明确分享 token 是否需要有效期；若需要，补 `expiresAt` 校验。
5. 收紧 `listPublicCases` 的 `planType / designHighlights / deliveredAt`，并统一前后端授权选项。
6. 将邀请码失败计数改为原子限流，或明确本轮不宣称具备防爆破能力。
7. 为上述阻塞点补最小行为测试；不能继续只增加正则存在性测试。

### 合并后、部署前必须完成

1. 只读盘点生产库空 tenantId 数据，按 tenant 和集合记录数量。
2. 核对线上 `dailySummary` 是否配置定时触发。
3. 核对生产数据库和云存储安全规则。
4. 明确旧纪念册链接失效处理和业主重新分享流程。
5. 确认 `wx-server-sdk 2.6.3` 在云端事务 API 上可运行。
6. 制定分批部署顺序、回滚版本和监控项。
7. 明确排除 AI 两函数、dailySummary 和 seedCustomerBenefits。

### 体验版必须回归

- 新用户、老板、工长、设计师、业主登录和角色分流。
- 创建工地、员工邀请码、项目绑定、业主绑定。
- 工长提交日报、老板审核、业主查看、重复审核和并发审核。
- 项目进度不倒退。
- 完工交付、质保卡、完工服务。
- 纪念册本人访问、游客分享、撤销、未授权字段、旧链接。
- 公开案例字段裁剪。
- 售后工单跨业主隔离。
- V2 入口和六页 guard 继续关闭。

### 正式发布前必须回归

- 订阅消息实际发送并打开正式版正确页面。
- 云函数错误率、超时和事务失败情况。
- 正式用户旧分享链接影响。
- 数据库和云存储无跨 tenant / 跨业主读取。
- 正式版 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
- AI 摘要和日报整理保持既定能力边界，不因误部署改变。

## 9. 最终合并建议

**C：需要补充代码修改后再审。**

安全修复方向大部分正确，但当前 PR 同时存在确定的定时任务回归、并发审核缺口和公开字段泄露。20/20 测试全部是静态断言，不能抵消这些运行时风险。完成合并阻塞项并补行为验证后，再进入下一轮审查。
