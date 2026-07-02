# V2 Deal Loop Phase 5E-C：入口最小实现

## 当前阶段

Phase 5E-C：入口最小实现。

本阶段只完成工作台 V2 成交跟进入口卡片的最小文案和样式优化，不打开入口，不部署云函数，不上传体验版，不发布正式版，不进入 Phase 5E-D。

## 当前 HEAD / tag

- 当前 HEAD：`f606742b1ddddfcec5fca730b8f299d75767cecf`
- 当前 tag：`v2-deal-loop-phase5e-b-entry-implementation-precheck`
- 前置阶段：Phase 5E-B 已完成入口文案与开关实现前检查。

## 本阶段目标

把未来打开入口时老板能看到的工作台入口卡片准备好：

1. 入口标题清楚。
2. 标签明确显示试验功能、仅老板内部体验、只读客户资料。
3. 风险提示明确不创建真实工地、不调用真实 AI、不自动发布内容。
4. 样式与工作台现有风格协调。
5. 最终提交状态保持 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。

## 修改文件列表

本阶段修改：

1. `miniprogram/pages/workbench/workbench.wxml`
2. `miniprogram/pages/workbench/workbench.wxss`
3. `AI_TASKS/V2_DEAL_LOOP_PHASE5E_C_ENTRY_MINIMAL_IMPLEMENTATION.md`

本阶段未修改：

1. `miniprogram/pages/workbench/workbench.js`
2. `cloudfunctions/`
3. `miniprogram/app.json`
4. tabBar
5. V2 六个页面
6. 部署配置

## 入口开关状态

最终入口开关状态：

`ENABLE_V2_DEAL_LOOP_ENTRY = false`

确认：

1. 工作台入口仍默认隐藏。
2. 本阶段未将 `ENABLE_V2_DEAL_LOOP_ENTRY` 改为 `true`。
3. 最终提交不得包含 `ENABLE_V2_DEAL_LOOP_ENTRY = true`。

## 入口显示条件

入口显示条件保持不变：

`ENABLE_V2_DEAL_LOOP_ENTRY && isBoss`

`isBoss` 角色保持不变：

1. `admin`
2. `boss_qi`
3. `boss_hu`

本阶段不做单一测试账号限制实现。

未来建议：

1. 如进入本地临时开入口验收，应先人工确认单一测试账号。
2. 不建议第一轮直接开放给全部 boss/admin。

## 入口文案实现

入口标题：

`成交跟进`

入口标签：

1. `V2 试验功能`
2. `仅老板内部体验`
3. `只读客户资料`

入口说明：

`用于内部查看客户成交跟进建议，不影响现有客户、工地和日报数据。`

入口风险提示：

`当前为试验功能，不创建真实工地，不调用真实 AI，不自动发布内容。`

入口未出现以下误导文案：

1. `正式上线`
2. `正式发布`
3. `自动成交`
4. `AI 自动成交`
5. `一键创建工地`
6. `一键发布案例`
7. `可直接发布`

## 入口样式调整

本阶段对入口卡片做了最小样式优化：

1. 卡片保持白底、轻边框、轻阴影，与工作台现有卡片风格协调。
2. 标题和标签分层展示，避免标签挤压标题。
3. 三个标签使用低调的绿色、灰绿、提示色区分。
4. 说明文字改为更稳定的业务说明。
5. 风险提示保持低调但可见。
6. 未做夸张营销风格。

## 未改变的能力边界

本阶段未改变：

1. 工作台入口开关逻辑。
2. 工作台入口角色判断。
3. 工作台入口跳转路径。
4. V2 deal-loop 分包路径。
5. V2 六个页面逻辑。
6. 云函数调用逻辑。
7. 数据库读写逻辑。
8. tabBar。
9. `miniprogram/app.json`。
10. 部署配置。

入口点击仍跳转到：

`/subpackages/deal-loop/pages/pipeline/pipeline`

## 禁止能力确认

本阶段确认未新增：

1. 数据库写入。
2. `db.collection`。
3. `cloud.database`。
4. `wx.request`。
5. `createProject`。
6. `submitStageLog`。
7. `reviewStageLog`。
8. `getTempFileURL`。
9. 真实 AI API。
10. 云函数部署。
11. 体验版上传。
12. 正式版发布。

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
3. 本阶段只修改允许范围内文件。
4. `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
5. 未修改 `cloudfunctions/`。
6. 未修改 `miniprogram/app.json`。
7. 未修改 tabBar。
8. 未修改 V2 六个页面。

## 发布判断

当前仍不建议发布。

当前仍不建议：

1. 打开入口。
2. 上传体验版。
3. 部署云函数。
4. 发布正式版。
5. 给真实业务人员使用。

原因：

1. 本阶段只是准备未来入口卡片。
2. 入口仍默认隐藏。
3. 尚未做本地临时开入口人工验收。

## 是否建议进入 Phase 5E-D

建议进入 Phase 5E-D：本地临时开入口人工验收。

Phase 5E-D 建议边界：

1. 只允许本地临时将 `ENABLE_V2_DEAL_LOOP_ENTRY` 改为 `true` 查看入口。
2. 验收结束必须恢复 `false`。
3. 不提交 `true`。
4. 不上传体验版。
5. 不部署云函数。
6. 不发布正式版。
