# 晟景透明工地小程序 V4 正式版发布前检查

## 1. 当前基线

| 项目 | 内容 |
|------|------|
| 当前分支 | `release-preflight-v4`（从 master 创建） |
| 基线 commit | `784edee merge: fix pending stage log photo display` |
| 体验版版本 | `4.0.0` |
| 当前是否发布正式版 | 否 |
| 是否执行数据库脚本 | 否 |
| 是否执行 `initSaasDefaults` | 否 |
| 工作区状态 | clean |
| stash 是否保留 | 是（`stash@{0}: wip unrelated files before phase3 merge`） |

## 2. 已完成能力

### Phase 1：SaaS 老板注册租户

- 老板注册装修公司公司，创建 tenant / subscription / tenant_branding / tenant_user
- 老晟景账号登录不受影响
- 新微信管理入口跳公司注册页
- 业主扫码绑定工地不被注册页拦截
- 员工/工长邀请码入口不被注册页拦截
- 公开案例/完工分享/门店页不被注册页拦截

### Phase 2：套餐限制与租户隔离

- `createProject` 检查免费版项目数（最多 3 个）
- `createStaffInviteCode` / `bindStaffRole` 检查员工数（最多 3 个）
- `listPendingStageLogs` 二次查询 projects 带 tenantId 过滤
- 跨租户数据隔离

### Phase 3：手动套餐管理

- `getCurrentTenantPlan` 查询当前租户套餐信息
- `adminUpdateTenantPlan` 平台管理员手动修改套餐
- 老板工作台套餐卡片展示（套餐名、项目额度、员工额度）
- 权限白名单收窄（管理员角色白名单已移除 manager）
- 业主/员工入口分流稳定修复

### Phase 4：AI 业主摘要

- `aiGenerateOwnerSummary` 云函数（OpenAI-compatible 模型）
- 审核页 "AI 生成业主摘要" 按钮（仅 admin / boss 可见）
- AI 摘要填入可编辑 textarea，老板确认后审核通过保存
- `reviewStageLog` 审核通过时保存 `ownerSummary`
- worker / owner 前端隐藏 AI 按钮 + 后端 FORBIDDEN 双层控制
- AI 不自动审核、不自动通知业主、不直接写数据库

### 照片修复

- `listPendingStageLogs` 调用 `getTempFileURL` 返回临时 URL
- 审核页照片缩略图正常显示
- 点击照片可正常预览

## 3. 已部署云函数清单

| 云函数 | 部署状态 | 发布前需重新部署 | 风险等级 |
|--------|---------|----------------|---------|
| `registerTenant` | 已部署 | 否 | 低 |
| `getCurrentTenantPlan` | 已部署 | 否 | 低 |
| `adminUpdateTenantPlan` | 已部署 | 否 | 低（权限收窄后安全） |
| `aiGenerateOwnerSummary` | 已部署 | 否 | 中（需确认 AI API Key） |
| `reviewStageLog` | 已部署 | 否 | 低（仅新增 ownerSummary 保存） |
| `listPendingStageLogs` | 已部署 | 否 | 低（仅新增 tempURL 字段） |
| `createProject` | 已部署 | 否 | 低 |
| `createStaffInviteCode` | 已部署 | 否 | 低 |
| `bindStaffRole` | 已部署 | 否 | 低 |
| `login` | 已部署 | 否 | 中（分流逻辑，发布前需确认） |
| `submitStageLog` | 已部署 | 否 | 低 |
| `getOwnerProject` | 已部署 | 否 | 低 |
| `getProjectDetail` | 已部署 | 否 | 低 |

## 4. 正式发布前必须人工确认的配置

### SaaS 配置

| 配置项 | 状态 | 备注 |
|--------|------|------|
| 晟景老租户 tenantId | 未确认 | 需人工确认 |
| 晟景老租户 plan | 未确认 | 建议为 enterprise |
| 晟景老租户 maxProjects | 未确认 | 建议为 9999 或更高 |
| 晟景老租户 maxStaff | 未确认 | 建议为 9999 或更高 |
| 新租户免费版额度 | 代码默认 | maxProjects: 3, maxStaff: 3 |
| 平台管理员账号 | 未确认 | 需要在 users 中有对应角色 |

### AI 配置

| 配置项 | 状态 | 备注 |
|--------|------|------|
| AI_API_KEY | 已配置 | 在云函数环境变量中，未写入代码 |
| AI_BASE_URL | 已配置 | DeepSeek base url |
| AI_MODEL | 已配置 | deepseek-chat |
| AI 调用是否成功 | 已验证 | 管理员调用成功 |
| AI 失败时不影响审核 | 已验证 | try/catch 降级 |

### 权限配置

| 配置项 | 状态 | 备注 |
|--------|------|------|
| adminUpdateTenantPlan 允许角色 | 已验证 | `['admin', 'boss_qi', 'boss_hu', 'platform_admin', 'super_admin']` |
| aiGenerateOwnerSummary 允许角色 | 已验证 | `['admin', 'boss_qi', 'boss_hu']` |
| worker 能否调用 AI | 已验证 | 不能（前端隐藏按钮 + 后端 FORBIDDEN） |
| owner 能否调用 AI | 已验证 | 不能（同上） |

## 5. 正式发布前真机验收清单

发布前建议逐项验收：

### 老板 / 管理员验收

- [ ] 新老板注册公司（新微信进管理入口 → 公司注册页 → 跳工作台）
- [ ] 老晟景老板登录不受影响
- [ ] 老板创建项目
- [ ] 免费版项目数达到 3 后被拦截
- [ ] 老板工作台查看套餐卡片
- [ ] 平台管理员手动升级套餐后额度生效
- [ ] 管理员审核日报，照片正常显示
- [ ] 管理员 AI 生成业主摘要
- [ ] 管理员编辑摘要并审核通过
- [ ] 业主端能看到审核后的摘要和照片

### 员工 / 工长验收

- [ ] 员工/工长扫码邀请码加入公司
- [ ] 免费版员工数达到 3 后被拦截
- [ ] 员工上传日报和照片
- [ ] 员工审核页看不到 AI 按钮
- [ ] 员工不能直接调用 AI 摘要云函数

### 业主验收

- [ ] 新业主扫码绑定工地，不被公司注册页拦截
- [ ] 业主查看项目进度
- [ ] 业主只能看到审核通过的日报和照片
- [ ] 业主摘要正常展示
- [ ] 业主不能生成 AI 摘要

### 公开页面验收

- [ ] 公开案例页正常打开
- [ ] 完工分享页正常打开
- [ ] 门店页正常打开

## 6. 正式发布禁止事项

1. **禁止执行** `initSaasDefaults`——该脚本具有批量初始化和回填能力，生产环境后果未知
2. **禁止执行数据库迁移脚本**——如需迁移，必须先输出迁移方案经确认后执行
3. **禁止批量回填 tenantId**——可能破坏现有数据关联
4. **禁止批量修改套餐**——所有套餐修改应通过控制台手动操作或 `adminUpdateTenantPlan`
5. **禁止批量删除数据**——如需清理测试数据，先记录 tenantId/openid，人工确认后逐条处理
6. **禁止恢复 stash**——`stash@{0}` 包含历史遗留文件，后续单独处理
7. **禁止将 API Key 写入代码**——所有密钥必须通过微信云开发控制台环境变量配置
8. **禁止发布未经体验版验收的代码**——正式版必须基于体验版验收通过的基线

## 7. 当前遗留问题

| 问题 | 状态 | 是否阻塞发布 |
|------|------|------------|
| stash@{0} 遗留文件 | 保留待处理 | 不阻塞 |
| geo-content-center/ 已在 master | 已进入 Phase 3 分支历史，不影响小程序 | 不阻塞 |
| 照片显示问题 | 已修复（photo-display-fix-ok） | 不阻塞 |
| 平台管理员后台页面 | 未实现 | 不阻塞（可通过云函数手动管理） |
| 支付接入 | 未接入 | 不影响当前体验版发布 |
| 文件路径按 tenantId 隔离 | 未做 | Phase 3 风险项，不影响发布 |
| owner_bindings 标准化 | 未做 | 不影响发布 |
| 在线套餐购买 | 未接入 | 当前为手动管理 |

## 8. 发布建议

当前版本已具备 SaaS 多租户基础能力、套餐限制、AI 业主摘要等核心功能。建议：

**短期（已满足）→ 体验版/小范围试用**

当前基线 `784edee` 经过 Phase 1-4 验收和照片修复验证，云函数均已部署，AI 配置已验证。可以支持第一批装修公司体验版或小范围试用。

**发布前必须完成：**

1. 人工确认晟景老租户套餐额度（见第 4 节 SaaS 配置）
2. 确认平台管理员账号已配置
3. 运行真机验收清单（第 5 节）

**不阻塞但建议记录的事项：**

- 照片问题已修复，但根本原因（cloud fileID 直接渲染不稳定）未根治，后续可统一在各云函数中增加 tempURL 转换兜底
- 文件路径 tenantId 隔离建议在 Phase 5 中做
- 支付和套餐购买可在客户试用反馈后决定优先级
