# V2 Deal Loop Phase 5E-D：本地临时开入口人工验收

## 当前阶段

Phase 5E-D：本地临时开入口人工验收。

本阶段允许本地临时打开 V2 成交跟进入口做验收，但最终必须恢复 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。本阶段不上传体验版，不部署云函数，不发布正式版，不进入 Phase 5E-E。

## 当前 HEAD / tag

- 当前 HEAD：`b1cf9043cfa5ce1f8e2bf9844394a974ace7c363`
- 当前 tag：`v2-deal-loop-phase5e-c-entry-minimal-implementation`
- 前置阶段：Phase 5E-C 已完成入口最小实现。

## 本阶段目标

本阶段目标：

1. 本地临时打开 V2 成交跟进入口。
2. 检查工作台入口卡片文案是否安全。
3. 检查入口卡片是否仍保持老板内部体验、试验功能、只读资料边界。
4. 检查入口点击目标仍为 deal-loop `pipeline` 页面。
5. 验收结束后恢复入口关闭。
6. 最终只提交本验收记录文档，不提交 `ENABLE_V2_DEAL_LOOP_ENTRY = true`。

## 本地临时开关操作

本阶段曾本地临时修改：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = true
```

用途：

1. 仅用于本地开发环境验收入口卡片。
2. 不用于提交。
3. 不用于上传体验版。
4. 不用于发布正式版。

验收结束后已恢复：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

最终提交状态仍为 `false`。

## 工作台入口卡片验收结果

验收结论：通过本地临时开关与入口代码检查。

已确认临时打开入口时，入口显示条件为：

```js
ENABLE_V2_DEAL_LOOP_ENTRY && isBoss
```

已确认 `isBoss` 角色仍为：

1. `admin`
2. `boss_qi`
3. `boss_hu`

已确认入口卡片文案来自工作台 WXML，包含：

1. `成交跟进`
2. `V2 试验功能`
3. `仅老板内部体验`
4. `只读客户资料`
5. `用于内部查看客户成交跟进建议，不影响现有客户、工地和日报数据。`
6. `当前为试验功能，不创建真实工地，不调用真实 AI，不自动发布内容。`

已打开微信开发者工具项目进行本地查看。截图文件未提交进 git。

## 入口文案检查

入口用户可见文案检查结论：通过。

保留文案：

1. `V2 试验功能`
2. `仅老板内部体验`
3. `只读客户资料`
4. `不影响现有客户、工地和日报数据`
5. `不创建真实工地`
6. `不调用真实 AI`
7. `不自动发布内容`

说明：

`不自动发布内容` 属于限制说明，可以保留，不视为误导能力。

## 禁止文案检查

入口 WXML / WXSS 未发现以下禁止用户可见文案：

```text
正式上线
正式发布
自动成交
AI 自动成交
一键创建工地
自动创建工地
一键发布案例
直接发小红书
直接用于官网/GEO
可直接发布
createProject
projects
listCustomers
getCustomer
getV2EvidenceSummary
mock
Readonly
Phase 3B
```

备注：

1. `不调用真实 AI` 是限制说明，可以保留。
2. `不自动发布内容` 是限制说明，可以保留。

## 点击跳转验收结果

入口点击函数保持不变：

```js
goDealLoopV2() {
  wx.navigateTo({ url: '/subpackages/deal-loop/pages/pipeline/pipeline' })
}
```

跳转目标：

`/subpackages/deal-loop/pages/pipeline/pipeline`

微信开发者工具中已观察到 `pipeline` 页面正常显示，页面标题区域为 `今日成交跟进`，未见明显报错。

## 已恢复入口关闭确认

已恢复入口关闭：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

最终确认：

1. `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
2. git diff 中不存在 `ENABLE_V2_DEAL_LOOP_ENTRY = true`。
3. 工作台入口默认仍隐藏。
4. 本阶段不会提交 `workbench.js`。

## 未改变的能力边界

本阶段未改变：

1. `cloudfunctions/`
2. `miniprogram/app.json`
3. tabBar
4. V2 六个页面
5. 数据库逻辑
6. 云函数调用逻辑
7. 工作台入口跳转路径
8. `isBoss` 角色判断
9. 部署配置

本阶段未新增：

1. `db.collection`
2. `cloud.database`
3. `wx.request`
4. `createProject`
5. `submitStageLog`
6. `reviewStageLog`
7. `getTempFileURL`
8. 真实 AI API

## 发布判断

当前仍不建议发布。

当前仍不建议：

1. 打开入口提交。
2. 上传体验版。
3. 部署云函数。
4. 发布正式版。
5. 给真实业务人员使用。

本阶段仅完成本地临时入口验收记录。

## 是否建议进入 Phase 5E-E

如果入口卡片与跳转验收均被人工确认通过，下一步可进入 Phase 5E-E：是否上传体验版决策评审。

Phase 5E-E 仍应只做决策评审，不应直接上传体验版或发布正式版。

## 测试结果

已执行：

```bash
node --check miniprogram/pages/workbench/workbench.js
git diff --check
git status
```

检查结论：

1. `workbench.js` 语法检查通过。
2. `git diff --check` 通过。
3. 最终入口开关为 `false`。
4. 最终只新增本阶段文档。
5. 未部署云函数。
6. 未上传体验版。
7. 未发布正式版。
