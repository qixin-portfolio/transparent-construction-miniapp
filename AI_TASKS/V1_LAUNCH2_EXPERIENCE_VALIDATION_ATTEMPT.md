# Phase 7-LAUNCH-2-E：体验版验证阶段尝试记录

## 1. 当前基线

- 当前 commit：`9df2a94a02674e89ec807f38c08614291d3a9679`
- 当前 tag：`v1-launch2-role-entry-free-usage-mode`
- 当前分支：`codex/init-ai-collaboration`
- 本地/远端同步：`0 / 0`
- V2 状态：`ENABLE_V2_DEAL_LOOP_ENTRY = false`
- deal-loop guard：仍存在

## 2. 本阶段目标

进入 Phase 7-LAUNCH-2 的体验版验证阶段：

- 部署本次免费开放模式相关云函数
- 上传体验版用于真机验证首页角色分流
- 不发布正式版
- 不打开 V2

## 3. 部署前检查

已执行并通过：

- `node --check miniprogram/pages/workbench/workbench.js`
- `node --check miniprogram/pages/register/register.js`
- `node --check miniprogram/subpackages/internal/pages/plan-upgrade/plan-upgrade.js`
- `node --check cloudfunctions/createProject/index.js`
- `node --check cloudfunctions/getCurrentTenantPlan/index.js`
- `node --check cloudfunctions/createStaffInviteCode/index.js`
- `node --check cloudfunctions/bindStaffRole/index.js`
- `git diff --check`

工作区在部署前为 clean。

## 4. 计划部署云函数

本阶段只计划部署以下 4 个云函数：

- `createProject`
- `getCurrentTenantPlan`
- `createStaffInviteCode`
- `bindStaffRole`

原因：

- `createProject`：试运行期不强卡工地数量。
- `getCurrentTenantPlan`：返回 `freeUsageMode: true` 和免费开放提示。
- `createStaffInviteCode`：试运行期不强卡员工邀请码生成。
- `bindStaffRole`：试运行期不强卡员工激活。

## 5. 实际执行命令

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli cloud functions deploy \
  --env cloud1-d4g7zh8kpca0e26d5 \
  --names createProject getCurrentTenantPlan createStaffInviteCode bindStaffRole \
  --project "/Users/qixin/Documents/晟景AI助理/透明工地小程序/开发骨架" \
  --remote-npm-install
```

已重试 2 次。

## 6. 部署结果

部署失败。

4 个云函数均返回：

```txt
getCloudAPISignedHeader failed
ret: 41002
errmsg: system error.
```

失败函数：

| 云函数 | 结果 |
| --- | --- |
| `createProject` | 失败 |
| `getCurrentTenantPlan` | 失败 |
| `createStaffInviteCode` | 失败 |
| `bindStaffRole` | 失败 |

## 7. 已确认状态

已确认：

- 微信开发者工具 CLI 可用。
- CLI 登录状态为 `login: true`。
- 云环境列表可正常读取。
- 目标云环境存在：`cloud1-d4g7zh8kpca0e26d5`。

因此当前更像微信开发者工具 / 云开发签名服务临时错误，或本机开发者工具会话签名异常。

## 8. 是否上传体验版

未上传体验版。

原因：

- 前端体验版如果先上传，会显示“试运行免费开放”。
- 但云函数部署失败后，线上云端仍可能保留旧额度限制。
- 这会造成体验版前端和云函数行为不一致。

本阶段选择先停止，避免误导测试。

## 9. 未改变的事项

- 未发布正式版。
- 未打开 V2。
- 未修改 `ENABLE_V2_DEAL_LOOP_ENTRY`。
- 未执行数据库脚本。
- 未执行 `initSaasDefaults`。
- 未部署其它云函数。
- 未删除套餐字段。

## 10. 建议人工处理

建议在微信开发者工具中做一次人工刷新后再重试：

1. 打开微信开发者工具。
2. 确认当前项目为“晟景透明工地”。
3. 确认已登录正确的小程序管理员 / 开发者账号。
4. 确认云开发环境为 `cloud1-d4g7zh8kpca0e26d5`。
5. 如工具提示登录过期，重新扫码登录。
6. 先在开发者工具界面手动部署其中一个云函数，例如 `getCurrentTenantPlan`。
7. 如果手动部署成功，再回 Codex 重新执行 4 个云函数部署和体验版上传。

## 11. 体验版上传建议文案

云函数部署成功后，体验版建议使用：

- 版本号：`7.2.0`
- 备注：`V1上线后体验优化：首页角色分流；试运行期免费开放；V2成交闭环入口保持关闭。`

## 12. 是否建议继续

建议先解决云函数部署失败，再上传体验版。

当前不建议直接上传体验版。

---

## 13. 体验版上传补充确认

用户反馈云函数已在微信开发者工具中部署成功。

Codex 随后再次尝试通过 CLI 部署以下 4 个云函数，但 CLI 仍返回 `getCloudAPISignedHeader failed / ret=41002 / system error`：

- `createProject`
- `getCurrentTenantPlan`
- `createStaffInviteCode`
- `bindStaffRole`

因此云函数部署状态以用户在微信开发者工具中的人工部署成功反馈为准。

随后已通过微信开发者工具 CLI 上传体验版：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli upload \
  --project "/Users/qixin/Documents/晟景AI助理/透明工地小程序/开发骨架" \
  --version "7.2.0" \
  --desc "V1上线后体验优化：首页角色分流；试运行期免费开放；V2成交闭环入口保持关闭。" \
  --info-output "/Users/qixin/Documents/晟景AI助理/透明工地小程序/开发骨架/AI_TASKS/v1_launch2_upload_info.json"
```

上传结果：成功。

包体信息：

| 分包 | 大小 |
| --- | ---: |
| TOTAL | 1.9 MB |
| main | 1.3 MB |
| /subpackages/deal-loop/ | 131.6 KB |
| /subpackages/internal/ | 251.0 KB |
| /subpackages/owner/ | 156.5 KB |

当前确认：

- 体验版已上传。
- 未发布正式版。
- `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
- V2 成交闭环入口继续关闭。
- 体验版版本：`7.2.0`。
- 体验版备注：`V1上线后体验优化：首页角色分流；试运行期免费开放；V2成交闭环入口保持关闭。`

---

## 14. 体验版 7.2.1 注册闪退修复覆盖上传

基于修复 commit：`d5fd44fd1bb2cddd7a1baa23c7ff5c152996947b`

修复内容：

- 修复新用户点击“我是装修公司 / 管理员”进入注册公司页面时，因为残留扫码入口上下文或临时 `owner` 身份导致注册页闪退 / 自动跳走的问题。
- `pages/register/register?entry=boss_register` 会清理残留入口上下文，并保持在装修公司注册页。

体验版上传命令：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli upload \
  --project "/Users/qixin/Documents/晟景AI助理/透明工地小程序/开发骨架" \
  --version "7.2.1" \
  --desc "V1上线后体验优化补丁：修复新用户进入装修公司注册页闪退；V2成交闭环入口保持关闭。" \
  --info-output "/Users/qixin/Documents/晟景AI助理/透明工地小程序/开发骨架/AI_TASKS/v1_launch2_721_upload_info.json"
```

上传结果：成功。

包体信息：

| 分包 | 大小 |
| --- | ---: |
| TOTAL | 1.9 MB |
| main | 1.3 MB |
| /subpackages/deal-loop/ | 131.6 KB |
| /subpackages/internal/ | 251.0 KB |
| /subpackages/owner/ | 156.5 KB |

当前确认：

- 体验版 `7.2.1` 已上传。
- 未发布正式版。
- `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
- V2 成交闭环入口继续关闭。
