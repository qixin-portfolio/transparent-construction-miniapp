# SaaS Phase 1 风险复核

复核时间：2026-06-25
当前分支：`saas-phase1-register`
当前环境：`cloud1-d4g7zh8kpca0e26d5`

## 1. 当前 Phase 1 已完成能力

- 已新增老板注册云函数：`cloudfunctions/registerTenant`
- 已新增老板注册页：`miniprogram/pages/register/register`
- `login` 已改为普通新用户返回 `needRegister: true`
- 已有 `tenantId` 用户保持原登录返回
- 旧角色继续兼容：`admin`、`boss_qi`、`boss_hu`、`worker`、`designer`、`sales`、`project_manager`、`owner`
- 前端 `app.ensureLogin` 已接入注册分流
- 白名单/受邀流程不会被注册流程打断：
  - 业主绑定页
  - 业主项目页
  - 公开案例页
  - 完工分享页
  - 门店页
  - 工作台/工地页内的员工邀请码和工长绑定码流程
- 当前能力尚未部署、尚未上传体验版、尚未验收

## 2. 审计报告发现的重点风险

1. `listPendingStageLogs` 二次查询 `projects` 时未追加 `tenantId`
   - 当前待审核日报先按 `stage_logs.tenantId` 查询。
   - 随后查询项目名时使用 `_id: _.in(projectIds)`，未追加当前租户 `tenantId`。

2. 文件上传路径缺少 `tenantId` 前缀
   - 日报照片、语音、设计图、完工照片、售后照片、业主补充等路径主要按 `projectId` 分目录。
   - 后续 SaaS 化应改为 `{tenantId}/...`，旧文件保持兼容。

3. `initSaasDefaults` 具有批量初始化和回填能力
   - 会初始化默认租户、套餐、品牌、角色。
   - 也会批量给旧集合回填 `tenantId`。
   - 生产环境不得随便重跑。

4. 删除类云函数存在 `remove`
   - 涉及 `deleteProject`、`deleteDesignDrawing`、`deleteStaffMember`、`deleteCustomer`。
   - 后续 SaaS 化前必须逐个复核租户权限和删除策略。

5. 角色体系仍偏晟景自用
   - 仍大量使用 `boss_qi`、`boss_hu`、`worker` 等旧角色。
   - 后续需要通用化为 SaaS 租户角色，同时保留旧角色兼容。

6. 当前尚未实现套餐项目数/员工数限制
   - `createProject` 尚未限制免费版第 4 个项目。
   - 员工邀请/激活尚未限制免费版第 4 个员工。

## 3. 本阶段是否需要立刻修复

- `listPendingStageLogs` 属于 Phase 2/Phase 3 前必须修复项。
- 文件路径租户隔离属于 Phase 3/P2 修复项，新上传文件后续改为 `{tenantId}/...`。
- `initSaasDefaults` 当前禁止执行。
- 删除类云函数当前不扩大改动，只进入后续安全复核清单。
- Phase 1 当前只验收老板注册链路和 `login` 分流保护。

## 4. Phase 1 当前风险结论

Phase 1 可继续做体验版验证，但前提是：

- 先完成人工数据库导出。
- 只部署 `registerTenant` 和 `login`。
- 不部署其他云函数。
- 不执行初始化脚本。
- 不发布正式版。

数据库未完成导出前，不建议部署体验版。
