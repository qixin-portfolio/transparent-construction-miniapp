# SaaS Phase 3 最小部署步骤

## 部署顺序

### 步骤 1：确认基线

```bash
git status
git branch --show-current
git log --oneline -5
```

确认：
- 当前分支：`saas-phase3-manual-plan-admin`
- 工作区：clean
- 最新 commit：`d103dfc feat: show tenant plan usage on workbench`

### 步骤 2：确认测试账号和租户

确认以下信息已记录：
- 测试租户 tenantId
- 测试租户当前 plan / maxProjects / maxStaff
- 平台管理员测试 openid（admin / boss_qi / boss_hu）
- 普通员工测试 openid（worker / designer / sales / project_manager）
- 业主测试 openid（owner）

### 步骤 3：部署 getCurrentTenantPlan

```bash
# 使用微信开发者工具 CLI 或 IDE 部署
# 只部署 cloudfunctions/getCurrentTenantPlan/
```

部署后验证：
- 用老板账号调用，确认返回套餐信息
- 用无租户用户调用，确认返回 `success: false`

### 步骤 4：部署 adminUpdateTenantPlan

```bash
# 只部署 cloudfunctions/adminUpdateTenantPlan/
```

部署后验证：
- 用平台管理员账号调用，将测试租户改为 pro 套餐
- 调用 getCurrentTenantPlan 确认套餐变化
- 用普通员工账号调用，确认被拒绝

### 步骤 5：上传小程序体验版

上传代码，包含工作台套餐卡片改动。

### 步骤 6：验收测试

按 `PHASE3_ACCEPTANCE_TEST.md` 执行验收。

### 步骤 7：恢复测试数据

验收通过后，如果测试租户套餐被修改，人工恢复为原始值。

## 禁止

- 一次性部署多个无关云函数
- 执行数据库脚本
- 发布正式版
- 合并 master
- 进入下一阶段
