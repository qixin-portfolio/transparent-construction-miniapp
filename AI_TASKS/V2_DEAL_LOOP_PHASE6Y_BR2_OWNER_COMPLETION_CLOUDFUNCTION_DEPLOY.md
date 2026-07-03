# Phase 6-Y-BR2：部署完工服务识别修复云函数

## 1. 当前阶段

Phase 6-Y-BR2：部署完工服务识别修复云函数。

本阶段目标是将 Phase 6-Y-BR1 已提交的完工服务识别修复部署到线上云函数，让业主端能够识别：

- `statusCode: delivered`
- `status: 已交付`

用于解决“确认竣工交付后，绑定业主可能看不到完工服务”的问题。

## 2. 部署前 commit / tag

- 部署前 commit：`1f4ce6f61da3709d040c5f770367cf1c553516df`
- 部署前 tag：`v2-deal-loop-phase6y-br1-owner-completion-status-fix`
- 部署前分支：`codex/init-ai-collaboration`
- 部署前状态：`git status` clean

## 3. 部署云函数列表

本阶段只部署以下两个云函数：

1. `cloudfunctions/getCompletedOwnerHome`
2. `cloudfunctions/getOwnerPortal`

## 4. 部署命令或微信开发者工具操作记录

部署前检查：

```bash
git status --short --branch
git rev-parse HEAD
git tag --points-at HEAD
node --check cloudfunctions/getCompletedOwnerHome/index.js
node --check cloudfunctions/getOwnerPortal/index.js
```

部署命令：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli cloud functions deploy \
  --env cloud1-d4g7zh8kpca0e26d5 \
  --names getCompletedOwnerHome getOwnerPortal \
  --project "/Users/qixin/Documents/晟景AI助理/透明工地小程序/开发骨架" \
  --remote-npm-install
```

## 5. 部署结果

微信开发者工具 CLI 返回部署成功：

| 云函数 | 结果 | 文件数 | 包大小 |
| --- | --- | ---: | ---: |
| `getCompletedOwnerHome` | success: true | 2 | 2.4 KB |
| `getOwnerPortal` | success: true | 2 | 1.5 KB |

本阶段未部署其它云函数。

## 6. 未部署的内容

本阶段未部署、未上传、未发布以下内容：

- 未部署其它 `cloudfunctions/`
- 未修改或部署 `miniprogram/`
- 未修改 `app.json`
- 未修改 `tabBar`
- 未修改 V2 页面
- 未上传体验版
- 未发布正式版
- 未新增数据库写入
- 未新增真实 AI API
- 未调用 `createProject`

## 7. 当前入口状态

当前 V2 入口仍保持关闭：

- `miniprogram/pages/workbench/workbench.js`：`ENABLE_V2_DEAL_LOOP_ENTRY = false`
- `miniprogram/subpackages/deal-loop/utils/accessGuard.js`：`ENABLE_V2_DEAL_LOOP_ENTRY = false`

本阶段未修改入口状态。

## 8. 后续真机验证步骤

建议进入 BR3 后按以下步骤做真机验证：

1. 使用已绑定业主账号进入小程序。
2. 打开业主端首页 / 我的家。
3. 确认项目为“已交付”或“竣工验收”。
4. 检查是否出现“进入完工服务 / 我的完工服务”。
5. 进入后检查以下完工服务模块是否正常显示：
   - 我的家装档案
   - 电子质保卡
   - 一键售后报修
   - 我的售后工单
   - 推荐朋友装修
   - 老客户权益
   - 完工纪念册
   - 案例授权

## 9. 是否建议进入 BR3 真机验证

建议进入 Phase 6-Y-BR3：完工服务识别修复真机验证。

理由：

- 本阶段只是部署云函数，不包含真机行为确认。
- 需要用已绑定业主账号确认“已交付 / 竣工验收”项目能看到完工服务入口。
- 需要确认完工服务各模块能正常打开，且没有影响业主端其它入口。

## 10. 本阶段边界确认

- 本阶段未修改业务代码。
- 本阶段只部署 `getCompletedOwnerHome` 和 `getOwnerPortal`。
- 本阶段未上传体验版。
- 本阶段未发布正式版。
- 本阶段未修改 `ENABLE_V2_DEAL_LOOP_ENTRY`。
- 本阶段未打开 V2 入口。
