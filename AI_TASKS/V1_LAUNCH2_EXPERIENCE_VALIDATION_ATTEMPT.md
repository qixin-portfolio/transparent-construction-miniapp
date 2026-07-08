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
