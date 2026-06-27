# SaaS Phase 3 验收结果

验收时间：2026-06-27 22:32:36 CST

## 1. 当前状态

- 当前分支：`saas-phase3-manual-plan-admin`
- 当前 commit：`0d4681b fix: separate owner entry from company registration`
- 体验版版本号：`3.0.1`
- 体验版上传：成功
- 上传说明：`Phase 3 套餐展示 + 业主入口分流修复`
- 是否发布正式版：否
- 是否合并 master：否
- 是否进入下一阶段：否，暂不进入，等齐鑫确认

## 2. 已部署云函数

- `getCurrentTenantPlan`
- `adminUpdateTenantPlan`

## 3. 权限白名单验收结果

### 代码确认

`cloudfunctions/adminUpdateTenantPlan/index.js` 当前管理员白名单为：

```js
const ADMIN_ROLES = ['admin', 'boss_qi', 'boss_hu', 'platform_admin', 'super_admin']
```

确认结果：

- `manager` 已从套餐管理员白名单移除
- `worker` / `designer` / `sales` / `project_manager` / `owner` 不在套餐管理员白名单
- 未注册用户无法通过 `users` 查询获得管理员角色

### 真机/账号验收

| 场景 | 预期 | 当前结果 |
|------|------|---------|
| manager 不能改套餐 | 返回 `success: false`，提示 `无权限执行此操作`，不修改 `subscriptions` 和 `tenants` | 待真机账号确认 |
| 平台管理员可以改套餐 | `admin` / `boss_qi` / `boss_hu` / `platform_admin` / `super_admin` 可调用，`subscriptions` 和 `tenants` 同步更新 | 待真机账号确认 |

说明：本次已完成代码白名单核验和体验版上传。不同角色账号的真机调用需要用对应微信账号在体验版环境中确认，不在本机伪造通过。

## 4. 业主入口分流验收结果

### 代码确认

`miniprogram/app.js` 当前 `needRegister` 分流逻辑已经按 `route + options` 判断：

- 普通新微信用户进入 `pages/workbench/workbench`：跳转 `/pages/register/register?entry=boss_register`
- `pages/workbench/workbench` 只有携带 `inviteCode` / `staffInviteCode` / `workerBindCode` / `entry=staff_join` / `entry=worker_bind` 或 `saasInviteFlow` 时才放行
- `pages/projects/projects` 只有携带 `entry=public` / `entry=owner_bind` / `from=share` / `bindCode` / `ownerBindCode` / `scene` 时才放行
- owner 分包入口和公开案例/完工分享页面放行
- 注册页 `pages/register/register` 只有 `entry=boss_register` 才允许提交公司注册
- 注册页标题为：`装修公司注册`

### 真机/入口验收

| 场景 | 预期 | 当前结果 |
|------|------|---------|
| 新业主扫码绑定工地 | 不进入装修公司注册页，进入业主绑定/项目流程，不创建新租户/套餐/老板身份 | 待真机扫码确认 |
| 新老板直接进工作台 | 跳 `/pages/register/register?entry=boss_register`，标题为“装修公司注册” | 待真机确认 |
| 公开页面访问 | 公开案例页/完工分享页/门店页不跳公司注册 | 待真机确认 |

## 5. 老板工作台套餐卡片验收结果

预期：

- 能看到当前套餐
- 能看到项目额度
- 能看到员工额度
- 不影响原工作台数据

当前结果：体验版 `3.0.1` 已上传，等待老板账号真机确认。

## 6. 套餐升级联动 Phase 2 限制验收结果

预期：

- 免费版第 4 个项目被 `PLAN_PROJECT_LIMIT_REACHED` 拦截
- 手动升级后可继续创建项目

当前结果：Phase 2 已完成并打 tag `saas-phase2-plan-limit-ok`；Phase 3 体验版上传完成后仍需用测试租户做真机复核。

## 7. 本轮安全约束确认

- 是否执行数据库脚本：否
- 是否执行 `initSaasDefaults`：否
- 是否批量回填 `tenantId`：否
- 是否批量修改套餐：否
- 是否发布正式版：否
- 是否合并 master：否
- 是否进入下一阶段：否
- 是否触碰 `geo-content-center/`：否

## 8. 当前结论

Phase 3 修复版体验版 `3.0.1` 已上传成功。

代码侧已确认：

- `adminUpdateTenantPlan` 权限白名单已收窄，`manager` 已移除
- 业主入口分流已修复并提交
- 注册页已加 `entry=boss_register` 入口保护

真机验收侧：

- 当前不能直接判定 Phase 3 全部通过
- 需要齐鑫使用对应测试微信账号完成 manager、平台管理员、业主扫码、新老板、公开页、老板工作台套餐卡片、套餐升级联动 7 个场景确认
- 真机全部通过后，再更新本文件结论并决定是否合并 master

