# V2 Deal Loop Phase 4C Entry Acceptance

## 1. 当前阶段

Phase 4C：入口开关验收。

本阶段只记录 V2「成交跟进」内部工作台入口的人工验收结果，不新增功能，不修改业务代码，不进入 Phase 5。

## 2. 当前 HEAD / tag

当前安全检查点：

```text
fc6c11ebe3c26fbaab048799bfc319e69b44baba
```

对应 tag：

```text
v2-deal-loop-phase4b-workbench-entry
```

## 3. 验收目标

确认 Phase 4B 新增的内部工作台 V2 入口满足以下要求：

1. 入口受本地开关控制。
2. 提交态 `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
3. 临时开启后，老板/管理员可在工作台看到入口。
4. 点击入口只跳转 V2 pipeline。
5. 不影响 V1 客户、工地、日报和业主端。
6. 不写数据库，不调用真实创建工地，不调用真实 AI。

## 4. 验收路径

入口所在页面：

```text
pages/workbench/workbench
```

入口位置：

```text
内部员工端 -> 老板驾驶舱下方 -> 施工透明核心闭环上方
```

临时验收方式：

```text
将 ENABLE_V2_DEAL_LOOP_ENTRY 临时改为 true
使用 admin / boss_qi / boss_hu 角色进入工作台
查看「成交跟进」入口
点击入口进入 V2 pipeline
验收后恢复 ENABLE_V2_DEAL_LOOP_ENTRY = false
```

## 5. 验收结果

人工验收通过。

已确认：

1. 临时开启开关后，工作台出现 `成交跟进` 入口。
2. 入口文案符合 Phase 4B 设计。
3. 点击入口能进入 V2 pipeline。
4. 验收后开关已恢复为 `false`。
5. 当前工作区未留下临时业务代码改动。

## 6. 入口可见性结果

当前提交态：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

入口显示条件：

```text
ENABLE_V2_DEAL_LOOP_ENTRY && isBoss
```

因此当前提交态下，所有角色都不会看到该入口。

## 7. boss/admin 可见性说明

临时开启 `ENABLE_V2_DEAL_LOOP_ENTRY = true` 后，以下角色可见：

```text
admin
boss_qi
boss_hu
```

该逻辑复用工作台已有 `isBoss` 判断，没有新增复杂权限体系。

## 8. 普通员工/业主不可见说明

第一阶段不开放给：

```text
sales
designer
project_manager
worker
owner
```

业主端不显示该入口。

工长工作区不显示该入口。

tabBar 不显示该入口。

## 9. 跳转路径验证

入口点击方法：

```text
goDealLoopV2
```

跳转路径：

```text
/subpackages/deal-loop/pages/pipeline/pipeline
```

点击行为只做页面跳转，不携带手机号、openid、详细地址、身份证、内部备注或完整客户对象。

## 10. 全链路客户一致性验证

Phase 3C 已完成 V2 成交闭环整体回归验收。

本次 Phase 4C 入口验收确认：从工作台入口进入的是 V2 pipeline 起点，不绕过既有 V2 链路。

V2 链路仍按既有规则传递 `customerId`：

```text
pipeline
-> customer-detail
-> ai-assistant
-> trust-materials
-> contract-to-project
-> case-assets
```

未发现入口层引入新的客户上下文参数或串人风险。

## 11. 无写库验证

本阶段没有新增业务代码。

Phase 4B 入口点击只执行：

```text
wx.navigateTo
```

未新增：

```text
db.collection
cloud.database
wx.request
createProject
submitStageLog
reviewStageLog
真实 AI API
真实写库逻辑
```

## 12. 风险点

1. 如果后续将本地开关改为 `true` 并提交，入口会对老板/管理员正式可见。
2. 销售/设计师是否开放仍需人工确认。
3. 后续若接真实写入，必须重新进入 Human Gate。
4. 入口当前为本地开关，尚不是租户级灰度白名单。
5. V2 仍是试验功能，需要保留“不影响 V1”的安全提示。

## 13. 下一步建议

本阶段停止在 Phase 4C，不进入 Phase 5。

如后续要进入 Phase 5，建议先人工确认：

1. 是否保持入口默认隐藏。
2. 是否需要租户级白名单。
3. 是否开放给销售/设计师。
4. 是否开始规划真实写入能力。
5. 是否继续保持不部署、不上传体验版，直到完成发布前检查。
