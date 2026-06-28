# SaaS Phase 3 范围审计报告

## 审计结论

基于当前代码审计，Phase 3（平台管理员手动套餐管理 + 装修公司老板端套餐展示）基本可从零开始构建。现有代码中套餐相关的基础设施已就绪，但前端套餐展示和后台管理页面完全空白。

---

## 1. 当前是否已有套餐展示逻辑

**否。** 当前没有任何套餐展示逻辑：

- `getBossDashboard` 返回的 dashboard 数据中没有 `plan`、`subscription` 或套餐相关字段
- `miniprogram/pages/workbench/workbench.js` 中的 `bossMetrics` 只有日报、项目、客户转化等指标，没有套餐额度
- 老板端和 profile 页均无任何套餐信息的 UI 元素
- 未搜索到 `getCurrentTenantPlan`、`planInfo`、`套餐` 等关键字

---

## 2. 当前是否已有平台管理员角色

**否。** 当前角色体系中：

- `constants.js` 定义的角色：`admin`、`boss_qi`、`boss_hu`、`designer`、`sales`、`project_manager`、`worker`、`owner`
- 没有独立的 `platform_admin` 角色
- `admin` 角色实际是"装修公司内部管理员"，并非跨租户的平台管理员
- `SAAS_AUDIT.md` 中已标注后续需要新增 `platform_admin`

当前权限树中用于控制"超级权限"的角色集合（各云函数中定义）：

- `MANAGER_ROLES` / `REVIEW_ROLES` / `BOSS_ROLES`：`['admin', 'boss_qi', 'boss_hu']`
- 没有跨租户级别的角色定义

---

## 3. 当前老板工作台适合放套餐卡片的位置

老板工作台（`miniprogram/pages/workbench/workbench.wxml`）的结构：

- 第 132-219 行：员工端头部 + 新手引导（工人专有视图）
- 第 220-232 行：概览网格（工地数、待审核数、售后数）
- 第 240-320 行：**老板驾驶舱**（`boss-dashboard-card`）—— 这是最适合放套餐卡片的位置
  - 当前包含：老板驾驶舱标题、概览指标、异常提醒、员工排行、最新动态
- 第 323-350 行：施工透明核心闭环
- 第 352-385 行：快捷操作

**最佳位置**：在老板驾驶舱 `boss-dashboard-card` 内部尾部追加"当前套餐"区块，或者在老板驾驶舱与快捷操作之间独立插入。

---

## 4. 当前是否已有超级后台入口

**否。** 小程序页面结构中：

- tabBar 页面：workbench（工地）、projects（晟景）、profile（我的）
- subpackages/owner：业主端页面
- subpackages/internal：内部管理页面（项目详情、日报、图纸、员工管理、售后）
- 没有任何超级后台入口或租户管理页面
- profile 页面没有预留管理员后台入口

---

## 5. 需要新增哪些云函数

| 云函数 | 用途 |
|--------|------|
| `getCurrentTenantPlan` | 获取当前用户所属租户的套餐信息，含已用额度统计 |
| `adminUpdateTenantPlan` | 平台管理员手动修改租户套餐额度 |
| `listTenantsForAdmin` | （可选）平台管理员查看租户列表 |

其中前两个为必建，第三个可根据是否有管理页面决定是否新增。

---

## 6. 需要修改哪些页面

| 页面 | 修改内容 |
|------|----------|
| `pages/workbench/workbench.wxml` | 老板/管理员区域新增套餐信息卡片 |
| `pages/workbench/workbench.js` | 加载老板驾驶舱时同时获取套餐信息 |
| `pages/profile/profile.wxml` | （可选）管理员新增"租户管理"入口 |
| `pages/profile/profile.js` | （可选）新增跳转管理入口逻辑 |

如果新增管理页面：

| 页面 | 说明 |
|------|------|
| `subpackages/internal/pages/tenant-manage/tenant-manage` | 租户列表页（仅平台管理员可见） |
| `subpackages/internal/pages/tenant-plan-edit/tenant-plan-edit` | 租户套餐编辑页（仅平台管理员可见） |

需要在 `app.json` subpackages/internal 中注册这两个页面。

---

## 7. 本阶段不做哪些事情

| 不做 | 原因 |
|------|------|
| 微信支付 | 等产品跑通后再接入 |
| 自动续费 | 依赖支付，先不做 |
| 订单系统 | 未到时机 |
| 发票 | 未到时机 |
| 对公转账记录 | 未到时机 |
| 超级后台大重构 | 只做最小管理功能 |
| 文件上传路径租户隔离 | 留到 Phase 3 以后 |
| owner_bindings 标准化 | 留到 Phase 3 以后 |
| 数据库迁移 | 当前 subscriptions 结构可以直接使用 |
| initSaasDefaults | 禁止执行 |
| 批量回填数据 | 禁止执行 |

---

## 8. 现有基础设施评估

### subscriptions 集合字段结构（来自 registerTenant）

```js
{
  tenantId,
  tenantName,
  plan: 'free',            // free | starter | pro | enterprise
  subscriptionPlan: 'free',
  status: 'trial',         // trial | active | expired | suspended
  subscriptionStatus: 'trial',
  startAt: now,
  endAt: null,
  maxProjects: 3,
  maxStaff: 3,
  maxUsers: 3,
  enabledModules: ['project', 'daily_report', 'owner_view'],
  paymentStatus: 'unpaid',
  createdAt: now,
  updatedAt: now
}
```

### tenants 集合相关字段

```js
{
  tenantId,
  tenantName,
  contactPhone,
  createdByOpenid,
  plan: 'free',
  status: 'trial',
  maxProjects: 3,
  maxStaff: 3,
  ...
}
```

结论：**数据库无需迁移**，subscriptions 和 tenants 已有套餐字段可直接使用。
