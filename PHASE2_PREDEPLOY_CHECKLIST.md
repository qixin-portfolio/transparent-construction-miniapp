# SaaS Phase 2 部署前检查清单

## 1. 当前状态

- 当前分支：`saas-phase2-plan-limit`
- 当前最新 commit：`441b475 feat: add plan limits for projects and staff`
- Phase 2 已完成提交：
  - `b246673 fix: enforce tenant filter in pending stage log projects`
  - `441b475 feat: add plan limits for projects and staff`
- 当前工作区：部署前必须保持 clean

## 2. 本次准备部署的云函数

本次只允许部署以下云函数：

- `listPendingStageLogs`
- `createProject`
- `createStaffInviteCode`
- `bindStaffRole`

不允许部署其他云函数。

## 3. 本次不涉及的内容

- 不执行数据库迁移
- 不执行 `initSaasDefaults`
- 不批量回填 `tenantId`
- 不批量修改套餐
- 不批量删除数据
- 不上传正式版
- 不合并 master
- 不开发套餐页面
- 不接支付
- 不做超级后台
- 不改文件上传路径
- 不改 `owner_bindings`

## 4. 晟景老租户套餐风险

本次 `createProject` 和员工相关函数已接入套餐限制。

如果晟景老租户没有有效 `subscriptions` 记录，或 `tenants` 中没有足够高的 `maxProjects` / `maxStaff`，代码会默认按免费版限制：

```txt
maxProjects: 3
maxStaff: 3
```

这可能导致：

- 晟景新增第 4 个以上项目时被拦截
- 晟景新增第 4 个以上员工时被拦截

部署前必须人工在微信云开发控制台确认晟景租户套餐额度。

建议晟景老租户至少设置为：

```txt
plan: enterprise
status: active
maxProjects: 9999
maxStaff: 9999
```

注意：本轮不允许写脚本自动设置，只能由人工在控制台确认或手动修改。

## 5. 部署前必须人工确认的数据

```txt
晟景 tenantId：
当前 tenants.plan：
当前 tenants.status：
当前 tenants.maxProjects：
当前 tenants.maxStaff：
是否存在 subscriptions 记录：
subscriptions.plan：
subscriptions.status：
subscriptions.maxProjects：
subscriptions.maxStaff：
确认时间：
确认人：
备注：
```

## 6. 部署前 Git 检查

部署前执行：

```bash
git status
git branch --show-current
git log --oneline -8
```

要求：

- 当前分支为 `saas-phase2-plan-limit`
- 最新 commit 为 `441b475 feat: add plan limits for projects and staff`
- 工作区 clean

## 7. 禁止动作确认

数据库人工确认完成前，不允许部署。

部署时禁止：

- 一次性部署全部云函数
- 部署无关云函数
- 执行数据库脚本
- 执行 `initSaasDefaults`
- 上传正式版
- 合并 master
