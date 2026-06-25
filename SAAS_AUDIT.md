# 晟景透明工地小程序 SaaS 化项目现状审计

审计时间：2026-06-25
当前分支：`saas-phase1-register`
当前云环境：`cloud1-d4g7zh8kpca0e26d5`

> 注意：当前工作树已经包含阶段 1 的未提交代码改动（`registerTenant`、注册页、`login` 分流）。本文同时标注“线上/备份点已有能力”和“当前工作树新增但未部署能力”，避免把未验收代码当成线上事实。

## 1. 技术栈与项目结构

### 小程序框架

- 原生微信小程序。
- 主包页面：
  - `pages/workbench/workbench`：工作台，老板/员工/业主根据角色展示不同首页。
  - `pages/projects/projects`：工地/门店展示页。
  - `pages/customers/customers`：客户库。
  - `pages/profile/profile`：我的。
  - 当前工作树新增：`pages/register/register`，老板自主注册页，未部署。
- 分包：
  - `subpackages/internal`：内部工地详情、日报上传、日报审核、客户编辑、图纸管理、员工管理、售后等。
  - `subpackages/owner`：业主项目、进度、完工档案、质保卡、售后、推荐、案例授权等。

### 云开发 / 后端服务

- 使用微信云开发。
- 小程序端环境 ID 写死在 `miniprogram/app.js`：
  - `cloud1-d4g7zh8kpca0e26d5`
- 云函数统一使用：
  - `cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })`
- 云函数目录：`cloudfunctions/`
- 主要调用方式：
  - 小程序端 `services/cloud.js` 中的 `call(name, data)` 包装 `wx.cloud.callFunction`

### 数据库集合

当前代码中已使用的核心集合包括：

- 用户与租户：`users`、`tenants`、`tenant_users`、`tenant_settings`、`tenant_branding`、`roles`、`subscriptions`
- 工地与成员：`projects`、`project_members`
- 日报与照片：`stage_logs`、`photos`
- 邀请与绑定：`owner_bind_codes`、`worker_project_bind_codes`、`staff_invite_codes`
- 客户与售后：`customers`、`after_sales_tickets`、`after_sales_ticket_logs`
- 图纸与完工服务：`design_drawings`、`warranty_cards`、`owner_archives`
- 案例与运营：`case_authorizations`、`referral_records`、`customer_benefits`、`activity_logs`、`operation_logs`

### 登录方式

- 小程序启动后调用 `login` 云函数。
- 云函数通过 `cloud.getWXContext()` 获取 `OPENID`。
- `users` 表按 `openid` 查找当前用户。
- 备份点逻辑：普通新用户会被自动创建为默认租户 `tenant_shengjing_default` 下的 `owner`。
- 当前工作树阶段 1 改动：普通新用户不再自动写入默认租户，而是返回 `needRegister: true`，前端跳转注册页。

### 角色体系

当前角色仍以硬编码为主：

- 管理/老板：`admin`、`boss_qi`、`boss_hu`
- 内部员工：`worker`、`project_manager`、`designer`、`sales`
- 业主：`owner`

已有 `roles` 集合和 `tenant_users` 集合，但大多数云函数仍直接判断硬编码数组，如：

- `MANAGE_ROLES = ['admin', 'boss_qi', 'boss_hu']`
- `REVIEW_ROLES = ['admin', 'boss_qi', 'boss_hu']`
- `SUBMIT_ROLES = ['admin', 'boss_qi', 'boss_hu', 'designer', 'worker', 'project_manager']`

SaaS 化后需要保留旧角色兼容，同时逐步统一为租户内通用角色。

## 2. 关键字段现状

| 字段 | 当前状态 | 说明 |
| --- | --- | --- |
| `tenantId` | 已大量存在 | `projects`、`users`、`stage_logs`、`photos`、`customers`、绑定码、售后、图纸等集合已在代码中读写。 |
| `companyId` | 未发现使用 | 当前统一倾向用 `tenantId`。不建议再引入 `companyId`。 |
| `ownerOpenid` | 已存在 | `projects.ownerOpenid` 为旧单业主字段，现已兼容 `ownerOpenids` 数组。 |
| `staffId` | 未发现统一使用 | 当前更多使用 `users._id`、`userOpenid`、`project_members.userId`。 |
| `projectId` | 已大量存在 | 日报、照片、图纸、绑定码、售后、打卡等均使用。 |
| `role` | 已大量存在 | 主要在 `users.role` 和 `project_members.role` 中使用。 |
| `status` | 已大量存在 | 用户、项目、绑定码、套餐、售后等都有各自 status。 |

结论：SaaS 主键应继续采用 `tenantId`，不要新增并行的 `companyId`。

## 3. 核心业务数据流

### 老板 / 管理员登录

1. 小程序调用 `app.ensureLogin()`。
2. `login` 云函数按 `openid` 查询 `users`。
3. 根据 `users.role` 控制工作台、审核、客户库、员工管理等入口。
4. 老板驾驶舱调用 `getBossDashboard`，按 `tenantId` 汇总项目、日报、客户、员工排行。

风险点：角色判断仍硬编码，平台管理员和新 SaaS 通用角色尚未完全抽象。

### 工长 / 项目经理发日报

1. 员工先通过 `staff_invite_codes` 激活角色。
2. 工长通过 `worker_project_bind_codes` 绑定工地，写入 `project_members`。
3. 内部页 `upload-log` 上传照片/语音。
4. `submitStageLog` 写入 `stage_logs`，并为图片写入 `photos`。
5. 管理员在 `reviewStageLog` 审核，通过后业主可见。

风险点：文件存储路径目前主要按 `projectId` 分目录，缺少 `tenantId` 前缀。

### 业主查看项目

1. 业主从 `subpackages/owner/pages/owner/owner` 或业主项目页进入。
2. `getOwnerProject` 根据 `ownerOpenid` / `ownerOpenids` / `ownerUserIds` 查工地。
3. 只读取 `reviewStatus: 'approved'` 且 `ownerVisible: true` 的日报和照片。

风险点：当前没有独立 `owner_bindings` 集合，主要依赖 `projects.ownerOpenids` 和 `owner_bind_codes`。如果未来一个业主跨多个项目/多个租户，需要建标准 `owner_bindings`。

### 项目创建

1. 前端 `project-edit` 提交项目资料。
2. `createProject` 校验角色。
3. 写入 `projects`，同时给创建人写 `project_members`。
4. 已写入 `tenantId`、`tenantName`。

风险点：尚未接入套餐项目数限制。

### 图片上传

当前主要路径：

- 日报照片：`stage-photos/{projectId}/{stageCode}/...`
- 日报语音：`stage-voices/{projectId}/...`
- 设计图：`design-drawings/{projectId}/{type}/...`
- 完工照片：`completion-photos/{projectId}/...`
- 售后照片：`after-sales/{projectId}/...`
- 业主补充：`owner-supplements/{projectId}/{category}/...`
- 用户头像：`user-avatars/{userId}/...`

风险点：缺少 `tenantId` 前缀。跨租户数据查询已有一定隔离，但文件路径还不是强租户隔离。

### 业主绑定工地

1. 内部项目详情页调用 `createOwnerBindCode` 生成 6 位绑定码。
2. 业主在业主页输入绑定码。
3. `bindOwnerProject` 校验绑定码，更新 `projects.ownerOpenids/ownerNames/ownerUserIds`，并更新业主 `users` 记录。

风险点：绑定关系写在项目数组字段里，适合当前夫妻 2 人场景，不适合后续标准 SaaS 的多项目/多业主/禁用访问管理。

## 4. 多租户隔离现状

### 已经做得比较好的位置

- `listMyProjects`：按当前用户 `tenantId` 查询项目或项目成员。
- `getBossDashboard`：项目、日报、客户均按 `tenantId` 查询。
- `submitStageLog`：新增日报、照片均写入 `tenantId`，并校验项目租户。
- `getOwnerProject`：业主读取项目、日报、照片时带 `tenantId` 兼容查询。
- `createProject`：新增项目和项目成员均写入 `tenantId`。
- `createOwnerBindCode` / `createWorkerProjectBindCode`：生成绑定码时写入并校验 `tenantId`。
- `listStaffMembers` / `listStaffInviteCodes`：按租户筛选员工和邀请码。

### 需要重点加固的位置

- `listPendingStageLogs`：
  - 待审核日报按 `stage_logs.tenantId` 查询，但随后查询 `projects` 时只使用 `_id: _.in(projectIds)`，未追加 `tenantId`。
- 多个 `.doc(projectId).get()` / `.doc(id).update()`：
  - 代码中常见先 `doc(id).get()` 再手动判断 `project.tenantId`。这比不校验好，但不如统一中间层稳定。
- 删除类云函数：
  - `deleteProject`、`deleteDesignDrawing`、`deleteStaffMember`、`deleteCustomer` 含 `remove`。
  - SaaS 化前必须逐个确认权限、租户、软删除策略。
- 文件上传路径：
  - 缺少 `tenantId/` 前缀，后续新上传应改为 `{tenantId}/...`，旧文件保持兼容。
- `initSaasDefaults`：
  - 会初始化默认租户并批量回填旧数据。
  - 当前阶段不得重跑，除非先备份数据库并由人工确认。

## 5. 当前离 SaaS 化还差什么

### P0：必须先做

1. 数据保护流程
   - 已创建代码备份提交：`1458029 backup before saas phase1 register`
   - 云数据库仍需通过控制台导出核心集合。
2. 老板自主注册入口
   - 当前工作树已新增 `registerTenant` 和注册页，但尚未部署、未验收。
3. 登录分流保护
   - 当前工作树已改为普通新用户跳注册页；需体验版验证业主/员工/工人绑定流程不被打断。
4. 套餐限制
   - 尚未实现 `checkPlanLimit`。
   - `createProject`、员工邀请/激活还未限制免费额度。

### P1：SaaS 可卖前需要做

1. 管理后台增强
   - 当前工作台已有老板驾驶舱、员工管理、项目管理入口，但还不是标准 SaaS 后台。
2. 角色通用化
   - 保留 `boss_qi/boss_hu` 兼容，同时为新租户明确 `admin/manager/foreman/designer/viewer/owner`。
3. 业主绑定标准化
   - 建议新增 `owner_bindings`，不要只依赖 `projects.ownerOpenids`。
4. 邀请二维码化
   - 当前主要是 6 位码输入，缺少标准 `pages/join/staff`、`pages/join/owner`。

### P2：安全与规模化

1. 租户隔离中间层
   - 提取统一的 `getCurrentUser`、`requireRole`、`requireTenant`、`checkProjectAccess`。
2. 文件路径租户隔离
   - 新上传文件统一使用 `{tenantId}/...`。
3. 超级管理后台
   - 新增 `platform_admin` 和跨租户管理入口。
4. 文档与测试
   - 补齐 `DEPLOYMENT.md`、`SECURITY.md`、`SAAS_PRICING.md`、`TENANT_ONBOARDING.md`。

## 6. 建议的下一步文件变更计划

### 阶段 1：老板注册入口（当前正在进行）

已在当前工作树新增/修改：

- `cloudfunctions/registerTenant/`
- `miniprogram/pages/register/`
- `cloudfunctions/login/index.js`
- `cloudfunctions/login/index.backup.phase1.js`
- `miniprogram/app.js`
- `miniprogram/app.json`
- `miniprogram/pages/workbench/workbench.js`
- `miniprogram/services/cloud.js`

验收前不得继续做阶段 2。

### 阶段 2：套餐限制

建议新增：

- `cloudfunctions/getMyPlan/`
- `cloudfunctions/checkPlanLimit/`

建议修改：

- `cloudfunctions/createProject/index.js`
- `cloudfunctions/createStaffInviteCode/index.js`
- `cloudfunctions/bindStaffRole/index.js`
- `miniprogram/pages/workbench/workbench.*`
- `miniprogram/subpackages/internal/pages/staff-manage/staff-manage.*`

### 阶段 3：租户安全中间层

建议新增：

- `cloudfunctions/_shared/auth.js`

优先改造云函数：

- `listPendingStageLogs`
- `getProjectDetail`
- `createOwnerBindCode`
- `createWorkerProjectBindCode`
- `submitStageLog`
- `reviewStageLog`
- `deleteProject`
- `deleteStaffMember`

### 阶段 4：业主绑定标准化

建议新增集合：

- `owner_bindings`

建议新增/修改：

- `bindOwnerProject`
- `unbindOwner`
- `getOwnerProject`
- `listOwnerProjects`
- `createOwnerBindCode`

## 7. 审计结论

项目已经具备 SaaS 化基础：`tenantId`、租户集合、套餐集合、品牌集合、员工邀请码、项目成员关系均已存在。当前不需要推倒重做。

最大风险不是“没有多租户字段”，而是：

1. 权限和租户校验分散在各云函数里。
2. 角色体系仍偏晟景自用。
3. 文件路径尚未按租户隔离。
4. 删除类函数需要严格安全复核。
5. `initSaasDefaults` 具有批量回填能力，不能在生产数据环境随意运行。

建议继续按“小步新增 + 验收 + 再推进”的方式做，阶段 1 验收通过后再进入套餐限制。
