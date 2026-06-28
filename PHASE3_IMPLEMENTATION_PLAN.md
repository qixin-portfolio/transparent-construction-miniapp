# SaaS Phase 3 实施方案

## 1. 新增云函数清单

### 1.1 `getCurrentTenantPlan`

**用途**：获取当前登录用户所属租户的套餐信息，含已用额度统计。

**入参**：无（通过 `cloud.getWXContext()` 获取 openid）

**返回**：

```js
{
  tenantId,
  plan: 'free',            // free | starter | pro | enterprise
  status: 'trial',         // trial | active | expired | suspended
  maxProjects: 3,
  maxStaff: 3,
  usedProjects: 2,
  usedStaff: 1,
  enabledModules: ['project', 'daily_report', 'owner_view'],
  startAt: '2026-06-25T00:00:00Z',
  endAt: null
}
```

**权限校验**：登录用户必须有 `tenantId`（已注册租户）

**实现要点**：
- 从 `users` 查当前 openid，获取 `tenantId`
- 查询 `subscriptions` 集合获取套餐配置，若无记录则返回免费版默认值
- 统计 `projects` 中该租户的有效项目数（`deleted !== true`）
- 统计 `tenant_users` 或 `users` 中该租户的员工数（排除 `boss_qi`、`boss_hu`、`admin`、`owner`）
- 错误处理：无 `tenantId` 时返回 `{ tenantId: null }`

---

### 1.2 `adminUpdateTenantPlan`

**用途**：平台管理员手动修改指定租户的套餐额度。

**入参**：

```js
{
  tenantId: 'tenant_xxx',
  plan: 'pro',           // free | starter | pro | enterprise
  status: 'active',      // trial | active | expired | suspended
  maxProjects: 100,
  maxStaff: 50,
  enabledModules: ['project', 'daily_report', 'owner_view'],
  startAt: '2026-06-25T00:00:00Z',
  endAt: '2027-06-25T00:00:00Z',
  note: '客户升级到专业版'
}
```

**返回**：

```js
{
  success: true,
  plan: 'pro',
  status: 'active'
}
```

**权限校验**：
- 通过 `cloud.getWXContext()` 获取当前 openid
- 查询当前用户在 `users` 中的 `role`
- 仅允许 `['admin', 'boss_qi', 'boss_hu']` 调用
- 不允许普通员工、业主调用
- 不允许前端传 `openid` 冒充

**实现要点**：
- 更新 `subscriptions` 集合中对应 tenantId 的文档
- 同步更新 `tenants` 集合中的 `plan`、`status`、`maxProjects`、`maxStaff`
- 记录 `updatedAt` 为当前时间
- 如果传了 `note`，写入 `subscriptions.note` 字段
- 入参校验：`tenantId` 必填，至少传一个有效字段

---

### 1.3 `listTenantsForAdmin`（可选，建议本次新建）

**用途**：平台管理员查看租户列表，用于选择要编辑的租户。

**入参**：`{ page: 1, pageSize: 20 }`

**返回**：

```js
{
  total: 50,
  items: [
    {
      tenantId: 'tenant_xxx',
      tenantName: '某某装修公司',
      plan: 'free',
      status: 'trial',
      maxProjects: 3,
      maxStaff: 3,
      contactPhone: '138xxxx',
      createdAt: '2026-06-25T00:00:00Z'
    }
  ]
}
```

**权限校验**：同 `adminUpdateTenantPlan`

---

## 2. 修改页面清单

### 2.1 `pages/workbench/workbench.wxml`

在老板驾驶舱 `boss-dashboard-card` 内部追加套餐信息区块，放在员工排行之后、最新动态之前。

新增区域结构：

```
当前套餐卡片
├── 套餐名称（免费试用版 / 基础版 / 专业版 / 企业版）
├── 套餐状态（试用中 / 已开通 / 已过期）
├── 项目额度条：已用 X / 共 Y
├── 员工额度条：已用 X / 共 Y
└── 额度提示（接近上限 / 已用完时显示）
```

### 2.2 `pages/workbench/workbench.js`

- 在 `loadStaffDashboard` 中新增 `call('getCurrentTenantPlan')` 调用
- 将返回的套餐信息存入 `data.tenantPlan`
- 新增计算逻辑：`isNearLimit`、`isAtLimit`，用于展示提示文案

### 2.3 `pages/workbench/workbench.wxss`

新增套餐卡片样式。

### 2.4 `subpackages/internal/pages/tenant-manage/tenant-manage`（新增）

平台管理员后台入口页，仅平台管理员可见。

功能：
- 搜索租户（按名称/手机号）
- 展示租户列表（tenantId、租户名、套餐、状态、项目额度、员工额度）
- 点击租户跳转套餐编辑页

### 2.5 `subpackages/internal/pages/tenant-plan-edit/tenant-plan-edit`（新增）

套餐编辑页，仅平台管理员可见。

功能：
- 展示当前租户名和 tenantId（只读）
- 套餐选择：free / starter / pro / enterprise
- 状态选择：trial / active / expired / suspended
- 项目额度输入：maxProjects
- 员工额度输入：maxStaff
- 启用模块选择（多选）：project / daily_report / owner_view
- 开始时间、到期时间
- 备注输入
- 提交按钮
- 提交成功后返回列表页

### 2.6 `pages/profile/profile.wxml` + `profile.js`

如果用户角色为 `admin` / `boss_qi` / `boss_hu`，在 profile 页新增"平台管理"入口。

仅在用户有平台管理员权限时展示。<u>Phase 3 第一版为验证效果，可以先不做 profile 入口，通过手动拼接页面路径访问。</u> 建议放 Phase 3 第二版。

---

## 3. 权限校验方案

### 3.1 云函数端

所有新增云函数统一使用以下权限校验模式：

```js
const { OPENID } = cloud.getWXContext()
const userRes = await db.collection('users').where({ openid: OPENID, status: 'active' }).limit(1).get()
const user = userRes.data[0]
if (!user) throw new Error('未找到用户')
if (!['admin', 'boss_qi', 'boss_hu'].includes(user.role)) {
  throw new Error('无权限执行此操作')
}
```

**后续要独立出 `platform_admin` 角色**，但 Phase 3 第一版兼容现有 admin/boss 角色。

### 3.2 前端展示控制

管理员入口使用与云函数一致的权限判断：

```js
canManageTenants: ['admin', 'boss_qi', 'boss_hu'].indexOf(role) !== -1
```

---

## 4. 套餐字段方案

### 套餐名称映射

| plan 值 | 前端展示名称 |
|---------|------------|
| `free` | 免费试用版 |
| `starter` | 基础版 |
| `pro` | 专业版 |
| `enterprise` | 企业版 |

### 套餐状态映射

| status 值 | 前端展示 |
|-----------|---------|
| `trial` | 试用中 |
| `active` | 已开通 |
| `expired` | 已过期 |
| `suspended` | 已暂停 |

### 默认套餐值（免费版）

```js
{
  plan: 'free',
  status: 'trial',
  maxProjects: 3,
  maxStaff: 3,
  enabledModules: ['project', 'daily_report', 'owner_view']
}
```

### 额度不足文案

```js
// usedProjects >= maxProjects - 1 || usedStaff >= maxStaff - 1
'额度快用完了，如需增加项目或员工，请联系服务顾问升级套餐。'

// usedProjects >= maxProjects || usedStaff >= maxStaff
'当前套餐额度已用完，请联系服务顾问升级套餐。'
```

---

## 5. 老板端展示方案

### 布局位置

在老板驾驶舱 `boss-dashboard-card` 内部，放在员工排行 `boss-split-grid` **之后**、最新动态区块之前。这样套餐卡片出现在驾驶舱尾部，视觉上作为"底部信息"自然收尾。

### 卡片内容

```
┌────────────────────────────────────────┐
│  💳 当前套餐                           │
│                                        │
│  免费试用版                   试用中    │
│                                        │
│  项目额度  ████████░░░  已用 2 / 共 3  │
│  员工额度  ██████░░░░░  已用 1 / 共 3  │
│                                        │
│  ⚠ 额度快用完了，如需增加项目或员工，    │
│     请联系服务顾问升级套餐。             │
└────────────────────────────────────────┘
```

### 额度条 CSS

- 背景灰色条，进度条绿色（正常）/ 黄色（接近上限，剩余 >= 1）/ 红色（已达上限）
- 宽度 = `(已用量 / 总量) * 100%`

---

## 6. 平台管理员手动开通流程

### 完整流程

1. 平台管理员进入租户管理页（`tenant-manage`）
2. 系统调用 `listTenantsForAdmin` 展示租户列表
3. 管理员搜索或滚动找到目标租户
4. 点击进入编辑页（`tenant-plan-edit`），传入 `tenantId`
5. 编辑页加载时调用 `getCurrentTenantPlan`（带 `tenantId` 参数）获取当前设置
6. 管理员修改套餐参数
7. 提交调用 `adminUpdateTenantPlan`
8. 成功后退回列表页，列表自动刷新

### 最小可行版（仅云函数 + profile 页入口）

如果不想新增管理页面，第一阶段可只做：

1. 新增 `getCurrentTenantPlan` 云函数
2. 新增 `adminUpdateTenantPlan` 云函数
3. 老板工作台展示套餐卡片
4. profile 页新增"套餐管理"入口，点击后跳转简易表单页

这样不需要租户列表页，管理员直接在已知 tenantId 的页面操作即可。

---

## 7. 测试场景

### 场景 1：老板查看套餐

入口：老板账号登录 → 工作台 → 老板驾驶舱

预期：
- 看到"当前套餐"卡片
- 项目额度和员工额度正确显示
- 已用量与实际项目数、员工数一致

### 场景 2：接近上限提示

先决条件：免费租户已有 2 个项目或 2 名员工

预期：卡片底部显示"额度快用完了"提示

### 场景 3：额度已用完提示

先决条件：免费租户已有 3 个项目或 3 名员工

预期：卡片底部显示"额度已用完"提示，红色进度条

### 场景 4：平台管理员修改套餐（如有管理页面）

先决条件：平台管理员账号

操作：
1. 进入租户管理页
2. 选择目标租户
3. 将套餐从 `free` 改为 `pro`，maxProjects 设为 100
4. 提交

预期：
- `adminUpdateTenantPlan` 返回 `success: true`
- 老板端套餐卡片刷新后显示专业版、100 项目额度

### 场景 5：普通员工/业主调用被拒绝

使用非管理员 openid 直接调用 `adminUpdateTenantPlan`

预期：返回错误 `无权限执行此操作`

### 场景 6：套餐展示与权限限制的联动

先决条件：免费租户项目数已达 3

预期：
- 套餐卡片显示"额度已用完"
- 创建第 4 个项目时仍返回 `PLAN_PROJECT_LIMIT_REACHED`

---

## 8. 回滚方案

### 代码回滚

```bash
git checkout master
```

或回退到 Phase 2 tag：

```bash
git checkout saas-phase2-plan-limit-ok
```

### 云函数回滚

按影响范围回滚：

| 云函数 | 回滚操作 |
|--------|----------|
| `getCurrentTenantPlan` | 逐云函数文件恢复部署前一版本 |
| `adminUpdateTenantPlan` | 同上 |
| `listTenantsForAdmin` | 同上 |

### 前端回滚

- 回退 `workbench.wxml` / `workbench.js` 到 Phase 2 版本
- 删除新增的管理页面目录
- 恢复 `app.json` 中 subpackages 配置

### 数据库回滚

Phase 3 不涉及数据库迁移，subscriptions 和 tenants 集合字段不变。
如果 `adminUpdateTenantPlan` 误修改了套餐数据，可人工在控制台回退字段值。

---

## 9. 是否需要数据库迁移

**结论：不需要。**

现有 subscriptions 集合已有套餐相关字段：
- `plan`、`status`、`maxProjects`、`maxStaff`、`enabledModules`、`startAt`、`endAt`
- tenants 集合也有 `plan`、`status`、`maxProjects`、`maxStaff`

新增字段 `note`（可选，用于记录管理员备注）为非必须字段，不写也不影响功能。

Phase 3 完全在现有数据库结构上构建，无需迁移。
