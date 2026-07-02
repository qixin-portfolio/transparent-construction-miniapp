# V2 Deal Loop Phase 5E-H：体验版上传后关闭入口

## 当前阶段

Phase 5E-H：体验版上传后关闭入口。

本阶段在体验版上传后立即关闭 V2 成交跟进入口，恢复 `ENABLE_V2_DEAL_LOOP_ENTRY = false`，并提交关闭入口 commit/tag。本阶段不部署云函数，不发布正式版。

## 当前 HEAD / tag

- 当前入口打开 commit：`05b97902e706c834842ffcbf6ba0d2537abeb2f6`
- 当前入口打开 tag：`v2-deal-loop-phase5e-g-entry-open-for-experience`
- 本阶段基于 Phase 5E-G 的短期入口打开状态执行关闭入口。

## 本阶段目标

本阶段目标：

1. 将 `ENABLE_V2_DEAL_LOOP_ENTRY` 从 `true` 恢复为 `false`。
2. 保持入口显示条件不变。
3. 记录体验版已由人工上传。
4. 记录入口已关闭，工作台入口默认重新隐藏。
5. 形成关闭入口 commit/tag，作为体验版上传后的安全点。

## 体验版上传状态

体验版上传状态：

1. Phase 5E-G 曾短期打开入口，用于体验版入口准备。
2. 体验版已由人工上传。
3. 本阶段不再上传体验版。
4. 本阶段不发布正式版。
5. 本阶段不部署云函数。

## 入口关闭操作

本阶段将入口开关从：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = true
```

恢复为：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

结论：

1. 本阶段已恢复 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
2. 工作台入口默认重新隐藏。
3. 后续如需再次体验，必须重新走入口打开流程。

## 修改文件列表

本阶段修改：

1. `miniprogram/pages/workbench/workbench.js`
2. `AI_TASKS/V2_DEAL_LOOP_PHASE5E_H_ENTRY_CLOSED_AFTER_EXPERIENCE_UPLOAD.md`

本阶段未修改：

1. `cloudfunctions/`
2. `miniprogram/app.json`
3. tabBar
4. V2 六个页面
5. 数据库写入逻辑
6. 云函数调用逻辑
7. 部署配置

## 入口显示条件

入口显示条件保持不变：

```js
canViewDealLoopV2: ENABLE_V2_DEAL_LOOP_ENTRY && isBoss
```

角色范围保持不变：

1. `admin`
2. `boss_qi`
3. `boss_hu`

本阶段没有扩大角色范围。

## 未改变的能力边界

本阶段未改变：

1. V2 六个页面。
2. 工作台入口跳转路径。
3. `isBoss` 角色判断。
4. 云函数调用逻辑。
5. 数据库写入逻辑。
6. 体验版文案边界。
7. V2 只读、示例、草案、内部参考能力边界。

本阶段未新增：

1. `db.collection`
2. `cloud.database`
3. `wx.request`
4. `createProject`
5. `submitStageLog`
6. `reviewStageLog`
7. `getTempFileURL`
8. 真实 AI API

## 回滚说明

当前关闭入口后的安全状态：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

如后续再次需要体验：

1. 必须重新进入入口打开阶段。
2. 必须重新确认测试账号和体验窗口。
3. 必须重新提交短期打开入口 commit/tag。
4. 体验结束后仍必须再次关闭入口。

如代码异常：

1. 可回滚到 Phase 5E-G 入口打开 tag 查看差异。
2. 但生产安全优先保持当前关闭入口状态。
3. 如需重新上传体验版，应使用关闭入口后的版本覆盖旧体验版。

## 发布判断

当前发布判断：

1. 当前入口已关闭。
2. 当前不发布正式版。
3. 当前不部署云函数。
4. 当前不建议继续扩大体验范围。
5. 当前不建议给真实业主或外部客户使用。

## 是否建议进入下一阶段

建议进入下一阶段前，先完成人工体验反馈记录。

可选下一阶段：

1. `Phase 5E-I：体验版反馈记录与风险复盘`
2. 或停止在当前安全关闭入口状态。

不建议直接发布正式版。

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
3. `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
4. 未修改 `cloudfunctions/`。
5. 未修改 `miniprogram/app.json`。
6. 未修改 tabBar。
7. 未修改 V2 六个页面。
8. 未新增数据库写入。
9. 未新增真实 AI API。
10. 未部署云函数。
11. 未发布正式版。
