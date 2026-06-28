# OWNER_ENTRY_ROUTING_AUDIT

## 1. needRegister 跳转触发点

- `cloudfunctions/login/index.js` 在普通新用户且未允许 guest flow 时返回 `needRegister: true`。
- `miniprogram/app.js` 的 `ensureLogin()` 接收 `needRegister: true` 后负责前端分流。
- 修复前，`redirectToRegister()` 直接跳 `/pages/register/register`，没有区分老板、业主、员工、公开入口。

## 2. 业主扫码实际入口

- 管理端项目详情页分享业主绑定码时，路径为：
  - `/subpackages/owner/pages/owner/owner?bindCode={code}`
- 业主项目列表入口为：
  - `/subpackages/owner/pages/projects/projects`
- 业主绑定云函数为：
  - `bindOwnerProject`

## 3. 员工和工长入口

- 当前没有独立员工加入页。
- 员工邀请码入口主要在 `pages/workbench/workbench` 输入 6 位邀请码，调用 `bindStaffRole`。
- 工长绑定入口在 `pages/workbench/workbench` 和 `pages/projects/projects` 中输入 6 位工长绑定码，调用 `bindWorkerProject`。
- 从注册页点击“已有员工邀请码”会写入本地 `saasInviteFlow` 后跳转工作台。

## 4. 禁止跳公司注册的页面

- 业主入口：
  - `subpackages/owner/pages/owner/owner`
  - `subpackages/owner/pages/projects/projects`
- 公开案例和完工分享：
  - `subpackages/owner/pages/case-list/case-list`
  - `subpackages/owner/pages/case-detail/case-detail`
  - `subpackages/owner/pages/completed-home/completed-home`
  - `subpackages/owner/pages/completion-album/completion-album`
  - `subpackages/owner/pages/owner-archive/owner-archive`
- 工作台员工/工长入口：
  - `pages/workbench/workbench` 只有存在 `saasInviteFlow`、`inviteCode`、`staffInviteCode`、`workerBindCode`、`entry=staff_join` 或 `entry=worker_bind` 时放行。
- 门店/公开页：
  - `pages/projects/projects` 只有存在 `entry=public`、`entry=owner_bind`、`from=share`、`bindCode`、`ownerBindCode` 或 `scene` 时放行。

## 5. 修复方案

- `needRegister: true` 不再无条件跳装修公司注册页。
- `miniprogram/app.js` 新增 `getCurrentPageInfo()`，基于当前 `route + options` 判断入口类型。
- 老板管理入口跳 `/pages/register/register?entry=boss_register`。
- 业主、员工/工长邀请码、公开页面入口不跳装修公司注册。
- `miniprogram/pages/register/register.js` 读取 `entry`，只有 `entry=boss_register` 才允许提交公司注册。
- 非老板入口误入注册页时提示“请从装修公司注册入口进入”，优先返回上一页，无上一页时跳公开门店页。

