# SaaS Phase 2 最小范围审计

## 1. 当前代码状态

- 当前分支：`saas-phase2-plan-limit`
- 当前基线 commit：`3343daf merge: SaaS phase1 tenant registration flow`
- 审计前工作区：clean
- 本阶段不执行数据库脚本，不部署云函数，不上传小程序。

## 2. 本次要改哪些文件

- `cloudfunctions/listPendingStageLogs/index.js`
  - 修复二次查询 `projects` 未追加 `tenantId` 的租户隔离风险。
- `cloudfunctions/createProject/index.js`
  - 增加免费版项目数量限制。
- `cloudfunctions/createStaffInviteCode/index.js`
  - 在生成员工邀请码前增加员工数量限制，避免继续发出可激活的邀请码。
- `cloudfunctions/bindStaffRole/index.js`
  - 在真正激活员工身份前再次增加员工数量限制，避免旧邀请码绕过限制。
- `PHASE2_PLAN_LIMIT_TEST.md`
  - 记录本阶段验收场景。

## 3. 本次不改哪些文件

- 不改文件上传路径，不做 `{tenantId}/...` 文件目录大改。
- 不改 `owner_bindings` 标准化。
- 不改 `initSaasDefaults`，也不执行该云函数。
- 不做统一 `_shared/auth.js` 或全量权限系统重构。
- 不新增支付能力。
- 不新增套餐购买页。
- 不新增超级后台。
- 不批量回填 `tenantId`。
- 不批量删除任何数据。

## 4. 项目数量限制应该加在哪个云函数

项目数量限制加在 `cloudfunctions/createProject/index.js`。

原因：

- `createProject` 是当前新建工地的后端入口。
- 前端 `project-edit.js` 通过 `call('createProject', form)` 调用该函数。
- 在后端限制可以避免前端绕过。

实现方式：

- 获取当前用户与 `tenantId`。
- 读取当前租户套餐。
- 统计当前租户非删除项目数。
- 当 `count >= maxProjects` 时返回 `PLAN_PROJECT_LIMIT_REACHED` 错误。

## 5. 员工数量限制应该加在哪个云函数

员工数量限制需要同时加在两个入口：

- `cloudfunctions/createStaffInviteCode/index.js`
- `cloudfunctions/bindStaffRole/index.js`

原因：

- `createStaffInviteCode` 只是生成邀请码，不真正新增员工身份，但如果人数已满还继续发码，会留下可绕过限制的入口。
- `bindStaffRole` 才是真正把用户激活为内部员工的地方，必须在这里再次校验，防止旧邀请码绕过限制。

现有员工列表 `listStaffMembers` 从 `users` 集合读取内部角色，不是从 `tenant_users` 读取。因此本阶段员工数统计按当前真实流程统计 `users`。

老板角色和管理员不计入员工数，避免免费版 3 个员工名额被老板本人占用。

## 6. `listPendingStageLogs` 需要如何补 `tenantId`

当前风险点：

- `stage_logs` 查询已经带当前租户条件。
- 二次查询 `projects` 时只按 `_id: _.in(projectIds)` 查询，缺少 `tenantId`。

修复方式：

```js
db.collection('projects').where({
  _id: _.in(projectIds),
  tenantId
})
```

本次不改变接口返回结构，不改变审核列表业务逻辑。若项目不属于当前租户，则不使用该项目名，继续走原有兜底文案。

## 7. 是否发现现有套餐字段

已发现现有套餐字段：

- `cloudfunctions/registerTenant/index.js`
  - 新注册租户会写入 `subscriptions`。
  - 字段包括 `plan`、`subscriptionPlan`、`status`、`subscriptionStatus`、`maxProjects`、`maxStaff`、`enabledModules`。
- `cloudfunctions/initSaasDefaults/index.js`
  - 默认租户存在 `subscriptions` 初始化逻辑。
  - 字段包括 `subscriptionPlan`、`subscriptionStatus`、`maxUsers`、`maxProjects`。
  - 本阶段禁止执行该函数。
- `cloudfunctions/getTenantBranding/index.js`
  - 已读取 `subscriptions` 并合并到品牌配置。

注意：

- 旧租户订阅字段可能只有 `subscriptionStatus`，不一定有 `status`。
- 本阶段套餐读取会兼容订阅文档缺失的情况，缺失时按免费版默认限制处理。
- 若晟景老租户被免费版限制，需要人工给默认租户设置更高套餐，不在本阶段自动回填。

## 8. 是否需要新增云函数

不需要新增云函数。

本阶段只在现有云函数内增加局部 helper 和限制判断，避免部署时找不到共享模块。

## 9. 是否需要数据库迁移

不需要数据库迁移。

本阶段不创建套餐记录，不回填套餐记录，不批量修改历史集合，只在新建项目、生成邀请码、激活员工、查询待审核列表时增加运行时判断。
