# V2 Deal Loop Phase 4A Entry Design

## 1. 当前阶段

Phase 4A：内部入口设计审计。

本阶段只做 V2 成交闭环系统的内部入口方案设计，不实现入口，不修改业务代码，不修改 `miniprogram/app.json`，不修改工作台，不部署，不上传体验版。

## 2. 当前 HEAD / tag

当前安全检查点：

```text
7267f607d005dbfa23ae3c20da8906390b92ca57
```

对应 tag：

```text
v2-deal-loop-phase3c-regression
```

## 3. 入口设计目标

设计一个可灰度、可隐藏、可回滚的内部入口，让内部人员在不影响 V1 客户、工地、日报、业主端的前提下进入 V2 成交闭环：

```text
真实客户列表
-> 今日成交跟进
-> 客户详情
-> AI 话术
-> 推荐信任素材
-> 签约转工地草案
-> 案例内容资产草案
```

入口设计必须满足：

1. 默认不对所有用户开放。
2. 第一阶段只给老板/管理员看。
3. 业主端绝对不可见。
4. 不影响 V1 工作台、客户库、工地列表、日报审核。
5. 保留开发者工具直达入口。
6. 明确标注 `V2 试验功能 / 不影响 V1`。

## 4. 内部入口候选位置

| 候选位置 | 页面路径 | 当前用途 | 适合程度 | 风险等级 | 是否影响 V1 | 是否建议放 V2 入口 |
| --- | --- | --- | --- | --- | --- | --- |
| 内部工作台首页 boss 区域 | `pages/workbench/workbench` | 内部员工进入后的今日工作总览；老板可见 `老板驾驶舱` | 高 | 低 | 可控，入口可默认隐藏 | 建议作为首选 |
| 工作台快捷日常操作 | `pages/workbench/workbench` | 上传日报、新增工地、审核日报、客户库、AI 助手等快捷入口 | 中 | 中 | 可能和 V1 日常操作混在一起 | 可作为 Phase 4B 备选，但需强灰度 |
| 客户库 | `pages/customers/customers` | V1 真实客户库，支持列表、搜索、新增、删除 | 中 | 中高 | 容易把 V2 试验流程和 V1 客户管理混淆 | 不建议第一阶段放 |
| 旧 AI 助手 | `subpackages/internal/pages/ai-assistant/ai-assistant` | V1 内部 AI 文案工具，本地生成、保存历史 | 中 | 中 | 容易让用户混淆 V1 AI 和 V2 成交闭环 | 不建议第一阶段放 |
| 工地列表 | `pages/projects/projects` | tabBar 页面，内部工地列表；同时承载业主/公开门店展示 | 低 | 高 | 混有业主端、公开门店和真实工地操作 | 不建议放 |
| 工地详情 | `subpackages/internal/pages/project-detail/project-detail` | 真实工地详情、日报、绑定业主、工长码等 | 低 | 高 | V2 当前从客户成交前链路开始，不应放在真实工地详情 | 不建议放 |
| 员工/管理员入口 | `subpackages/internal/pages/staff-manage/staff-manage` | 邀请码、成员管理 | 低 | 中 | 管理功能语义不匹配 | 不建议放 |
| 注册页 | `pages/register/register` | 老板注册、员工加入、业主/公开入口路由 | 低 | 高 | 入口性质不匹配，且涉及角色激活 | 不建议放 |
| 业主端页面 | `subpackages/owner/*` | 业主查看工地、完工服务、公开案例 | 禁止 | 极高 | 会误触达业主 | 绝对不放 |

## 5. 推荐入口位置

推荐位置：

```text
pages/workbench/workbench
```

推荐放置区域：

```text
内部员工端 -> 非工长分支 -> 老板驾驶舱附近
```

推荐理由：

1. 工作台是内部人员默认入口，不需要新增 `app.json` 页面注册。
2. 当前 `deal-loop` 分包已经在 `miniprogram/app.json` 注册，可直接导航到 `subpackages/deal-loop/pages/pipeline/pipeline`。
3. 工作台已有 `isBoss` 判断，`admin / boss_qi / boss_hu` 与第一阶段灰度角色匹配。
4. 业主端在 WXML 中单独分支，入口放在内部员工分支可避免业主误见。
5. 放在老板驾驶舱附近，语义上是经营和成交管理，不和一线日报操作混淆。

不建议第一阶段放在 `pages/customers/customers`，因为客户库是 V1 真实运营页面，包含新增、删除、编辑等真实能力，容易让试验功能和正式客户管理混在一起。

## 6. 角色权限设计

现有角色来自 `miniprogram/app.js` 和登录云函数：

```text
admin
boss_qi
boss_hu
sales
designer
project_manager
worker
owner
```

第一阶段推荐可见：

| 角色 | 是否可见 | 原因 |
| --- | --- | --- |
| `admin` | 是 | 管理员具备最高内部权限，适合灰度验收 |
| `boss_qi` | 是 | 老板角色，最适合看成交闭环试验能力 |
| `boss_hu` | 是 | 老板角色，最适合看成交闭环试验能力 |

第一阶段推荐不可见：

| 角色 | 是否可见 | 原因 |
| --- | --- | --- |
| `sales` | 否 | 虽然成交相关，但第一阶段应先由老板/管理员验收，避免一线误用半成品 |
| `designer` | 否 | 可后续开放，但当前不应把草案能力误认为正式流程 |
| `project_manager` | 否 | 当前 V2 重点是成交前客户链路，不是施工管理 |
| `worker` | 否 | 工长端只做工地/日报/打卡，不开放成交工具 |
| `owner` | 绝对否 | 业主端不得看到内部成交工具 |

权限设计建议：

1. 业主端绝对不可见。
2. 工长端暂时不开放。
3. 销售/设计师后续可作为第二批灰度角色，但需人工确认。
4. 入口可见性应同时满足角色和灰度开关。
5. 后续真实上线前必须按 `tenantId` 隔离，避免其它租户或非晟景账号看到试验入口。
6. 第一阶段不做数据库开关，不新增云函数开关。

## 7. 入口命名方案

| 名称 | 老板理解成本 | 产品感 | 风险提示 | 评价 |
| --- | --- | --- | --- | --- |
| 成交跟进 | 低 | 中 | 中 | 推荐。直白、短、不会过度承诺 |
| 成交作战台 | 中 | 高 | 中 | 有产品感，但语气偏强，可能显得正式上线 |
| 客户成交助手 | 低 | 中 | 中 | 容易理解，但稍长 |
| V2 成交闭环 | 高 | 中 | 高 | 太内部，容易让老板不理解 V2 含义 |
| AI 成交助手 | 低 | 高 | 高 | 容易误以为已接真实 AI |
| 今日成交跟进 | 低 | 中 | 中 | 准确，但入口标题偏长 |

推荐入口标题：

```text
成交跟进
```

推荐副标题：

```text
基于客户阶段查看今日跟进、话术、信任素材和签约草案。
```

推荐角标：

```text
V2 试验
```

## 8. 灰度策略

推荐灰度策略：

1. 默认不对所有用户开放。
2. 第一阶段只对 `admin / boss_qi / boss_hu` 可见。
3. 增加本地配置或 mock 开关控制显示，默认关闭。
4. 不使用数据库开关。
5. 不新增云函数开关。
6. 不影响开发者工具直达入口。
7. 可一键隐藏入口。

建议逻辑草案，仅供 Phase 4B 设计参考：

```text
canViewDealLoopV2 = localSwitch && ['admin', 'boss_qi', 'boss_hu'].includes(role)
```

开发者直达入口保留：

```text
subpackages/deal-loop/pages/pipeline/pipeline
```

直达入口不依赖工作台入口是否显示，便于继续验收和排查。

## 9. 安全提示文案

入口标题建议：

```text
成交跟进
```

入口副标题建议：

```text
基于客户阶段查看今日跟进、话术、信任素材和签约草案。
```

入口安全提示必须包含：

```text
V2 试验功能，不影响现有客户、工地和日报数据。
```

进入 V2 后页面顶部建议继续保留：

```text
V2 试验功能 / 只读客户数据 / 不写工地
```

签约转工地、案例资产相关页面继续强调：

```text
仅生成草案，不调用 createProject，不写 projects。
```

```text
仅为 mock 案例资产草案，不读取真实照片/日报，不自动发布。
```

## 10. Phase 4B 最小实现方案

Phase 4B 如果真正加入口，建议最小改动范围：

```text
miniprogram/pages/workbench/workbench.js
miniprogram/pages/workbench/workbench.wxml
miniprogram/pages/workbench/workbench.wxss
```

可选：

```text
miniprogram/config/deal-loop-flags.js
```

仅当项目已有类似本地配置模式时才新增；否则在工作台内先用本地常量控制，减少文件范围。

Phase 4B 不应修改：

```text
miniprogram/app.json
cloudfunctions/
subpackages/owner/
pages/customers/customers*
pages/projects/projects*
project.config.json
project.private.config.json
tabBar
```

是否需要修改 `app.json`：

```text
不需要。deal-loop 分包已注册。
```

是否需要修改 tabBar：

```text
不需要。入口应是内部工作台卡片，不进入底部 tab。
```

是否需要修改云函数：

```text
不需要。Phase 4B 只加导航入口。
```

是否需要改数据库：

```text
不需要。灰度开关用本地配置或 mock 开关。
```

建议新增导航方法：

```text
goDealLoopV2 -> /subpackages/deal-loop/pages/pipeline/pipeline
```

建议验收标准：

1. 开关关闭时，所有角色都看不到入口。
2. 开关开启时，仅 `admin / boss_qi / boss_hu` 看得到入口。
3. `owner / worker / project_manager / sales / designer` 第一阶段看不到入口。
4. 点击入口进入 `subpackages/deal-loop/pages/pipeline/pipeline`。
5. 入口卡片展示 `V2 试验功能，不影响现有客户、工地和日报数据。`
6. 不修改 `app.json`、tabBar、云函数、数据库。
7. 回滚只需移除入口卡片、导航方法和本地开关，不影响数据。

## 11. 风险点

1. 半成品被普通员工看到，误以为可以正式用于成交跟进。
2. 业主误看到内部成交工具，造成信任风险。
3. 销售或设计师误以为签约转工地已经能真实创建工地。
4. 入口放在客户库或工地列表，影响 V1 正式业务心智。
5. 权限判断错误，导致 worker/owner 误见入口。
6. 灰度开关不可控，后续无法快速隐藏。
7. 后续阶段引入真实写入时，按钮文案或入口提示没有同步更新，造成误触发。
8. 多租户场景下缺少 `tenantId` 隔离，导致非目标租户看到试验入口。

## 12. 下一步建议

Phase 4A 停在设计审计，不进入 Phase 4B。

如果后续进入 Phase 4B，建议先由人工确认：

1. 是否采用 `pages/workbench/workbench` 的老板驾驶舱入口。
2. 第一阶段可见角色是否仅限 `admin / boss_qi / boss_hu`。
3. 本地灰度开关默认是否保持关闭。
4. 入口名称是否采用 `成交跟进`。
5. 是否接受不修改 `app.json`、不改 tabBar、只加工作台入口卡片的最小方案。
