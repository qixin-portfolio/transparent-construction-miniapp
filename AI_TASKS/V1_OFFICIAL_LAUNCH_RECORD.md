# 透明工地小程序 V1 正式上线记录

## 1. 上线状态

- 小程序已正式上线
- 上线时间：2026-07-06
- 当前版本类型：V1 正式上线版
- 是否开放 V2：否

## 2. 当前代码状态

- 当前分支：`codex/init-ai-collaboration`
- 当前 HEAD：`b005c96c7d89fbd34012a97515e1d3f501ac27d4`
- 当前 tag：`v1-onsite-issue-fix`
- git status：clean
- 是否本地/远端同步：是，`0 0`

最近提交：

```txt
b005c96 fix: ignore no-issue placeholder in stage logs
af4e9f2 docs: add RP2 missing release test result
632da01 docs: add V1 release prep final check report
92dc36d docs: update V1 smoke test with manual results
b45e7ac docs: add V1 full-chain smoke test report
a364759 fix: improve completed owner archive and shared album
c31def2 docs: record owner completion cloud function deploy
1f4ce6f fix: allow delivered projects in completed owner service
```

## 3. 当前入口状态

- `ENABLE_V2_DEAL_LOOP_ENTRY = false`
- V2 成交闭环入口关闭
- deal-loop 页面 guard 仍存在

已只读确认：

- `miniprogram/pages/workbench/workbench.js` 中入口规则仍为 `ENABLE_V2_DEAL_LOOP_ENTRY && isBoss`
- `miniprogram/subpackages/deal-loop/utils/accessGuard.js` 中页面级 guard 仍使用 `ENABLE_V2_DEAL_LOOP_ENTRY && boss role`
- deal-loop 页面仍调用 `guardDealLoopPage()`

## 4. 本次上线包含范围

- 老板端工作台
- 项目管理
- 工长施工日报上传
- 老板日报审核
- 业主查看施工进度
- 业主查看已审核日报和施工照片
- 业主查看设计图 / 方案资料
- 已交付项目完工服务
- 电子质保卡
- 售后报修
- 售后工单查看

## 5. 本次上线不包含范围

- V2 成交闭环
- AI 助手正式开放
- 销售动作卡正式开放
- 自动创建工地
- 真实 AI API
- 自动发送微信
- 自动发布案例

## 6. 上线后首日巡检清单

以下项目待人工检查：

- 小程序是否能正常搜索 / 打开
- 老板端是否能登录
- 工长端是否能上传日报
- 老板端是否能审核日报
- 业主端是否能查看进度
- 业主端是否能查看已审核日报
- 业主端是否能进入完工服务
- 售后报修是否能打开
- V2 入口是否不可见
- 是否有用户反馈异常

## 7. 上线后 7 天观察重点

- 老板是否愿意真实使用
- 工长是否嫌上传麻烦
- 业主是否真的打开看进度
- 售后入口是否有人使用
- 哪个页面最容易让人迷路
- 是否有权限串数据风险
- 是否有页面打不开 / 白屏 / 图片加载失败

## 8. 当前策略

上线后 7 天内原则上不做大功能。

只允许：

- 修阻塞 Bug
- 修权限风险
- 修明显文案错误
- 补上线记录
- 收集真实反馈

本阶段边界：

- 本阶段只新增上线归档文档
- 未修改业务代码
- 未修改 `miniprogram/`
- 未修改 `cloudfunctions/`
- 未修改 `app.json`
- 未修改 tabBar
- 未修改 `ENABLE_V2_DEAL_LOOP_ENTRY`
- 未打开 V2 入口
- 未部署云函数
- 未上传体验版
- 未发布新版

结论：

- V1 已正式上线
- V2 继续关闭
- 建议进入 Phase 7-LAUNCH-2：上线首日人工巡检
