# SaaS Phase 3 回滚方案

## 1. 代码回滚

### 回退到 Phase 2 稳定版本

```bash
git checkout saas-phase2-plan-limit-ok
```

### 回退到 master 当前稳定版本

```bash
git checkout master
```

### 回退到 Phase 3 提交前的干净状态

```bash
git checkout b414d16^
```

注意：回退后工作区会处于 detached HEAD 状态，如需继续开发，请切换到 master 或创建新分支。

## 2. 云函数回滚

### getCurrentTenantPlan 异常

- 回滚或停用 `getCurrentTenantPlan` 云函数
- 老板工作台套餐卡片暂时不显示
- 不影响项目创建、员工管理、日报上传、审核等核心功能
- 前端已做容错：`call('getCurrentTenantPlan').catch(() => null)`

### adminUpdateTenantPlan 异常

- 立即停止调用该云函数
- 回滚云函数到部署前版本（使用微信开发者工具重新部署上一个版本）
- 检查最近修改过的 subscriptions 和 tenants 数据
- 如果有人误操作修改了套餐，按第 4 节数据回滚恢复

## 3. 小程序回滚

如果老板工作台显示异常（套餐卡片导致布局错乱）：

- 回退 `miniprogram/pages/workbench/workbench.js`
- 回退 `miniprogram/pages/workbench/workbench.wxml`
- 回退 `miniprogram/pages/workbench/workbench.wxss`
- 重新上传体验版覆盖

### 快速手动修复（不改部署）

如果只是套餐卡片显示问题，先在 wxml 中给套餐卡片外层加 `wx:if="{{false}}"` 或注释掉，重新上传即可，不影响其他功能。

## 4. 数据回滚

### 误改套餐后的恢复流程

#### 第一步：记录当前异常数据

```txt
tenantId：
修改前 plan：
修改前 status：
修改前 maxProjects：
修改前 maxStaff：
修改后 plan：
修改后 status：
修改后 maxProjects：
修改后 maxStaff：
操作人 openid：
操作时间：
```

#### 第二步：人工在微信云开发控制台恢复

1. 进入云开发控制台
2. 打开 `subscriptions` 集合
3. 找到对应 `tenantId` 的文档
4. 手动修改回修改前的值
5. 打开 `tenants` 集合
6. 找到对应 `tenantId` 的文档
7. 手动修改回修改前的值

#### 禁止事项

- 禁止批量脚本回滚
- 禁止使用 `remove`、`drop`、清空集合
- 禁止使用 `initSaasDefaults` 恢复
- 禁止批量修改所有租户套餐

## 5. 回滚后检查

回滚完成后确认：

- [ ] getCurrentTenantPlan 已回滚或停用
- [ ] adminUpdateTenantPlan 已回滚或停用
- [ ] 老板工作台套餐卡片不再显示
- [ ] 项目创建正常（不超过 Phase 2 限制）
- [ ] 员工添加正常（不超过 Phase 2 限制）
- [ ] 日报上传、审核正常
- [ ] 业主查看正常
- [ ] subscriptions 和 tenants 数据已恢复
