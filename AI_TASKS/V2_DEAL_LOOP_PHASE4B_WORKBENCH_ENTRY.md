# V2 Deal Loop Phase 4B Workbench Entry

## 1. 当前阶段

Phase 4B：内部工作台入口灰度接入。

本阶段只在内部工作台增加 V2「成交跟进」入口，不新增 V2 功能，不接新数据源，不改云函数，不写数据库，不部署，不上传体验版。

## 2. 当前 HEAD / tag

当前安全检查点：

```text
6d55dc7747159ed97d9a92a8893af50733062b5b
```

对应 tag：

```text
v2-deal-loop-phase4a-entry-design
```

## 3. 本阶段目标

在 `pages/workbench/workbench` 内部员工端增加一个默认受控的入口卡片：

```text
成交跟进
```

点击后只跳转到：

```text
/subpackages/deal-loop/pages/pipeline/pipeline
```

不触发云函数，不写数据库，不创建工地，不调用真实 AI。

## 4. 修改文件列表

本阶段修改：

```text
miniprogram/pages/workbench/workbench.js
miniprogram/pages/workbench/workbench.wxml
miniprogram/pages/workbench/workbench.wxss
AI_TASKS/V2_DEAL_LOOP_PHASE4B_WORKBENCH_ENTRY.md
```

## 5. 真实角色字段审计

已只读确认工作台当前角色判断：

1. `workbench.js` 的 `setAccess(user)` 使用 `user.role`。
2. 已有 `isBoss` 字段。
3. 老板/管理员角色判断为：

```text
admin
boss_qi
boss_hu
```

4. 已有 `isOwner`，判断 `role === 'owner'`。
5. 已有 `isWorker`，判断 `worker / project_manager`。
6. 未发现工作台已有独立 `isAdmin` 字段。
7. `user.tenantId` 已存在，并在工作台用于租户文案判断。

本阶段复用 `isBoss`，没有新建复杂权限体系。

## 6. 入口可见条件

入口可见条件：

```text
ENABLE_V2_DEAL_LOOP_ENTRY && isBoss
```

其中 `isBoss` 复用工作台现有判断：

```text
['admin', 'boss_qi', 'boss_hu'].indexOf(role) !== -1
```

第一阶段实际可见角色：

```text
admin / boss_qi / boss_hu
```

不可见角色：

```text
owner / worker / project_manager / sales / designer
```

## 7. 灰度开关说明

本地灰度开关位于：

```text
miniprogram/pages/workbench/workbench.js
```

当前值：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

当前提交态下入口默认完全隐藏。

如果人工验收需要看入口，可临时改为 `true` 后在开发者工具验证。提交前如需保持隐藏，应恢复为 `false`。

开发者直达入口不受该开关影响：

```text
subpackages/deal-loop/pages/pipeline/pipeline
```

## 8. 入口文案

入口标题：

```text
成交跟进
```

入口副标题：

```text
看客户阶段、AI 话术和推荐素材
```

入口安全提示：

```text
V2 试验功能，不影响现有客户、工地和日报数据。
```

入口标签：

```text
试验功能
```

## 9. 跳转路径

入口点击方法：

```text
goDealLoopV2
```

跳转路径：

```text
/subpackages/deal-loop/pages/pipeline/pipeline
```

行为边界：

1. 只做 `wx.navigateTo`。
2. 不调用云函数。
3. 不写数据库。
4. 不触发 V2 真实写入能力。

## 10. V1 未触碰说明

本阶段未修改：

```text
pages/customers/customers*
pages/projects/projects*
subpackages/internal/pages/project-detail/*
subpackages/internal/pages/upload-log/*
subpackages/internal/pages/review-log/*
subpackages/owner/*
miniprogram/app.json
tabBar
cloudfunctions/
project.config.json
project.private.config.json
```

V1 客户页、工地页、业主端、云函数和 tabBar 均未触碰。

## 11. 风险防护检查

已按设计做以下防护：

1. 入口默认关闭。
2. 入口只放在内部员工端非工长分支。
3. 入口受 `isBoss` 限制。
4. 入口不出现在业主端。
5. 入口不出现在工长工作区。
6. 入口不进入 tabBar。
7. 入口点击只跳转 V2 pipeline。
8. 没有新增 `db.collection`。
9. 没有新增 `cloud.database`。
10. 没有新增 `wx.request`。
11. 没有新增 `createProject`。
12. 没有新增 `submitStageLog` / `reviewStageLog`。
13. 没有接真实 AI API。
14. 没有接真实 `projects / stage_logs / photos / design_drawings / case_authorizations`。

## 12. 验收方式

建议验收：

1. 保持 `ENABLE_V2_DEAL_LOOP_ENTRY = false`，进入工作台，确认所有角色都看不到入口。
2. 临时改为 `true`，用 `admin / boss_qi / boss_hu` 进入工作台，确认老板驾驶舱附近出现 `成交跟进`。
3. 点击入口，确认进入：

```text
subpackages/deal-loop/pages/pipeline/pipeline
```

4. 用 `sales / designer / worker / project_manager / owner` 验证入口不可见。
5. 验证业主端、工长工作区、tabBar 无新增入口。
6. 验证点击入口没有写库、没有创建工地、没有调用真实 AI。
7. 验收后恢复 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。

## 13. 下一步建议

Phase 4B 完成后停止，不进入 Phase 4C。

如后续要扩大灰度，需要人工确认：

1. 是否将本地开关改为 `true`。
2. 是否开放给销售/设计师。
3. 是否增加租户级白名单。
4. 是否仍保持只读客户数据和 mock 能力边界。
