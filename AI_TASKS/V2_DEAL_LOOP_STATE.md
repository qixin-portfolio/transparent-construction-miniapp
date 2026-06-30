# 透明工地 V2：成交闭环版 — Loop State

## 1. 项目名称

透明工地 V2：成交闭环版

## 2. 当前阶段

Phase 0：项目审计与状态文件建立

- 审计日期：2026-06-29
- 审计范围：`透明工地小程序/开发骨架`
- V1 审计基线分支：`master`
- V1 审计基线 commit：`606c58873c422ec250b5716c3ed7a53b0d56aa51`
- 本次复核执行分支：`codex/init-ai-collaboration`
- 本次复核 HEAD：`8c665e339243fa0aba4989f51fbb196d20488085`
- 工作区备注：存在上一轮协作机制任务遗留的 `AI_TASKS/handoff.md` 未提交修改；本次 Phase 0 未触碰业务代码、云函数和数据库逻辑。

## 3. V1 当前状态

V1 是微信小程序 + 微信云开发项目，已不是纯工地日报骨架。当前已经包含内部工作台、客户库、工地管理、日报上传/审核、业主端、图纸、售后、交付、案例授权、AI 文案/摘要相关能力。

技术栈判断：

- 微信小程序原生开发：`app.json`、`page.js/wxml/wxss/json`
- 微信云开发：`wx.cloud.init`、`wx.cloud.callFunction`、`wx-server-sdk`
- 小程序根目录：`miniprogram/`
- 云函数根目录：`cloudfunctions/`
- 云环境 ID：`cloud1-d4g7zh8kpca0e26d5`
- 小程序 AppID：`wxbfe2172a118ae67f`
- 插件：`WechatSI` 语音识别插件，版本 `0.3.6`
- 前端云函数调用封装：`miniprogram/services/cloud.js`
- 多租户/SaaS 雏形：`tenants`、`tenant_users`、`subscriptions`、`tenant_branding`、`tenant_settings`、`roles`
- AI 状态：已有本地规则型 AI 助手和一个真实 API 型业主摘要云函数；V2 第一阶段必须继续使用 mock，不接新真实 API。

小程序页面目录结构：

- 主包 pages：
  - `pages/workbench/workbench`
  - `pages/register/register`
  - `pages/projects/projects`
  - `pages/customers/customers`
  - `pages/profile/profile`
- 业主分包 `subpackages/owner`：
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
- 内部分包 `subpackages/internal`：
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

云函数目录结构，共 61 个：

- 登录/租户/权限：`login`、`registerTenant`、`initSaasDefaults`、`getCurrentTenantPlan`、`adminUpdateTenantPlan`、`getTenantBranding`、`bindStaffRole`
- 员工/成员：`createStaffInviteCode`、`listStaffInviteCodes`、`listStaffMembers`、`updateStaffMember`、`deleteStaffMember`
- 客户：`createCustomer`、`listCustomers`、`getCustomer`、`updateCustomer`、`deleteCustomer`
- 工地/项目：`createProject`、`listMyProjects`、`listOwnerProjects`、`getProjectDetail`、`getOwnerProject`、`deleteProject`
- 业主绑定：`createOwnerBindCode`、`bindOwnerProject`、`unbindOwner`
- 工人绑定/打卡：`createWorkerProjectBindCode`、`bindWorkerProject`、`recordWorkerCheckin`、`listWorkerCheckins`
- 日报：`submitStageLog`、`listPendingStageLogs`、`reviewStageLog`、`dailySummary`、`generateStageLogDraft`
- 业主端：`getOwnerPortal`、`getOwnerArchive`、`getCompletedOwnerHome`、`submitOwnerSupplement`
- 通知：`sendOwnerNotice`、`sendWecomNotice`
- 图纸：`uploadDesignDrawing`、`listDesignDrawings`、`updateDesignDrawing`、`deleteDesignDrawing`
- 售后/质保：`createAfterSalesTicket`、`listAfterSalesTickets`、`getAfterSalesTicket`、`updateAfterSalesTicket`、`getWarrantyCard`
- 交付/案例：`deliverProject`、`getCompletionAlbum`、`getCaseAuthorization`、`updateCaseAuthorization`、`listPublicCases`
- 转介绍/权益：`createReferralRecord`、`listCustomerBenefits`、`seedCustomerBenefits`
- AI/老板看板：`aiGenerateOwnerSummary`、`getBossDashboard`

数据库集合/表结构推测：

- 已在代码中直接读写：`users`、`customers`、`projects`、`project_members`、`stage_logs`、`photos`、`tasks`、`owner_bind_codes`、`worker_project_bind_codes`、`staff_invite_codes`、`design_drawings`、`warranty_cards`、`after_sales_tickets`、`after_sales_ticket_logs`、`owner_supplements`、`case_authorizations`、`operation_logs`、`activity_logs`、`customer_benefits`、`referral_records`、`tenants`、`tenant_users`、`subscriptions`
- 动态集合名/初始化函数中出现：`tenant_branding`、`tenant_settings`、`roles`、`notifications`
- V1 客户核心字段推测：`name`、`phone`、`source`、`address`、`need`、`stage`、`dealStatus`、`lifecycleStatus`、`ownerOpenid`、`tenantId`、`tenantName`、`deleted`、`createdAt`、`updatedAt`
- V1 工地核心字段推测：`name`、`tenantId`、`tenantName`、`customerId`、`customerName`、`address`、`ownerOpenid`、`ownerOpenids`、`ownerUserIds`、`ownerNames`、`currentStage`、`progress`、`status`、`statusCode`、`deliveredAt`、`completionPhotoFileIDs`、`createdAt`、`updatedAt`
- V1 日报核心字段推测：`projectId`、`tenantId`、`projectName`、`stage`、`stageCode`、`progress`、`workContent`、`issue`、`needConfirm`、`tomorrowPlan`、`photoFileIDs`、`voiceFileID`、`voiceTranscript`、`ownerSummary`、`reviewFocus`、`aiDraft`、`aiGenerated`、`sourceType`、`reviewStatus`、`ownerVisible`、`reviewRecords`
- V1 照片核心字段推测：`projectId`、`tenantId`、`stageLogId`、`fileID`、`stage`、`ownerVisible`、`createdBy`
- V1 权限核心字段推测：`users.role`、`users.status`、`users.tenantId`、`project_members.role`、`tenant_users.role`

当前 V1 已有功能清单：

- 内部工作台：老板指标、待审核日报、工地提醒、客户动态、员工角色入口
- 客户库：客户列表、客户搜索、阶段筛选、新增/编辑/软删除、签单后创建工地入口
- 工地管理：新建工地、工地详情、进度、时间线、照片墙、业主/工人绑定码、删除工地
- 日报闭环：上传日报、照片上传、语音识别、AI 草稿字段、待审核、审核通过后同步业主可见和照片可见
- 业主端：绑定工地、查看进度、查看已审核日报和照片、完工首页、资料归档、补充资料上传
- 图纸管理：上传、列表、更新、删除、业主可见控制
- 竣工交付：交付表单、质保卡、完工相册、客户生命周期更新为 delivered
- 售后：业主提交售后、内部查看/更新售后、售后日志
- 案例资产：案例授权、公开案例列表、案例详情、完工照片聚合
- 转介绍：老业主推荐客户并写入客户库、推荐记录
- SaaS 雏形：租户注册、套餐限制、员工邀请码、员工管理、默认租户初始化
- AI 辅助：内部本地规则型 AI 助理、业主日报摘要云函数

与“工地、业主、日报、照片、项目、权限”相关的核心文件：

- 全局入口与登录路由：`miniprogram/app.js`
- 云函数调用/图片上传封装：`miniprogram/services/cloud.js`
- 阶段/角色常量：`miniprogram/utils/constants.js`
- 项目/客户状态工具：`miniprogram/utils/status.js`
- 主工作台：`miniprogram/pages/workbench/workbench.js`
- 客户列表：`miniprogram/pages/customers/customers.js`
- 客户详情/签单转工地入口：`miniprogram/subpackages/internal/pages/customer-edit/customer-edit.js`
- 工地详情：`miniprogram/subpackages/internal/pages/project-detail/project-detail.js`
- 工地创建：`miniprogram/subpackages/internal/pages/project-edit/project-edit.js`
- 日报上传：`miniprogram/subpackages/internal/pages/upload-log/upload-log.js`
- 日报审核：`miniprogram/subpackages/internal/pages/review-log/review-log.js`
- 业主首页/绑定：`miniprogram/subpackages/owner/pages/owner/owner.js`
- 业主工地列表：`miniprogram/subpackages/owner/pages/projects/projects.js`
- 完工归档/相册/案例：`miniprogram/subpackages/owner/pages/owner-archive/owner-archive.js`、`completion-album`、`case-authorization`、`case-list`、`case-detail`
- 创建工地云函数：`cloudfunctions/createProject/index.js`
- 工地详情云函数：`cloudfunctions/getProjectDetail/index.js`
- 业主工地云函数：`cloudfunctions/getOwnerProject/index.js`
- 提交日报云函数：`cloudfunctions/submitStageLog/index.js`
- 审核日报云函数：`cloudfunctions/reviewStageLog/index.js`
- 业主绑定云函数：`cloudfunctions/createOwnerBindCode/index.js`、`bindOwnerProject/index.js`
- 客户云函数：`cloudfunctions/createCustomer/index.js`、`listCustomers/index.js`、`getCustomer/index.js`、`updateCustomer/index.js`
- 交付云函数：`cloudfunctions/deliverProject/index.js`
- 案例云函数：`cloudfunctions/listPublicCases/index.js`、`updateCaseAuthorization/index.js`
- 权限/登录云函数：`cloudfunctions/login/index.js`、`bindStaffRole/index.js`、`initSaasDefaults/index.js`

## 4. V2 目标

V2 不是单纯升级工地日报，而是在不破坏 V1 的基础上，把「透明工地」升级成装修公司的成交闭环系统：

1. 客户成交管道
2. 客户详情与跟进记录
3. AI 跟进助手
4. 信任素材库
5. 签约转工地
6. 工地转案例内容资产

目标链路：

线索/客户 -> 跟进 -> 信任素材触达 -> 签约 -> 创建/关联工地 -> 施工日报 -> 业主信任 -> 完工 -> 案例资产/内容资产沉淀

## 5. 不可破坏约束

1. 不直接修改现有 V1 核心业务逻辑。
2. 不删除、不重命名现有数据库字段。
3. 不破坏当前小程序测试版功能。
4. 先审计，再设计，再小步开发。
5. 每一步必须可回滚、可验证、可停止。
6. 每次任务只做一个阶段，不要一次性大改。
7. 所有 AI 能力第一阶段先用 mock，不接真实 API。
8. 所有涉及数据迁移、发布、云函数部署、数据库结构变更的动作，都必须先列出风险并等待人工确认。
9. Phase 0 禁止实现 V2 页面。
10. Phase 0 禁止改云函数。
11. Phase 0 禁止改数据库读写逻辑。
12. Phase 0 禁止部署、禁止上传体验版。

## 6. 已确认的 MVP 模块

1. 客户成交管道：基于现有 `customers.stage`、`dealStatus`、`lifecycleStatus` 扩展，但第一步不要直接改旧字段枚举。
2. 客户详情与跟进记录：建议新增独立 `customer_followups` 或同类集合，不把大量跟进记录塞进 `customers` 主文档。
3. AI 跟进助手：第一阶段使用 mock 规则，不接真实 API；可复用现有 `assistant-data.js` 的本地生成模式。
4. 信任素材库：复用 `stage_logs`、`photos`、`design_drawings`、`case_authorizations`、`owner_archives`、`warranty_cards`。
5. 签约转工地：复用 `customer-edit -> project-edit -> createProject` 链路，V2 先做独立适配层或草案，不直接改 `createProject`。
6. 工地转案例内容资产：复用 `deliverProject`、`completionPhotoFileIDs`、`listPublicCases`、`case_authorizations`。

## 7. 暂不做功能

- 不实现 V2 页面。
- 不新增云函数。
- 不新增/修改数据库集合。
- 不接真实 AI API。
- 不做真实数据迁移。
- 不改 V1 客户、工地、日报、照片、权限核心读写逻辑。
- 不部署云函数。
- 不上传体验版。
- 不发布正式版。
- 不做自动外呼/短信/微信触达。
- 不做自动发布小红书/抖音/官网。
- 不做复杂 CRM 报表。
- 不做支付/订阅闭环。

## 8. 后续阶段计划

Phase 1：V2 数据结构与模块边界设计

- 输出新增集合/字段草案。
- 设计成交管道、跟进记录、信任素材库、工地转案例结构。
- 明确只读复用 V1 数据的位置。
- 列出数据库变更风险，等待人工确认。

Phase 2：V2 Mock 原型页面

- 建议新增独立分包：`miniprogram/subpackages/deal-loop/`。
- 全部使用 mock 数据。
- 不接真实数据库。
- 不影响 V1 tab、V1 pages、V1 cloudfunctions。

Phase 3：只读接入 V1 数据

- 只读 `customers`、`projects`、`stage_logs`、`photos`、`design_drawings`、`case_authorizations`。
- 不写入 V1 集合。
- 验证素材库和成交管道的展示价值。

Phase 4：新增 V2 独立集合与云函数

- 可能新增 `customer_followups`、`deal_pipeline_views`、`trust_materials`、`ai_followup_drafts`、`case_content_assets`。
- 必须先人工确认集合名、字段和权限。
- 必须先小范围测试。

Phase 5：签约转工地适配层

- 在不改 `createProject` 的前提下，新增 V2 转换入口或包装函数。
- 明确客户与工地关联规则。
- 任何真实写入前必须人工确认。

## 9. 当前风险

- V1 已经有真实体验版/测试版使用记录，任何修改 `createProject`、`submitStageLog`、`reviewStageLog`、`getOwnerProject`、`bindOwnerProject` 都可能影响当前使用。
- `customers` 已有阶段字段，V2 不应直接重命名或替换 `stage`、`dealStatus`、`lifecycleStatus`。
- `projects` 同时兼容旧字段 `ownerOpenid` 和新数组字段 `ownerOpenids`，不能删除旧字段。
- `photos.ownerVisible` 与 `stage_logs.ownerVisible/reviewStatus` 强绑定业主可见逻辑，不能随意改。
- `tenantId` 兼容 `tenant_shengjing_default`、空值和 null，V2 查询必须保持兼容。
- `aiGenerateOwnerSummary` 已接真实 AI 环境变量，V2 AI 跟进助手第一阶段不能复用为真实 API 调用。
- `initSaasDefaults` 有批量补 tenantId 逻辑，任何再次执行或扩展都属于高风险数据库变更。
- `deleteProject` 会删除项目相关日报、照片、图纸，V2 不应复用其逻辑做任何“清理”。

## 10. 下一步建议

下一阶段只做 Phase 1：V2 模块边界与数据结构设计。

建议优先确定：

1. V2 是否采用独立分包：`miniprogram/subpackages/deal-loop/`
2. 跟进记录集合是否命名为：`customer_followups`
3. 信任素材库第一阶段是否只读聚合 V1 数据，不落新集合
4. 成交管道阶段是否先在 V2 mock 层映射，不改 V1 `customers.stage`
5. AI 跟进助手是否复用现有 `assistant-data.js` 的本地生成方式，先不接云函数

最适合新增的独立模块位置：

- 前端 mock 原型：`miniprogram/subpackages/deal-loop/pages/pipeline/`
- V2 本地 mock 数据：`miniprogram/subpackages/deal-loop/mock/`
- V2 工具函数：`miniprogram/subpackages/deal-loop/utils/`
- 后续真实云函数：优先新增 `cloudfunctions/listDealPipeline`、`cloudfunctions/createCustomerFollowup`、`cloudfunctions/listTrustMaterials`，不要改 V1 云函数。
