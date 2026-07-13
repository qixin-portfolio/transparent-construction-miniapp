# Phase 7-HOTFIX-5A：工序防倒退与审核角色自动审核发布前审计

## 1. 审计范围与结论

- 当前阶段：Phase 7-HOTFIX-5A：工序防倒退与审核角色自动审核发布前审计。
- 当前分支：`hotfix/stage-regression-and-reviewer-auto-approve`。
- 审计前 HEAD：`5b7076b4ee7af5a80ee8e9ff6b813235e7dc34fd`。
- 本阶段只读审计，未修改业务代码、生产数据或部署配置。
- V2：`ENABLE_V2_DEAL_LOOP_ENTRY = false`，工作台入口和页面级 guard 均保持关闭。
- 最终建议：**C：需要补充代码修复后再审**。

阻塞原因不是本地行为测试失败，而是：工序配置没有真正做到运行时唯一复用；通知返回值可能把“全部发送失败”记成已发送；通知状态写回失败的异常边界未被完整保护；真实 CloudBase 事务、并发、权限和线上云函数版本尚未验证；PR #2 与本 hotfix 存在必须人工整合的逻辑冲突。

## 2. 正式生产基线

仓库可以证明的基线如下：

| 项目 | 只读证据 | 结论 |
| --- | --- | --- |
| 正式上线归档 | `v1-official-launch-record` -> `b7a2dc09337ea62c0f96b49584198bcafb45a598` | 正式上线归档可确认 |
| 最近一条上线后业务基线 | `v1-onsite-issue-fix` -> `b005c96c7d89fbd34012a97515e1d3f501ac27d4` | hotfix 从此处分叉 |
| hotfix 分叉点 | `b005c96c7d89fbd34012a97515e1d3f501ac27d4` | 代码历史可确认 |
| 线上小程序实际 commit | 无独立微信后台/上传回执 | 未确认 |
| 线上云函数实际版本 | 无独立云开发部署回执 | 未确认 |
| 线上小程序版本号 | 仓库上线记录未提供可核验版本号 | 未确认 |

因此生产部署基线标记为 `PRODUCTION_BASELINE_UNCERTAIN`：代码仓库基线可追溯，但不能把仓库 tag 当作线上云函数版本证明。

## 3. Hotfix 提交范围

从 `b005c96` 到当前 HEAD 的提交为：

```text
7d8dfcc fix: prevent stage regression and auto-approve reviewer uploads
4895440 docs: record four-project stage regression dry run
c98f281 docs: add stage regression repair execution plan
df9bf8a docs: verify stage regression repair prewrite state
df0b47d docs: record stage regression production repair acceptance
2d4bea3 docs: investigate site D repair mismatch
4d3ef5c docs: cross-check site D production environment
5b7076b docs: record site D repair acceptance
```

根因业务代码只在 `7d8dfcc`；其余提交是 dry-run、生产修复和审计归档。当前 hotfix 未包含 PR #2 的提交。

### 3.1 文件分类

业务代码：

- `cloudfunctions/submitStageLog/index.js`
- `cloudfunctions/submitStageLog/submitService.js`
- `cloudfunctions/submitStageLog/stage-flow.js`
- `cloudfunctions/reviewStageLog/index.js`
- `cloudfunctions/reviewStageLog/reviewService.js`
- `cloudfunctions/reviewStageLog/stage-flow.js`
- `miniprogram/subpackages/internal/pages/upload-log/upload-log.js`
- `miniprogram/subpackages/internal/pages/upload-log/upload-log.wxml`
- `miniprogram/subpackages/internal/pages/upload-log/upload-log.wxss`
- `miniprogram/utils/constants.js`
- `miniprogram/utils/stage-flow.js`
- `shared/stage-flow.js`

测试：`tests/stage-log-behavior/` 下的 fake DB、stage-flow、submit-service、review-service 测试。

脚本：`scripts/stage-regression-dry-run.js`，只读数据分析工具，不属于发布包。

文档：`AI_TASKS/V1_STAGE_REGRESSION_AND_REVIEWER_AUTO_APPROVE_HOTFIX.md` 及本 hotfix 的阶段文档，不影响运行时。

生产数据修复归档：四个工地 dry-run、执行计划、预写核验、生产修复验收、工地 D 调查和验收文档，均不应部署。

## 4. 15 项根因修复审计

| # | 检查项 | 修改文件与实现 | 测试覆盖 | 完整性/回归风险 | 结论 |
| --- | --- | --- | --- | --- | --- |
| 1 | 上传页默认当前工序 | `upload-log.js` 的 `loadProjectStages` 读取 `getProjectDetail`，以项目当前工序设置选择项；默认 `stageIndex = -1`，不再默认第一项 | 服务端/工序行为测试；无真机测试 | 网络失败时只能要求选择；需真机确认页面回填 | 待真机 |
| 2 | 未选择不落到“开工交底” | `refreshSelectableStages` 仅按项目当前 code 选中；`getCurrentStage` 无选中时提示“请选择本次施工工序” | `STAGE_REQUIRED` 测试 | 无当前工序项目的完整 UI 流程未真机覆盖 | 通过，待真机 |
| 3 | 服务端缺 stage 兜底 | `resolveSubmissionStage(event, project)` 只接受合法 `stageCode`，否则读取项目当前工序 | 缺工序、仅名称无合法 code 两项行为测试 | 代码入口仍接受前端字段，必须依赖服务端解析；租户边界另见权限风险 | 通过 |
| 4 | 无项目当前工序返回错误 | `resolveSubmissionStage` 抛出 `STAGE_REQUIRED`，入口返回错误 code/message | `STAGE_REQUIRED` 行为测试 | 未在真实云函数环境验证错误封装 | 通过，待真实环境 |
| 5 | 较早工序作为历史/返修记录 | `buildProjectProgressPatch` 计算 `isHistoricalOrRework`；日报保留原工序，不覆盖成当前工序 | 返修日志保留、不倒退测试 | 仅在审核/自动审核时写入标记；未核验线上旧字段兼容 | 通过，待真实环境 |
| 6 | 项目工序只保持或前进 | 依据规范顺序比较 `currentOrder` 与 `logOrder`，旧工序不写 `currentStage` | 木工审核开工交底、开工审核水电两项测试 | 运行时配置是复制文件；PR #2 版本会覆盖该逻辑，需人工整合 | 需修改 |
| 7 | 项目进度单调不下降 | `nextProgress = max(currentProgress, logProgress)` | 60% 审核 10% 测试 | `event.progress`/日报进度语义仍需确认，尤其“水电定位”配置为 20% 而历史修复映射为 30% | 通过，待业务确认 |
| 8 | 已交付项目不恢复施工中 | patch 不写 `status`/`statusCode`；交付状态保留 | 已交付项目测试 | 只证明本函数不改状态，未做线上交付项目回归 | 通过，待真实环境 |
| 9 | 普通员工仍 pending | `createStageLog` 对非审核角色写 `reviewStatus: pending`、`ownerVisible: false` | worker pending 测试 | 当前硬编码提交角色和审核角色，后续权限体系变更需同步 | 通过 |
| 10 | 审核角色本人自动 approved | 服务端从 `users` 查询当前 OPENID；`isReviewRole` 只允许 `admin`、`boss_qi`、`boss_hu`；写入审核字段和项目单调 patch | `boss_qi` 自动审核测试 | 真实 users/tenant 数据、真实云函数身份未验证；`designer` 当前不会自动审核 | 待真实环境 |
| 11 | 不信任前端 role | 自动审核判断使用云函数查询到的 `user.role`，没有读取 event.role | 测试直接调用业务函数，未覆盖伪造 event.role | 缺少真实入口的“伪造 role”行为测试；tenant 默认兼容边界不完整 | 需修改 |
| 12 | 审核记录完整 | 自动审核写 `reviewStatus`、`reviewedBy`、`reviewedAt`、`approvalMode`、`ownerVisible` 及 review record | boss 字段断言覆盖部分字段 | 未覆盖 `reviewedBy`/时间/真实数据库返回字段完整性 | 通过，待补测试 |
| 13 | 只通知一次 | 审核事务返回后调用 `runApprovalNotice`；重复审核在事务内直接返回 `alreadyReviewed` | 自动审核一次通知、重复审核、并发一次通知测试 | `sendOwnerNotice` 可能返回 `ok: true, sentCount: 0`，导致误记 `sent`；部分成功也未按 sentCount 判定 | 需修改 |
| 14 | 通知失败不破坏审核 | 通知在事务后发送，失败写 `noticeStatus`/`noticeError` | 抛异常通知失败测试 | `updateStatus` 写回失败时 catch 内再次写回，二次失败可能冒泡；部分失败返回值未覆盖 | 需修改 |
| 15 | boss 不进入待审核 | 自动审核写 approved；`listPendingStageLogs` 仍按 pending 查询 | pending 数量为 0、boss 自传测试 | 待审核云函数仍有旧空 tenant 兼容查询，需与 PR #2 统一；真实工作台未回归 | 通过，待真机 |

## 5. 工序配置唯一性审计

设计上的规范来源是 `shared/stage-flow.js`，四个目标映射为：

| 名称 | stageCode | 配置进度 |
| --- | --- | ---: |
| 油工/刮墙 | `painting` | 75 |
| 水电定位 | `water_electric_position` | 20 |
| 开关插座 | `switch_socket` | 95 |
| 木工/吊顶 | `carpentry_ceiling` | 65 |

当前实现不是运行时唯一来源：

- `miniprogram/utils/stage-flow.js` 是复制内容。
- `cloudfunctions/submitStageLog/stage-flow.js` 是复制内容。
- `cloudfunctions/reviewStageLog/stage-flow.js` 是复制内容。
- 测试只比较四个文件文本一致，并没有让运行时直接加载 `shared/stage-flow.js`。
- `cloudfunctions/getOwnerArchive/index.js` 另有 `KEY_STAGES` 关键节点名称白名单，其中存在独立名称（如“水电施工”），虽不是排序表，但仍可能造成节点口径漂移。

因此“配置文本当前一致”可以通过，但“唯一规范配置运行时复用”不成立，属于发布阻塞。不能在本阶段顺手做大规模重构；应在后续修复中确定可部署共享模块或受控生成/校验机制。

另有业务语义待确认：规范表将“水电定位”设为 20%，“水电验收”设为 30%，而历史工地人工修复曾确认“水电定位 / 30%”。未确认前不能把任一数字当成新业务真相。

## 6. 服务端权限与自动审核矩阵

当前 hotfix 代码的实际矩阵：

| 角色 | 上传结果 | 自动审核 | 业主可见 |
| --- | --- | --- | --- |
| 普通工人 `worker` | `pending` | 否 | 否 |
| 工长/项目成员（代码中无单独 `foreman` 角色） | 按实际角色；`project_manager` 允许上传 | 否 | 否 |
| 设计师 `designer` | `pending` | 否 | 否 |
| `boss_qi` | `approved` | 是 | 是 |
| `boss_hu` | `approved` | 是 | 是 |
| `admin` | `approved` | 是 | 是 |

身份来自 `cloud.getWXContext().OPENID` 查询 active `users`。前端无法通过传入 role 直接获得自动审核资格。审核权限角色列表在 `submitStageLog`、`reviewStageLog` 和 stage-flow 中有多处维护，当前值一致，但不是单一权限配置。

tenant 方面，当前入口允许缺失 tenant 的用户/资源回退默认租户，并对资源使用 `if (resource.tenantId && ...)` 兼容判断；空 tenant 旧数据对非默认租户的边界、用户与项目租户一致性尚未由真实数据和 PR #2 合并后的实现共同证明。该点必须与 PR #2 一起人工整合。

## 7. 状态一致性、事务与并发

代码层实现：

- `submitStageLog` 使用 `db.runTransaction`，在同一事务内添加日报、照片，审核角色自传时更新项目。
- `reviewStageLog` 在事务内读取日报状态；只有 `pending` 才更新日报、项目和照片。
- 项目工序和进度 patch 在同一事务内计算和写入。
- 事务提交后才调用业主通知。
- 已审核状态返回 `alreadyReviewed`，不重复更新项目、不重复通知。

本地 fake DB 通过串行锁模拟事务，因此本地并发测试通过；这不能等同于真实 CloudBase transaction 冲突、重试和写入计数证明。未运行真实云函数并发、真实权限、真实通知或真实生产数据库测试。

需要补齐的 P1 风险：

1. `runApprovalNotice` 只以 `result.ok` 判断成功；现有 `sendOwnerNotice` 在所有业主发送失败时仍可能返回 `ok: true, sentCount: 0`。
2. 通知发送成功但 `noticeStatus` 写回失败时，当前错误处理可能再次写回并最终抛错；需要确保审核事务结果不被误报为失败。
3. 需要真实 CloudBase transaction 测试，验证两个审核请求只能产生一次状态转换和一次通知。

## 8. 测试真实性审计

执行命令：

```bash
node --test tests/stage-log-behavior/*.test.js
```

结果：19 个测试通过，0 失败。准确分类是 **18 个行为测试 + 1 个静态一致性测试**；不能把 19 个都称为行为测试。

### 8.1 19 个测试清单

行为测试：

1. `missing event stage falls back to project current stage`：直接调用共享工序解析函数，验证缺工序读取项目当前工序。
2. `event stage name without legal stageCode falls back to project current stage`：传入非法/缺失 code 的名称，验证不信任名称并回退。
3. `missing event stage and project current stage requires explicit choice`：直接调用解析函数，验证抛出 `STAGE_REQUIRED`。
4. `older stage and lower progress do not regress project`：调用项目 patch 计算函数，验证旧工序和低进度不写回。
5. `later stage advances project and progress`：验证后续工序推进项目。
6. `delivered project status is not rewritten by progress patch`：验证 patch 不写 status/statusCode。
7. `worker upload without event stage uses project current stage and stays pending`：调用 `createStageLog`，验证工序回退和 pending。
8. `upload without event stage and project current stage returns STAGE_REQUIRED`：调用 `createStageLog`，验证无当前工序错误。
9. `boss_qi self upload is approved, owner visible, and not pending`：调用 `createStageLog`，验证自动审核和可见性。
10. `auto approved upload sends owner notice once and records notice failure without rollback`：模拟通知异常，验证 approved 不回滚、记录失败。
11. `approving older stage keeps project at current stage`：调用 `reviewStageLog`，验证旧工序审核不倒退。
12. `approving lower progress keeps higher project progress`：验证低日报进度不覆盖项目高进度。
13. `approving later stage advances project normally`：验证后续日报推进项目。
14. `delivered project remains delivered after old log approval`：验证已交付状态不变。
15. `duplicate review is idempotent and does not send owner notice again`：验证重复审核幂等且不通知。
16. `two concurrent reviews only produce one state transition notification`：在 fake transaction 下并发调用两次审核，验证一次通知。
17. `historical or rework log remains approved but does not regress project`：验证旧工序日报保留真实标签。
18. `notice failure does not rollback approved status`：模拟审核后的通知异常，验证审核状态保留。

静态测试：

19. `runtime stage-flow copies match the shared source`：比较文件文本，验证复制内容一致；它不是运行时复用测试。

已执行静态检查：

- `node --check`：18 个相关 JS 文件通过。
- JSON 解析：`miniprogram/app.json`、`project.config.json`、两个待部署云函数 `package.json`，4/4 通过。
- `git diff --check`：审计归档前执行并通过。

尚未覆盖的高风险项：

- 前端传入伪造 role；
- 非默认租户访问空 tenant 旧记录；
- 真实 CloudBase 事务冲突和并发；
- `sendOwnerNotice` 全部失败但返回 `ok: true, sentCount: 0`；
- 部分通知成功；
- 通知状态写回失败；
- 真实 users、projects、stage_logs、photos 数据关系；
- 真实小程序真机上传页、老板待审核数量、boss 自传链路。

## 9. 前端体验回归审计

已读代码确认：

- 页面路径：`miniprogram/subpackages/internal/pages/upload-log/`。
- `getProjectDetail` 返回当前工序后，页面显示“项目当前工序”、当前进度，并默认选中对应节点。
- 没有当前工序时保持未选择，提交提示“请选择本次施工工序”。
- 用户主动选择较早工序时弹出“当前选择的是较早工序”，允许继续作为补充/返修记录。
- 照片、语音、文字、手写补充和草稿逻辑仍在原页面中。
- boss 自动审核后的弹窗为“已上传并自动审核”，普通上传仍提示待审核。
- 本 hotfix 未修改小监工 IP 页面或其布局。

回归风险：页面回填依赖网络返回的 `getProjectDetail`；真机尚未验证不同角色、无当前工序、旧工序返修和 WechatSI 失败后的完整路径。因此前端结论为待体验版真机，而不是代码审计通过即上线。

## 10. 发布文件清单

### A. 需要上传的小程序

发生变化的前端文件：

- `miniprogram/subpackages/internal/pages/upload-log/upload-log.js`
- `miniprogram/subpackages/internal/pages/upload-log/upload-log.wxml`
- `miniprogram/subpackages/internal/pages/upload-log/upload-log.wxss`
- `miniprogram/utils/constants.js`
- `miniprogram/utils/stage-flow.js`

微信开发者工具实际上传的是完整小程序代码包，不是只上传这 5 个文件；必须以完整包做体验版回归。

### B. 原则上必须部署的云函数

- `cloudfunctions/submitStageLog/`
- `cloudfunctions/reviewStageLog/`

各目录内的 `index.js`、业务 service、`stage-flow.js` 和 `package.json` 必须作为同一函数包部署。

### C. 共享模块与依赖

- `shared/stage-flow.js` 目前是仓库共享来源，但不会被微信云函数直接部署。
- 两个云函数目录内的复制版 `stage-flow.js` 会随函数包部署。
- 两个函数都声明 `wx-server-sdk: latest`，存在依赖漂移和不可复现风险；本轮不建议全量升级，但部署前应锁定版本并补依赖安装证据。

### D. 不部署内容

- `tests/**`
- `scripts/stage-regression-dry-run.js`
- `shared/stage-flow.js` 单独部署
- `AI_TASKS/**`
- `/tmp` 中的修复计划、快照和执行日志
- 四个工地数据修复相关脚本/归档
- `aiGenerateOwnerSummary`、`generateStageLogDraft`：本 hotfix 未修改，不纳入本轮云函数部署；它们只作为现有上传页链路的既有依赖，不能借本轮顺手发布。
- PR #2 的其它云函数和 62 个云函数目录改动。
- V2 deal-loop 相关文件和云函数。

本轮不得批量部署 PR #2 改动的 62 个云函数目录，也不得把“完整小程序上传”误解为部署所有云函数。

## 11. PR #2 冲突审计

PR #2 的安全提交为 `69cfbd6899fce54f923335b8b7490cfbccb77b1d`，当前 PR HEAD 为 `bf046dbd747f028bebb8f2264474f549b3f26d4a`，合并提交为 `5f4d94275cee2f9564613efe14470b7c40e0c128`。PR #2 从 hotfix 分支分叉前的共同历史继续开发，当前 hotfix 未混入其代码。

文件层面的直接重叠：

- `cloudfunctions/submitStageLog/index.js`
- `cloudfunctions/reviewStageLog/index.js`

逻辑层面的冲突：

- PR #2 的 `reviewStageLog` 直接更新项目阶段/进度并发送通知；hotfix 使用 `reviewService`、事务、规范顺序和单调 patch。
- PR #2 对空 tenant 的校验更严格；hotfix 仍有默认租户和 `if (tenantId)` 兼容边界。
- PR #2 把通知发送逻辑放入已认证审核函数并使用 `miniprogramState: formal`；hotfix 通过 `sendOwnerNotice` 云函数调用，当前通知函数使用 `trial`，且调用身份/鉴权需要重新设计。
- PR #2 为两个相关函数把 SDK 版本固定为 `2.6.3`；hotfix 仍为 `latest`。
- PR #2 的安全测试还覆盖通知鉴权、tenant 隔离、AI 开关和 SDK pin 等内容，但不能替代 hotfix 行为测试。

后续合并顺序建议：**C：需要人工整合**。不能机械 cherry-pick PR #2，也不能用 PR #2 的 `reviewStageLog` 覆盖 hotfix 的事务和单调逻辑。人工整合后必须重跑安全测试、hotfix 行为测试和真实云函数验收。

## 12. 回滚方案

### 前端回滚

- 回滚候选代码基线：`v1-onsite-issue-fix` / `b005c96c7d89fbd34012a97515e1d3f501ac27d4`。
- 线上正式小程序版本号和当前体验版版本号未由仓库证明，发布前必须从微信后台记录实际版本。
- 回退条件：上传页无法打开、普通工长提交失败、boss 自传错误进入 pending、旧工序审核导致汇总倒退、主流程或 V2 入口出现回归。
- 回滚方式：重新上传已确认的上一正式代码包或上一可用体验版包；回滚不会删除已经写入的新日报字段。

### 云函数回滚

- `submitStageLog`、`reviewStageLog` 分别保存当前线上版本证据后再部署。
- 回滚候选为 `b005c96` 对应函数目录；但当前线上函数版本未确认，不能把它当作已存在的云端版本。
- 新字段如 `approvalMode`、审核时间、历史标记属于可选扩展字段，旧代码读取时应忽略；不得以回滚为理由删除或迁移日报。
- 若 hotfix 运行后写入 `currentStageCode`，旧代码仍以 `currentStage` 为主要显示字段，但 schema 变化需在回滚前人工确认。
- 回滚前必须确认没有新的正常业务更新；如已有新日报或项目进度更新，禁止用旧快照覆盖。

本 hotfix 设计上不要求生产数据迁移；它必须能读取缺少新字段的旧日报和旧项目。任何字段迁移或清理都另立阶段。

## 13. 发布 Gate

当前 Gate：**C**。

进入体验版/分批部署前必须完成：

1. 明确线上小程序和两个云函数的真实部署版本。
2. 统一工序配置来源，或建立可证明不漂移的受控生成机制。
3. 修复通知 `sentCount` 为 0、部分失败和通知状态写回失败的状态判定。
4. 与 PR #2 人工整合 tenant 校验、通知鉴权、formal 状态和 SDK 版本，并重跑两套测试。
5. 增加伪造角色、空 tenant、真实 CloudBase transaction/并发的测试或明确人工验证记录。
6. 先上传体验版，回归普通工长、boss 自传、旧工序返修、审核通知和待审核数量。
7. 只部署 `submitStageLog`、`reviewStageLog`，逐函数保存部署回执；不得全量部署。
8. 保持 `ENABLE_V2_DEAL_LOOP_ENTRY = false`，不接真实 AI，不新增订阅消息。

正式发布前必须再确认：

- 四个角色链路和老板/工长/业主三端主流程；
- 工序配置与“水电定位”进度语义；
- 真实生产租户隔离、重复审核、并发审核和通知失败；
- 无数据库迁移要求，且无计划外字段写入；
- 体验版和正式版包的 commit、版本号、回滚包均有记录。

## 14. 本阶段执行边界

- 未修改 `miniprogram/`、`cloudfunctions/`、`tests/` 或 `scripts/`。
- 未写生产数据库。
- 未部署云函数。
- 未上传体验版。
- 未发布正式版。
- 未合并 PR #2。
- 未打开 V2。
- 未新增真实 AI 或真实订阅消息。

## 15. 最终结论

**C：需要补充代码修复后再审。**

根因修复覆盖了默认工序、服务端兜底、项目工序/进度单调更新、审核角色本人自动审核、幂等和 fake transaction 行为，但当前不能直接进入发布准备：配置唯一性、通知状态准确性、PR #2 安全整合、线上版本证据和真实 CloudBase 验证仍未闭合。

建议下一阶段为 **Phase 7-HOTFIX-5B：补充通知状态与工序配置一致性修复、人工整合 PR #2 后重新审查**。本建议不代表部署、上传或合并授权。
