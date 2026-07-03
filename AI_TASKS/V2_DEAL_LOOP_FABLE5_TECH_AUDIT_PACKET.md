# 透明工地小程序 SaaS / V2 成交闭环版：给 Fable5 的技术审计资料包

# 1. 当前审计目的

这份资料包用于让 Fable5 从技术、产品、Bug、风险、脏工作区、架构债、流程债角度做外部审计。

Fable5 不直接操作代码，只基于这份资料提出：

- 潜在 Bug
- 系统结构问题
- 入口权限风险
- V1 / V2 隔离风险
- 脏工作区风险
- 体验版状态风险
- 后续修复优先级
- 哪些地方不该继续开发

# 2. 当前最新安全状态

- 当前 branch：`codex/init-ai-collaboration`
- 当前本地 HEAD：`7cd74b27d44e7bf2b2910c2539ebab3f2041c46a`
- 当前本地 HEAD commit：`fix: guard upload log voice recording permissions`
- 当前 HEAD 上的 tag：无
- 任务给出的 V2 冻结安全点：`102fe24f3caaca8d5f41bff9fb0a6352bbf50045`
- 任务给出的 V2 冻结 tag：`v2-deal-loop-phase6x-entry-closed-development-frozen`
- 已只读确认：该 tag 存在，并指向 `102fe24f3caaca8d5f41bff9fb0a6352bbf50045`
- git status：执行前 clean；本文档新增后仅新增本资料包
- `ENABLE_V2_DEAL_LOOP_ENTRY` 当前值：`false`
- 当前入口规则：`ENABLE_V2_DEAL_LOOP_ENTRY && isBoss`
- `isBoss` 当前覆盖角色：`admin`、`boss_qi`、`boss_hu`
- 当前体验版状态：按任务背景，关闭入口后的体验版已上传覆盖；本次未重新上传验证
- 当前是否正式发布：否
- 当前是否部署云函数：本次未部署；历史记录显示 `getV2EvidenceSummary` 曾在 Phase 5B-4B 人工部署
- 当前开发是否冻结：按任务背景，V2 新功能开发冻结，下一阶段进入商业验证

必须确认：

`ENABLE_V2_DEAL_LOOP_ENTRY = false`

补充风险：当前本地 HEAD 已在 V2 冻结 tag 之后多出上传日报语音权限修复提交，属于 V1 上传日报 Bug 修复线索，Fable5 审计时应把“V2 冻结安全点”和“当前本地 HEAD”区分开。

# 3. 项目技术栈概览

- 微信原生小程序。
- 微信云开发。
- `miniprogram/`：小程序前端目录。
- `cloudfunctions/`：云函数目录。
- V1 主包与内部/业主分包承载透明工地交付系统。
- V2 使用 `miniprogram/subpackages/deal-loop/` 独立子包。
- 前端调用云函数主要通过 `wx.cloud.callFunction` 或 `services/cloud.js` 的 `call` 封装。
- 当前 V2 云函数依赖：`listCustomers`、`getCustomer`、`getV2EvidenceSummary`，均用于只读读取或摘要展示。
- 本资料包不包含云环境密钥、AppID、真实客户隐私、真实手机号或真实地址。

# 4. 目录结构摘要

核心目录：

- `miniprogram/pages/`
  - `workbench/`
  - `register/`
  - `projects/`
  - `customers/`
  - `profile/`
- `miniprogram/subpackages/`
  - `owner/`
  - `internal/`
  - `deal-loop/`
- `miniprogram/subpackages/deal-loop/`
  - `pages/pipeline/`
  - `pages/customer-detail/`
  - `pages/ai-assistant/`
  - `pages/trust-materials/`
  - `pages/contract-to-project/`
  - `pages/case-assets/`
  - `mock/`
  - `utils/`
- `cloudfunctions/`
  - 见第 10 节云函数清单。
- `AI_TASKS/`
  - 阶段文档、验收记录、交接日志、协作协议。

# 5. V1 页面结构

V1 是透明工地交付系统，核心覆盖工地管理、客户管理、业主查看、日报上传、日报审核、图纸、售后、员工管理和 SaaS 计划升级。

主包页面：

- `pages/workbench/workbench`
- `pages/register/register`
- `pages/projects/projects`
- `pages/customers/customers`
- `pages/profile/profile`

`owner` 分包页面：

- `pages/projects/projects`
- `pages/owner/owner`
- `pages/completed-home/completed-home`
- `pages/owner-archive/owner-archive`
- `pages/archive-drawings/archive-drawings`
- `pages/warranty-card/warranty-card`
- `pages/after-sale-create/after-sale-create`
- `pages/after-sale-list/after-sale-list`
- `pages/after-sale-detail/after-sale-detail`
- `pages/referral-create/referral-create`
- `pages/benefits/benefits`
- `pages/completion-album/completion-album`
- `pages/case-authorization/case-authorization`
- `pages/supplement-upload/supplement-upload`
- `pages/case-list/case-list`
- `pages/case-detail/case-detail`

`internal` 分包页面：

- `pages/project-detail/project-detail`
- `pages/project-edit/project-edit`
- `pages/upload-log/upload-log`
- `pages/review-log/review-log`
- `pages/customer-edit/customer-edit`
- `pages/ai-assistant/ai-assistant`
- `pages/design-drawings/design-drawings`
- `pages/staff-manage/staff-manage`
- `pages/after-sales-list/after-sales-list`
- `pages/after-sales-detail/after-sales-detail`
- `pages/deliver-form/deliver-form`
- `pages/plan-upgrade/plan-upgrade`

阶段边界说明：

- V2 Phase 6 的目标是成交闭环试验，不应修改 V1 页面。
- V2 Phase 6 不应修改 V1 云函数。
- 当前本地 HEAD 在冻结安全点之后包含 `upload-log` 语音权限修复提交，Fable5 可单独审计这条 Bug 修复是否影响 V1。
- V2 应长期保持与 V1 隔离，尤其是写库、创建工地、发布案例、自动发送等能力。

# 6. V2 deal-loop 子包结构

路径：`miniprogram/subpackages/deal-loop/`

## 6.1 pipeline

- 页面用途：客户成交跟进列表、阶段筛选、销售下一步动作卡。
- 当前数据来源：优先调用 `listCustomers` 只读读取；失败或无上下文时使用 `mock/customers`。
- 是否只读：是。
- 是否写库：否。
- 是否调用真实 AI：否。
- 是否调用云函数：是，`listCustomers`。
- 是否有剪贴板复制：是，复制反馈问题。
- 误解风险：页面仍存在 `mock` 样式/类名和示例兜底，Fable5 应检查用户是否会误以为建议来自真实 AI。

## 6.2 customer-detail

- 页面用途：客户详情、跟进记录展示、下一步跟进动作卡、阶段化复制跟进话术。
- 当前数据来源：优先调用 `getCustomer` 只读读取；跟进记录和建议来自本地 mock / 本地规则。
- 是否只读：是。
- 是否写库：否。
- 是否调用真实 AI：否。
- 是否调用云函数：是，`getCustomer`。
- 是否有剪贴板复制：是，复制反馈问题、复制跟进话术。
- 误解风险：销售动作卡和话术较像“智能建议”，需要持续强调内部参考、人工判断。

## 6.3 ai-assistant

- 页面用途：跟进助手，基于客户阶段和顾虑生成建议。
- 当前数据来源：优先调用 `getCustomer` 只读读取；建议来自本地 `aiMockEngine`。
- 是否只读：是。
- 是否写库：否。
- 是否调用真实 AI：否。
- 是否调用云函数：是，`getCustomer`。
- 是否有剪贴板复制：是。
- 误解风险：页面标题含 `AI`，但实际是本地规则，最容易被误解为真实 AI。

## 6.4 trust-materials

- 页面用途：信任素材、证据摘要、推荐素材。
- 当前数据来源：`getCustomer` 只读客户资料，`getV2EvidenceSummary` 只读证据摘要，本地示例素材兜底。
- 是否只读：是。
- 是否写库：否。
- 是否调用真实 AI：否。
- 是否调用云函数：是，`getCustomer`、`getV2EvidenceSummary`。
- 是否有剪贴板复制：未在扫描中发现此页直接调用 `wx.setClipboardData`。
- 误解风险：混合“真实证据摘要 + 示例推荐素材”，容易让用户误解哪些是真实资料、哪些是示例。

## 6.5 contract-to-project

- 页面用途：签约客户转工地草案预览。
- 当前数据来源：优先 `getCustomer` 只读读取；草案本地生成。
- 是否只读：是。
- 是否写库：否。
- 是否调用真实 AI：否。
- 是否调用云函数：是，`getCustomer`。
- 是否有剪贴板复制：是，复制工地草案。
- 误解风险：页面主题接近 `createProject`，必须避免被误解为真实创建工地。

## 6.6 case-assets

- 页面用途：案例资产草案、标题/话题/问答素材草案。
- 当前数据来源：优先 `getCustomer` 只读读取；案例草案本地生成。
- 是否只读：是。
- 是否写库：否。
- 是否调用真实 AI：否。
- 是否调用云函数：是，`getCustomer`。
- 是否有剪贴板复制：是，复制小红书标题、抖音话题、GEO 问答。
- 误解风险：案例素材可能被误解为可发布内容；授权、脱敏、发布边界必须继续冻结。

# 7. 当前入口控制逻辑

文件：`miniprogram/pages/workbench/workbench.js`

当前检查结果：

- `ENABLE_V2_DEAL_LOOP_ENTRY = false`
- `isBoss = ['admin', 'boss_qi', 'boss_hu'].indexOf(role) !== -1`
- 入口显示条件：`ENABLE_V2_DEAL_LOOP_ENTRY && isBoss`
- 当前非 boss 角色不可见。
- 当前 boss 角色也因总开关为 `false` 不可见。
- 当前入口关闭已恢复。

工作台 WXML 中仍有入口卡片文案，但因为 JS 开关为 `false`，默认不显示。

# 8. 当前 V2 已实现能力

- 客户成交跟进列表。
- 客户详情。
- 本地规则销售下一步动作卡。
- 不同阶段跟进重点 / 提示。
- `customer-detail` 下一步跟进动作。
- 阶段化复制跟进话术。
- `wx.setClipboardData` 复制能力。
- `trust-materials` 只读证据摘要。
- `contract-to-project` 工地草案。
- `case-assets` 案例资产草案。

# 9. 当前明确没有实现的能力

- 不调用真实 AI。
- 不自动发送微信。
- 不写跟进记录。
- 不修改客户状态。
- 不自动创建真实工地。
- 不调用 `createProject`。
- 不自动发布案例。
- 不开放给业主 / 工长 / 普通销售 / 外部客户。
- 不正式发布。

# 10. 云函数清单与 V2 依赖

`cloudfunctions/` 清单：

- `adminUpdateTenantPlan`
- `aiGenerateOwnerSummary`
- `bindOwnerProject`
- `bindStaffRole`
- `bindWorkerProject`
- `createAfterSalesTicket`
- `createCustomer`
- `createOwnerBindCode`
- `createProject`
- `createReferralRecord`
- `createStaffInviteCode`
- `createWorkerProjectBindCode`
- `dailySummary`
- `deleteCustomer`
- `deleteDesignDrawing`
- `deleteProject`
- `deleteStaffMember`
- `deliverProject`
- `generateStageLogDraft`
- `getAfterSalesTicket`
- `getBossDashboard`
- `getCaseAuthorization`
- `getCompletedOwnerHome`
- `getCompletionAlbum`
- `getCurrentTenantPlan`
- `getCustomer`
- `getOwnerArchive`
- `getOwnerPortal`
- `getOwnerProject`
- `getProjectDetail`
- `getTenantBranding`
- `getV2EvidenceSummary`
- `getWarrantyCard`
- `initSaasDefaults`
- `listAfterSalesTickets`
- `listCustomerBenefits`
- `listDesignDrawings`
- `listMyProjects`
- `listOwnerProjects`
- `listPendingStageLogs`
- `listPublicCases`
- `listStaffInviteCodes`
- `listStaffMembers`
- `listWorkerCheckins`
- `login`
- `recordWorkerCheckin`
- `registerTenant`
- `reviewStageLog`
- `seedCustomerBenefits`
- `sendOwnerNotice`
- `sendWecomNotice`
- `submitOwnerSupplement`
- `submitStageLog`
- `unbindOwner`
- `updateAfterSalesTicket`
- `updateCaseAuthorization`
- `updateCustomer`
- `updateDesignDrawing`
- `updateMyProfile`
- `updateStaffMember`
- `uploadDesignDrawing`

V2 当前允许的只读调用：

- `listCustomers`
- `getCustomer`
- `getV2EvidenceSummary`

部署状态：

- 历史文档显示 `getV2EvidenceSummary` 已在 Phase 5B-4B 由人工部署。
- 本次未部署云函数。
- 当前 Phase 6 后续没有新增真实 AI 云函数。

# 11. 风险关键词扫描结果

扫描范围：

- `miniprogram/subpackages/deal-loop/`
- `miniprogram/pages/workbench/`
- `cloudfunctions/`

关键词计数摘要：

| 范围 | db.collection | cloud.database | wx.request | createProject | submitStageLog | reviewStageLog | getTempFileURL | OPENAI | DeepSeek | real AI |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| deal-loop | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| workbench | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| cloudfunctions | 296 | 62 | 0 | 1 | 1 | 1 | 9 | 0 | 0 | 0 |

| 范围 | 自动发送 | 自动创建 | 自动发布 | 正式上线 | 正式功能 | mock | Readonly | Phase 3B |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| deal-loop | 2 | 0 | 5 | 0 | 0 | 203 | 16 | 1 |
| workbench | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| cloudfunctions | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

上下文摘要：

- `deal-loop` 中 `db.collection`、`cloud.database`、`wx.request` 均为 0，未发现前端直连数据库或新增请求。
- `deal-loop` 中 `createProject` 命中 1 次，来自 `contract-to-project` 草案相关风险文案/守卫，不是实际调用。
- `deal-loop` 中 `mock` 命中较多，主要是内部 mock 数据、类名、状态字段、示例兜底；用户可见区域也存在 `mock-btn` 类名但非展示文字。
- `deal-loop` 用户可见文案中命中“自动发送 / 自动发布”，主要是安全提示，例如“不会自动发送”“不支持自动发布”，属于风险澄清文案。
- `workbench` 用户可见文案命中“不自动发布内容”，属于入口安全提示。
- `cloudfunctions` 中 `db.collection` / `cloud.database` / `getTempFileURL` 命中很多，是 V1 既有云函数读写和文件 URL 获取能力；Fable5 应重点审计 V2 是否绕过隔离调用这些写能力。
- `cloudfunctions` 中 `createProject` / `submitStageLog` / `reviewStageLog` 命中来自既有云函数目录或包名，未在 V2 前端中发现实际调用。

只供 Fable5 判断风险，本阶段不修改任何命中内容。

# 12. 语法检查结果

已执行：

```bash
node --check miniprogram/pages/workbench/workbench.js
node --check miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.js
node --check miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.js
node --check miniprogram/subpackages/deal-loop/pages/ai-assistant/ai-assistant.js
node --check miniprogram/subpackages/deal-loop/pages/trust-materials/trust-materials.js
node --check miniprogram/subpackages/deal-loop/pages/contract-to-project/contract-to-project.js
node --check miniprogram/subpackages/deal-loop/pages/case-assets/case-assets.js
```

结果：全部通过。

# 13. 最近阶段演进摘要

- Phase 0-2：V2 子包 / mock 原型。
- Phase 3：真实客户只读接入。
- Phase 4：工作台入口设计与受控入口。
- Phase 5：真实证据摘要云函数与文案风险清理。
- Phase 6：反馈模块、销售动作卡、规则增强、体验版、Fable5 反方评审。
- Phase 6-X：入口关闭、体验版关闭覆盖、开发冻结。
- 当前：进入商业验证，不继续堆新功能。

当前 V2 冻结安全点：

- commit：`102fe24f3caaca8d5f41bff9fb0a6352bbf50045`
- tag：`v2-deal-loop-phase6x-entry-closed-development-frozen`

当前本地 HEAD 已包含后续上传日报语音修复提交：

- commit：`7cd74b27d44e7bf2b2910c2539ebab3f2041c46a`

# 14. 已知风险和不确定点

- 当前 V2 很多能力仍是本地规则或草案。
- 销售动作卡暂无真实行为验证。
- admin / boss_qi / boss_hu 的真实反馈不足。
- 信任证据包与案例授权存在合规风险。
- V1 / V2 数据边界需要长期保持。
- `trust-materials` 混合真实摘要和示例素材，存在认知混淆风险。
- `ai-assistant` 名称含 AI，但当前不调用真实 AI，存在误解风险。
- `contract-to-project` 接近真实创建工地链路，未来一旦写库风险较高。
- `case-assets` 接近发布素材，未来一旦开放发布或对外使用需要授权、脱敏、审核。
- 如果未来写库，需要重新设计权限、审计、回滚。
- 如果未来接 AI，需要防止编造承诺、误导销售、扩大隐私数据使用。
- 当前商业模式未验证，不应继续把内部体验当作市场验证。
- 上传日报语音输入仍有未决 Bug：真机截图显示 WechatSI 先返回部分识别原文“开始”，随后仍触发 `-30001: record manager record failed`；手写兜底能继续 AI 整理，但语音链路仍需单独审计。

# 15. 希望 Fable5 审计的问题

1. 当前系统最可能出现 Bug 的地方在哪里？
2. V1 / V2 隔离是否足够？
3. workbench 入口控制是否存在风险？
4. 当前关闭入口后，是否还有体验版残留风险？
5. V2 哪些页面最容易误导用户？
6. 哪些功能看起来已实现，但其实只是草案？
7. 哪些地方未来一写库就会出问题？
8. 哪些命名、文案、结构容易造成误解？
9. 哪些地方有合规风险？
10. 哪些地方应该冻结，不应继续开发？
11. 如果要做 Bug 修复，优先级怎么排？
12. 如果要做系统重构，哪些不能动？
13. 哪些检查还缺失？
14. 当前最脏、最容易积累技术债的地方是什么？
15. 未来商业验证回来后，应该如何决定是否继续开发？

# 16. 给 Fable5 的直接提问指令

你是我的反方技术合伙人、Bug 审计顾问和 SaaS 架构审计顾问。

请基于上面的透明工地小程序资料包，帮我做一次严格审计。重点不是鼓励我，而是找问题。

请从以下角度输出：

1. 你认为最可能存在的 10 个 Bug 或隐患
2. 哪些地方是脏工作区 / 技术债 / 流程债
3. V1 / V2 隔离是否安全
4. 入口关闭和体验版覆盖流程是否还有风险
5. 当前哪些能力容易被误解为已经正式可用
6. 如果未来写库，最危险的 5 个点是什么
7. 如果未来接真实 AI，最危险的 5 个点是什么
8. 如果未来 SaaS 化，最需要重构的 5 个点是什么
9. 现在最不应该修什么
10. 现在如果只做 3 个安全修复，应该做什么
11. 哪些问题应该等商业验证后再处理
12. 给我一份“立即处理 / 暂缓处理 / 不要处理”的优先级表

请直接、严厉、具体，不要说空泛建议。

# 17. 文档边界

- 本文档只供外部 AI 审计。
- 不包含密钥。
- 不包含真实客户隐私。
- 不包含真实手机号 / 地址。
- 不作为发布说明。
- 不作为正式产品承诺。
- 本阶段只新增本文档。
- 本阶段不修改业务代码。
- 本阶段不改变入口状态。
- 本阶段不上传体验版。
- 本阶段不部署云函数。
- 本阶段不发布正式版。
