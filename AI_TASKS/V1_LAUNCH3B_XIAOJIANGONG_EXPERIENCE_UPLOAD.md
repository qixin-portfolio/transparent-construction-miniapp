# Phase 7-LAUNCH-3B：晟景小监工 IP 体验版上传记录

## 1. 当前阶段

- 阶段：Phase 7-LAUNCH-3B：上传晟景小监工 IP 体验版验证
- 目标：上传体验版用于真机验证小监工 IP 接入效果
- 本阶段未发布正式版
- 本阶段未提交审核

## 2. 当前 commit / tag

- commit：`5b8a0fb8a290581f551d513028e190bf3a44dae8`
- tag：`v1-launch3a-xiaojiangong-image-assets-complete`
- 分支：`codex/init-ai-collaboration`
- 本地/远端同步：`0 0`

## 3. 体验版版本号

- `7.3.0`

## 4. 体验版备注

V1上线后体验优化：晟景小监工IP轻量接入；首页欢迎卡、空状态、日报上传、审核成功、业主提醒；V2成交闭环入口保持关闭。

## 5. 上传结果

上传成功。

执行记录：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli upload \
  --project /Users/qixin/Documents/晟景AI助理/透明工地小程序/开发骨架 \
  --version 7.3.0 \
  --desc "V1上线后体验优化：晟景小监工IP轻量接入；首页欢迎卡、空状态、日报上传、审核成功、业主提醒；V2成交闭环入口保持关闭。" \
  --lang zh
```

CLI 返回：`✔ upload`

说明：首次尝试携带 `--info-output` 时，微信开发者工具 CLI 返回二维码输出路径错误；未完成上传。随后去掉 `--info-output` 后上传成功。

## 6. 包体大小

| 分包 | 大小 | Byte |
| --- | --- | --- |
| TOTAL | 2.3 MB | 2377974 |
| main | 1.7 MB | 1821065 |
| /subpackages/deal-loop/ | 131.6 KB | 134740 |
| /subpackages/internal/ | 252.4 KB | 258447 |
| /subpackages/owner/ | 159.9 KB | 163722 |

## 7. 当前 V2 状态

- `miniprogram/pages/workbench/workbench.js`：`ENABLE_V2_DEAL_LOOP_ENTRY = false`
- `miniprogram/subpackages/deal-loop/utils/accessGuard.js`：`ENABLE_V2_DEAL_LOOP_ENTRY = false`
- V2 成交闭环入口保持关闭
- 本阶段未打开 V2

## 8. 正式版状态

- 未发布正式版
- 未提交审核
- 未部署云函数
- 未修改业务代码

## 9. 后续真机验收清单

- 首页欢迎卡是否合适
- 三入口是否仍清楚
- 小监工图片是否清晰
- 工长上传成功页是否正常
- 老板审核成功页是否正常
- 业主空态是否正常
- 业主工地详情提醒是否正常
- 是否影响主流程
- 是否影响专业感
- V2 入口是否不可见

## 10. 是否建议进入 Phase 7-LAUNCH-3C

建议进入 Phase 7-LAUNCH-3C：真机验收。
