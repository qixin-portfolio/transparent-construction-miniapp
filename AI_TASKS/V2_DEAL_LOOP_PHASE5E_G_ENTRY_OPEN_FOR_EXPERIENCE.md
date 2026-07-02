# V2 Deal Loop Phase 5E-G：临时打开入口体验版准备

## 当前阶段

Phase 5E-G：临时打开入口体验版准备。

本阶段为上传体验版做准备，短期打开 V2 成交跟进入口，并提交一个明确的“体验版入口打开”commit/tag。Codex 不上传体验版，不部署云函数，不发布正式版。

## 当前 HEAD / tag

- 当前 HEAD：`c855f36a0db2352704fce697e9ff3e50a9f26dde`
- 当前 tag：`v2-deal-loop-phase5e-f-experience-upload-checklist`
- 当前入口打开前安全 tag：`v2-deal-loop-phase5e-f-experience-upload-checklist`

## 本阶段目标

本阶段目标：

1. 将 `ENABLE_V2_DEAL_LOOP_ENTRY` 短期改为 `true`。
2. 保持入口显示条件仍为 `ENABLE_V2_DEAL_LOOP_ENTRY && isBoss`。
3. 不扩大角色范围。
4. 记录人工确认的测试账号与体验窗口。
5. 准备体验版说明文案。
6. 明确体验结束后必须进入 Phase 5E-H 关闭入口。

本阶段不是正式发布，不是正式上线，不是正式交付，只是体验版入口打开准备。

## 人工确认的测试账号与体验窗口

人工确认：

1. 测试账号：`boss_qi`
2. 体验窗口：1 天以内
3. 体验对象：仅老板内部体验

仍不开放：

1. 业主端
2. 工长端
3. 普通销售
4. 外部装修公司客户
5. 真实业主
6. 非测试人员

## 修改文件列表

本阶段修改：

1. `miniprogram/pages/workbench/workbench.js`
2. `AI_TASKS/V2_DEAL_LOOP_PHASE5E_G_ENTRY_OPEN_FOR_EXPERIENCE.md`

本阶段未修改：

1. `cloudfunctions/`
2. `miniprogram/app.json`
3. tabBar
4. V2 六个页面
5. 数据库写入逻辑
6. 云函数调用逻辑
7. 部署配置

## 入口开关变更

本阶段将入口开关从：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

改为：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = true
```

结论：

1. `ENABLE_V2_DEAL_LOOP_ENTRY` 已短期改为 `true`。
2. 该状态只用于体验版入口打开准备。
3. 体验结束后必须进入 Phase 5E-H，恢复 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。

## 入口显示条件

入口显示条件保持不变：

```js
canViewDealLoopV2: ENABLE_V2_DEAL_LOOP_ENTRY && isBoss
```

`isBoss` 当前角色仍为：

1. `admin`
2. `boss_qi`
3. `boss_hu`

本阶段不做进一步角色逻辑修改，不扩大角色范围。

## 体验版说明文案

体验版备注文案：

```text
透明工地 V2 成交跟进试验功能。仅限老板内部体验。本版本只读客户资料，不创建真实工地，不调用真实 AI，不自动发布内容，不影响现有客户、工地和日报数据。请勿转发给非测试人员。体验结束后关闭入口。
```

## 风险提示

必须明确：

1. 当前不是正式发布。
2. 当前不是正式上线。
3. 当前不是正式交付。
4. 当前只是体验版入口打开准备。
5. 体验结束后必须关闭入口。
6. 不得发布正式版。
7. 不得给真实业主或外部客户使用。
8. 不得宣传为真实 AI 功能。
9. 不得宣传为一键创建工地能力。
10. 不得宣传为案例自动发布能力。

## 回滚方案

当前入口打开前安全 tag：

`v2-deal-loop-phase5e-f-experience-upload-checklist`

如体验版发现问题：

1. 立即进入 Phase 5E-H。
2. 恢复 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
3. 提交关闭入口 commit/tag。
4. 如已上传体验版，则重新上传关闭入口后的体验版覆盖。
5. 如代码异常，回滚到安全 tag：`v2-deal-loop-phase5e-f-experience-upload-checklist`。

当前不需要重新部署云函数。

## 上传体验版人工操作提示

下一步由人工在微信开发者工具上传体验版。

上传时必须使用体验版备注：

```text
透明工地 V2 成交跟进试验功能。仅限老板内部体验。本版本只读客户资料，不创建真实工地，不调用真实 AI，不自动发布内容，不影响现有客户、工地和日报数据。请勿转发给非测试人员。体验结束后关闭入口。
```

上传后只通知测试账号：`boss_qi`。

不要：

1. 上传正式版。
2. 发布正式版。
3. 部署云函数。
4. 通知普通销售、业主、工长或外部客户。

## 是否建议进入 Phase 5E-H

上传体验版后必须进入 Phase 5E-H：关闭入口。

Phase 5E-H 必须：

1. 恢复 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
2. 提交关闭入口 commit/tag。
3. 如已上传体验版，则上传关闭入口后的体验版覆盖旧包。

## 验证结果

已执行：

```bash
node --check miniprogram/pages/workbench/workbench.js
git diff --check
git status
```

检查结论：

1. `workbench.js` 语法检查通过。
2. `git diff --check` 通过。
3. 只修改 `workbench.js` 和新增本阶段文档。
4. 未修改 `cloudfunctions/`。
5. 未修改 `miniprogram/app.json`。
6. 未修改 tabBar。
7. 未修改 V2 六个页面。
8. 未新增 `db.collection / cloud.database / wx.request`。
9. 未新增 `createProject / submitStageLog / reviewStageLog / getTempFileURL`。
10. 未新增真实 AI API。
11. 未部署云函数。
12. 未上传体验版。
13. 未发布正式版。
