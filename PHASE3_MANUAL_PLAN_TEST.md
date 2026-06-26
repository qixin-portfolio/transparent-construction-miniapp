# SaaS Phase 3 手动套餐管理测试文档

## 场景 1：老板查看套餐卡片

**前置**：老板账号登录（admin / boss_qi / boss_hu）

**操作**：进入工作台

**预期**：
- 工作台正常打开
- 老板驾驶舱尾部显示"当前套餐"卡片
- 显示套餐名称（如免费试用版）
- 显示套餐状态（如试用中）
- 显示项目额度进度条和已用量
- 显示员工额度进度条和已用量
- 工作台其他功能不受影响

**检查点**：
- 不影响概览数据
- 不影响异常提醒
- 不影响员工排行
- 不影响最新动态

---

## 场景 2：免费版额度显示

**前置**：免费租户老板登录

**预期**：
- planName 显示为"免费试用版"
- statusText 显示为"试用中"
- maxProjects 显示为 3
- maxStaff 显示为 3
- 进度条百分比根据实际使用量计算

---

## 场景 3：接近上限提示

**前置**：免费租户已有 2 个项目或 2 名员工

**预期**：
- isProjectNearLimit 或 isStaffNearLimit 为 true
- 进度条显示黄色（warn 类）
- 卡片底部显示"额度快用完了"提示文案

---

## 场景 4：已达上限提示

**前置**：免费租户已有 3 个项目或 3 名员工

**预期**：
- isProjectAtLimit 或 isStaffAtLimit 为 true
- 进度条显示红色（danger 类）
- 卡片底部显示"当前套餐额度已用完"提示文案

---

## 场景 5：平台管理员手动升级套餐

**前置**：admin / boss_qi / boss_hu 账号

**操作**：
1. 调用 `adminUpdateTenantPlan`，传入目标 tenantId，将 plan 改为 `pro`，maxProjects 设为 100

**预期**：
- 返回 `success: true`
- subscriptions 和 tenants 同步更新
- 老板端刷新后套餐卡片显示"专业版"
- 项目额度变为 100

---

## 场景 6：普通员工无权修改套餐

**前置**：worker / designer / sales / project_manager / owner 账号

**操作**：直接调用 `adminUpdateTenantPlan`

**预期**：
- 返回 `success: false`
- message 为"无权限执行此操作"

---

## 场景 7：套餐修改后 Phase 2 限制联动

**前置**：免费租户已有 3 个项目

**操作**：
1. 尝试创建第 4 个项目，预期被拦截
2. 管理员将该租户改为 pro 套餐（maxProjects: 100）
3. 再次尝试创建第 4 个项目

**预期**：
- 修改前：`PLAN_PROJECT_LIMIT_REACHED`
- 修改后：第 4 个项目可以创建

---

## 场景 8：无租户用户调用

**前置**：全新微信用户（未注册租户）

**操作**：调用 `getCurrentTenantPlan`

**预期**：
- 返回 `success: false`
- message 为"用户未注册租户"
- 不抛出未处理异常
