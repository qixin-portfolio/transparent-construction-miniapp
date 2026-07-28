# 首次进入与授权现状审计

审计基线：`821d96efa7f4d1495939703cc58d028a2ea75d6d`
审计日期：2026-07-28

## 结论

当前普通首次进入会在 `pages/workbench/workbench` 调用 `app.ensureLogin()`。对于没有租户身份的用户，`login` 云函数返回 `needRegister`，前端随即跳转 `pages/register/register?entry=boss_register`。因此，普通业主未能先体验服务，而是进入了装修公司开通流程。

本仓库不存在微信手机号授权或手机号匹配实现：未找到 `getPhoneNumber`、手机号解密、`encryptedData`/`iv` 处理，或按手机号查询并绑定业主项目的云函数。不能在本轮把不存在的能力称为“复用现有手机号验证”。

## 启动与路由

| 项目 | 现状 | 位置 |
| --- | --- | --- |
| 应用启动 | `onLaunch` 初始化 CloudBase 并捕获入口上下文；`onShow` 在注册页时按入口上下文重路由 | `miniprogram/app.js` |
| 主包首个页面 | `pages/workbench/workbench` | `miniprogram/app.json` |
| 当前普通入口 | 工作台 `onShow` 调用 `ensureLogin()`；非首个用户、无租户时跳转老板注册页 | `miniprogram/pages/workbench/workbench.js`、`miniprogram/app.js`、`cloudfunctions/login/index.js` |
| 当前公开入口 | `pages/projects/projects?entry=public` 仍调用 `ensureLogin({ allowGuestFlow: true })` 和 `listOwnerProjects`，不是离线公开体验 | `miniprogram/app.js`、`miniprogram/pages/projects/projects.js` |
| 已登录恢复 | `login` 用当前微信 OpenID 查询 `users`；工作台按 `role` 加载业主或员工数据 | `cloudfunctions/login/index.js`、`miniprogram/pages/workbench/workbench.js` |
| 角色分流 | 业主在工作台加载业主门户；老板/员工留在原工作台。注册页另有业主至项目列表、员工至工作台的恢复分流 | `miniprogram/pages/workbench/workbench.js`、`miniprogram/pages/register/register.js` |

## 授权与个人资料

| 项目 | 审计结果 | 位置 |
| --- | --- | --- |
| 手机号授权 | 未实现；未找到 `getPhoneNumber` 或同等调用 | 全仓库 `miniprogram/`、`cloudfunctions/` 搜索 |
| 微信头像/昵称前置 | 不存在于启动或登录链路 | `miniprogram/app.js`、`cloudfunctions/login/index.js` |
| 微信头像/昵称采集 | 仅“我的”页主动编辑，使用 `chooseAvatar` 与 `type="nickname"`，保存时调用 `updateMyProfile` | `miniprogram/pages/profile/profile.wxml`、`miniprogram/pages/profile/profile.js` |
| 资料缺失行为 | 当前工作台只展示“完善微信头像昵称”提示，不阻止业主核心页加载 | `miniprogram/pages/workbench/workbench.wxml` |
| 隐私说明页面 | 未找到独立隐私保护指引页面或配置文件；需在提审前补充并与实际授权用途一致 | 全仓库文件名与文案搜索 |

## 邀请上下文

当前存在可靠的业主绑定码体系，但不是手机号邀请体系：

- `bindCode` / `ownerBindCode` 可直接传入，或由 `scene`、`q` 解析得到。
- `createOwnerBindCode` 服务端创建 6 位、7 天有效的项目绑定码。
- 应用会把该上下文路由到原业主工地页；业主在页面中手动输入/确认绑定码，调用 `bindOwnerProject`。
- 现有分享卡片没有携带 `projectId`，也不会在验证前公开项目详情。

相关位置：`miniprogram/app.js`、`miniprogram/subpackages/owner/pages/owner/owner.js`、`cloudfunctions/createOwnerBindCode/index.js`、`cloudfunctions/bindOwnerProject/index.js`。

## 本轮实施约束

1. 公开首页和示例工地可在不调用 CloudBase 的前提下实现。
2. 已登录用户可以通过既有 `login` + 角色模型恢复到原业务页，但必须先为启动分流补充可验证的路由逻辑。
3. “微信手机号快捷验证”及其“匹配一个/多个/未匹配项目”结果页依赖当前仓库不存在的授权、手机号解密和匹配契约。未获得明确的后端接口/数据归属确认前，不实现伪造按钮或新建账号体系。
4. `bindCode` 邀请确认页可以复用现有绑定码体系，但不能把绑定码误称为手机号验证。
