# Phase 7-LAUNCH-2：上线后首页角色分流与免费开放模式

## 1. 当前阶段

- 项目：透明工地小程序 SaaS / V1 上线后体验优化
- 阶段：Phase 7-LAUNCH-2：上线后首页角色分流与免费开放模式
- 当前基线 commit：079a878188afb8de8c3cd0441b5eb27b601af87f
- 当前基线 tag：v1-launch-day1-manual-inspection
- 当前分支：codex/init-ai-collaboration
- 本地/远端同步：0 / 0

## 2. 问题背景

小程序已正式上线。上线后发现所有新用户默认进入企业注册页，对真实业主、员工、工长、设计师不友好。

本阶段目标是把默认体验改为角色分流：

- 业主先进入业主查看装修进度入口
- 员工 / 工长先进入员工激活或工作入口
- 装修公司 / 管理员再进入企业注册或管理入口

同时当前进入上线试运行期，套餐和数量限制先不强卡，保留未来商业化字段和页面。

## 3. 原首页问题

审计结果：

- `miniprogram/app.json` 默认首页为 `pages/workbench/workbench`。
- 首次进入后看到公司注册页，不是因为默认页配置错误，而是 `app.ensureLogin()` 在无租户身份时触发 `redirectToRegister()`。
- 公司注册页位于：
  - `miniprogram/pages/register/register.js`
  - `miniprogram/pages/register/register.wxml`
  - `miniprogram/pages/register/register.wxss`
- 现有角色分发只在用户已有明确身份、业主绑定上下文或员工邀请码上下文时生效。
- 业主绑定入口已存在：`/subpackages/owner/pages/projects/projects`。
- 员工 / 工长入口已存在于 workbench 的员工邀请码弹窗和工长绑定工地弹窗。
- 老板 / 管理员工作台仍为 `pages/workbench/workbench`。
- 工地数量限制主要在 `cloudfunctions/createProject/index.js` 生效。
- 员工数量限制主要在 `cloudfunctions/createStaffInviteCode/index.js` 和 `cloudfunctions/bindStaffRole/index.js` 生效。
- 套餐展示和额度提示主要在 `cloudfunctions/getCurrentTenantPlan/index.js`、workbench 套餐卡片、套餐页面生效。

## 4. 新角色分流方案

本阶段复用现有 `pages/workbench/workbench` 作为默认首页，不新增独立入口页，避免改动 `app.json` 默认路由。

当 `ensureLogin({ skipRegisterRedirect: true })` 判断用户没有企业身份且不应自动跳注册页时，workbench 展示角色选择：

1. 我是业主
2. 我是员工 / 工长
3. 我是装修公司 / 管理员

企业注册入口保留，但不再作为所有用户的默认入口。

## 5. 业主入口逻辑

点击“我是业主”后进入：

`/subpackages/owner/pages/projects/projects`

逻辑：

- 已绑定项目：展示业主项目列表、施工进度、完工服务等。
- 未绑定项目：展示绑定码输入入口。
- 不跳企业注册页。

## 6. 员工 / 工长入口逻辑

点击“我是员工 / 工长”后：

- 已识别为内部员工、工长、设计师、销售或项目经理：进入对应工作台。
- 未识别身份：先创建可登录的微信用户，再打开员工邀请码激活弹窗。
- 工长绑定工地仍使用原有工地绑定码逻辑。
- 不跳企业注册页。

## 7. 企业 / 管理员入口逻辑

点击“我是装修公司 / 管理员”后：

- 已是老板 / 管理员且已有企业：进入老板工作台。
- 未开通企业：进入 `pages/register/register?entry=boss_register`。

注册页文案已改为“注册装修公司”，并增加“返回身份选择”入口，提醒业主和员工不要注册公司。

## 8. 自动分流规则

现有明确身份继续自动进入对应首页：

1. `owner`：进入业主端首页。
2. `worker` / `project_manager`：进入工长工作台。
3. `designer` / `sales`：进入内部员工工作台。
4. `admin` / `boss_qi` / `boss_hu`：进入老板工作台。
5. 无明确身份：显示角色选择首页。

如果同一用户后续需要切换身份，仍通过现有邀请码 / 绑定码机制处理，不放宽数据权限。

## 9. 免费开放模式说明

新增试运行开关：

- `ENABLE_FREE_TRIAL_USAGE = true`

生效范围：

- 创建工地不再因 `maxProjects` 被强制阻断。
- 生成员工邀请码不再因 `maxStaff` 被强制阻断。
- 激活员工邀请码不再因 `maxStaff` 被强制阻断。
- 套餐查询返回 `freeUsageMode: true`。
- 老板工作台和套餐页展示“试运行免费开放”说明。

## 10. 套餐限制处理方式

本阶段没有删除套餐字段，仍保留：

- `plan`
- `status`
- `maxProjects`
- `maxStaff`
- `rawMaxProjects`
- `rawMaxStaff`
- `enabledModules`
- `subscription`
- `tenant plan`

处理方式：

- 云函数侧通过 `ENABLE_FREE_TRIAL_USAGE = true` 暂停硬限制。
- 展示侧使用“暂不限制”文案，不再提示强制升级。
- 套餐页保留后续套餐预留，但点击升级只提示试运行期免费开放，不调用升级写库。

## 11. 权限安全确认

本阶段只优化入口体验和套餐硬限制，不放宽数据读取权限：

- 业主项目仍由业主相关云函数按绑定关系返回。
- 员工 / 工长项目仍由原项目成员和绑定逻辑控制。
- 普通员工仍不能看到老板管理入口。
- 普通员工仍不能看到 V2 成交闭环入口。
- 未绑定业主不能看到其他业主项目。
- 未加入企业员工不能看到企业项目。
- `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
- deal-loop 页面 guard 未删除。

## 12. 修改文件列表

- `miniprogram/pages/workbench/workbench.js`
- `miniprogram/pages/workbench/workbench.wxml`
- `miniprogram/pages/workbench/workbench.wxss`
- `miniprogram/pages/register/register.js`
- `miniprogram/pages/register/register.wxml`
- `miniprogram/subpackages/internal/pages/plan-upgrade/plan-upgrade.js`
- `miniprogram/subpackages/internal/pages/plan-upgrade/plan-upgrade.json`
- `miniprogram/subpackages/internal/pages/plan-upgrade/plan-upgrade.wxml`
- `miniprogram/subpackages/internal/pages/plan-upgrade/plan-upgrade.wxss`
- `cloudfunctions/createProject/index.js`
- `cloudfunctions/getCurrentTenantPlan/index.js`
- `cloudfunctions/createStaffInviteCode/index.js`
- `cloudfunctions/bindStaffRole/index.js`
- `AI_TASKS/V1_LAUNCH2_ROLE_ENTRY_AND_FREE_USAGE_MODE.md`

## 13. 测试结果

已执行静态检查：

- `node --check miniprogram/pages/workbench/workbench.js`：通过
- `node --check miniprogram/pages/register/register.js`：通过
- `node --check miniprogram/subpackages/internal/pages/plan-upgrade/plan-upgrade.js`：通过
- `node --check cloudfunctions/createProject/index.js`：通过
- `node --check cloudfunctions/getCurrentTenantPlan/index.js`：通过
- `node --check cloudfunctions/bindStaffRole/index.js`：通过
- `node --check cloudfunctions/createStaffInviteCode/index.js`：通过
- `miniprogram/app.json` JSON 解析：通过
- `miniprogram/subpackages/internal/pages/plan-upgrade/plan-upgrade.json` JSON 解析：通过
- `git diff --check`：通过

已执行静态安全检查：

- `miniprogram/pages/workbench/workbench.js` 中 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
- `miniprogram/subpackages/deal-loop/utils/accessGuard.js` 中 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
- deal-loop guard 仍使用 `ENABLE_V2_DEAL_LOOP_ENTRY && boss role`。
- 本阶段未新增真实 AI API。
- 本阶段未新增自动调用 `createProject`。
- 本阶段未修改 `app.json` 默认首页，默认首页仍为 `pages/workbench/workbench`，但其内部逻辑已改为角色分流。

待体验版验证：

- 新微信用户进入首页是否显示三入口。
- 业主入口是否能进入项目绑定页。
- 员工入口是否能打开邀请码激活弹窗。
- 管理员入口是否进入装修公司注册页。
- 老板已有账号是否仍自动进入工作台。
- 创建工地、生成员工邀请码、激活员工邀请码是否不再被套餐额度阻断。

## 14. 是否建议上传体验版验证

建议上传体验版验证。

理由：

- 本阶段涉及首页首屏体验和登录后分流，需要真机确认微信登录、弹窗、tab 页切换是否符合预期。
- 本阶段涉及云函数侧套餐限制开关，如要让线上立即生效，后续需要按部署计划部署相关云函数。
- 本阶段不建议直接发布正式版，应先体验版验证新用户、业主、员工、老板四类入口。
