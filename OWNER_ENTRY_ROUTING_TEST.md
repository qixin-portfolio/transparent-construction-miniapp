# OWNER_ENTRY_ROUTING_TEST

## 场景 1：新老板进入管理入口

步骤：
- 使用未注册微信打开工作台。

预期：
- `login` 返回 `needRegister: true`。
- 前端跳 `/pages/register/register?entry=boss_register`。
- 注册成功后创建 `tenant / subscription / tenant_user`。

## 场景 2：新业主扫码绑定工地

步骤：
- 使用未注册微信打开 `/subpackages/owner/pages/owner/owner?bindCode={code}`。

预期：
- 不进入装修公司注册页。
- 进入业主绑定页。
- 绑定成功后进入业主项目页。
- 不创建装修公司租户。

## 场景 3：已有业主扫码查看项目

步骤：
- 使用已绑定业主微信打开业主项目分享或进度页。

预期：
- 不进入装修公司注册页。
- 正常进入业主项目 / 进度页。

## 场景 4：新员工扫码邀请码

步骤：
- 使用未注册微信通过 `entry=staff_join`、`inviteCode`、`staffInviteCode` 或已有 `saasInviteFlow` 进入工作台。

预期：
- 不进入装修公司注册页。
- 正常进入员工加入流程。
- 输入邀请码后调用 `bindStaffRole`。

## 场景 5：新微信用户直接点工作台

步骤：
- 使用未注册微信直接打开 `pages/workbench/workbench`，且不携带员工/工长入口参数。

预期：
- 返回 `needRegister: true`。
- 跳转装修公司注册页。

## 场景 6：公开案例页 / 完工分享页 / 门店页

步骤：
- 打开公开案例页、完工分享页、门店页。

预期：
- 不跳装修公司注册页。
- 页面可以正常打开。
- `pages/projects/projects` 只有带 `entry=public`、`entry=owner_bind`、`from=share`、`bindCode`、`ownerBindCode` 或 `scene` 时放行。

