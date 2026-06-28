# SaaS Phase 3 部署前检查清单

## 1. 本次允许部署的云函数

| 云函数 | 说明 |
|--------|------|
| `getCurrentTenantPlan` | 获取当前用户租户套餐信息 |
| `adminUpdateTenantPlan` | 平台管理员手动修改租户套餐 |

不允许部署其他云函数。

## 2. 本次允许上传的小程序改动

| 文件 | 说明 |
|------|------|
| `miniprogram/pages/workbench/workbench.js` | 加载套餐数据 |
| `miniprogram/pages/workbench/workbench.wxml` | 套餐卡片模板 |
| `miniprogram/pages/workbench/workbench.wxss` | 套餐卡片样式 |

## 3. 部署前人工确认

| 检查项 | 当前值 |
|--------|--------|
| 当前分支 | |
| 当前 commit | |
| 工作区是否 clean | |
| 是否已备份数据库 | |
| 测试租户 tenantId | |
| 测试租户当前 plan | |
| 测试租户当前 maxProjects | |
| 测试租户当前 maxStaff | |
| 平台管理员测试账号 | |
| 普通员工测试账号 | |
| 业主测试账号 | |

## 4. adminUpdateTenantPlan 风险提示

`adminUpdateTenantPlan` 可以修改 `subscriptions` 和 `tenants` 中的套餐字段。

### 允许调用的角色

```js
['admin', 'boss_qi', 'boss_hu', 'platform_admin']
```

### 禁止调用的角色

```js
['worker', 'designer', 'sales', 'project_manager', 'owner']
```

### 安全机制

- 必须通过 `cloud.getWXContext()` 获取当前 openid
- 不允许从前端传入 openid
- 每次调用都做权限校验
- 只更新指定的单个租户，不批量操作

## 5. 禁止事项

- 不执行数据库迁移
- 不执行 `initSaasDefaults`
- 不批量修改套餐
- 不批量回填 tenantId
- 不批量删除数据
- 不接支付
- 不做正式发布
- 不合并 master
- 不进入下一阶段
