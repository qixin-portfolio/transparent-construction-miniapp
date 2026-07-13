# Phase 7-HOTFIX-5C：根因修复二次发布审查与候选基线确认

## 1. 当前阶段与边界

- 项目：透明工地小程序。
- 阶段：Phase 7-HOTFIX-5C：根因修复二次发布审查与候选基线确认。
- 本文只记录只读 Git、GitHub、微信开发者工具 CLI 和本地测试证据。
- 本阶段未修改业务代码、未写生产数据库、未部署云函数、未上传体验版、未发布正式版、未合并 PR #2。
- `ENABLE_V2_DEAL_LOOP_ENTRY = false`，工作台入口和页面 Guard 均保持关闭。

## 2. 审查 worktree 与分支

- 原 hotfix 工作目录保持在 `hotfix/stage-regression-release-blockers`，未切换分支。
- 独立审查 worktree：`/tmp/transparent-construction-hotfix-5c-audit`。
- 审查分支：`audit/stage-regression-release-candidate`。
- 审查分支基于 hotfix HEAD `53bbfdeaf177be0e8ba6c9ca1d42b4bae7e25a4c` 创建。
- 审查 worktree 开始时工作区 clean。
- 审查分支本阶段不创建或修改业务 release candidate。

## 3. PR #2 与当前 main

仓库没有名为 `origin/main` 的远端引用。GitHub PR #2 的实际 base/default 分支是 `codex/init-ai-collaboration`，以下将其标记为当前 main。

| 项目 | 结果 |
| --- | --- |
| PR #2 | MERGED |
| PR base | `codex/init-ai-collaboration` |
| PR head | `bf046dbd747f028bebb8f2264474f549b3f26d4a` |
| PR #2 merge commit | `5f4d94275cee2f9564613efe14470b7c40e0c128` |
| mergedAt | `2026-07-10T09:52:01Z` |
| 当前 main HEAD | `5f4d94275cee2f9564613efe14470b7c40e0c128` |
| hotfix HEAD | `53bbfdeaf177be0e8ba6c9ca1d42b4bae7e25a4c` |
| PR #2 base commit | `4da678dff8797dc76287b38559555586c1ca8833` |

PR #2 已合并不代表其代码已经部署到生产。实际生产函数下载结果显示，三个目标函数仍不是 PR #2 merge 后的代码。

## 4. 四方基线比较

比较对象：

- A 历史生产候选：`b005c96c7d89fbd34012a97515e1d3f501ac27d4`，tag `v1-onsite-issue-fix`。
- B PR #2 合并前 base：`4da678dff8797dc76287b38559555586c1ca8833`。
- C 当前 main：`5f4d94275cee2f9564613efe14470b7c40e0c128`。
- D 当前 hotfix：`53bbfdeaf177be0e8ba6c9ca1d42b4bae7e25a4c`，tag `v1-stage-regression-release-blockers-fixed`。

| 比较 | 只读结果 |
| --- | --- |
| A..D | 10 个提交；包含根因修复、生产修复归档和 5B 阻塞项修复；共 40 个文件变化，其中运行时、测试和文档混合。 |
| B..C | PR #2 的 3 个提交链，最终形成 merge commit `5f4d942`。 |
| C..D | 10 个 hotfix 侧提交；运行时重点是日报上传、日报审核、通知、前端工序选择、共享工序配置和行为测试。 |
| D..C | 15 个 main 独有提交；包含 PR #2 的广泛授权/租户安全修改和 `security-regression.test.js`，同时会删除 hotfix 侧新增的运行时拆分文件。 |

### 4.1 main 独有关键逻辑

- PR #2 对多个云函数增加服务端调用者、租户、资源归属和敏感操作校验。
- `security-regression.test.js` 覆盖 20 个安全回归场景。
- 套餐、邀请码、完工纪念册、公开案例、售后、删除、AI 默认关闭等安全改动在 main 中存在。
- main 的 `reviewStageLog` 仍是直接 update 的实现，未保留 hotfix 的 `reviewService` 事务和单调阶段 patch。
- main 的 `submitStageLog` 仍要求前端传入 `stage`，没有 hotfix 的服务端当前工序兜底和审核角色自动通过。

### 4.2 hotfix 独有关键逻辑

- `shared/stage-flow.js` 定义规范工序顺序、合法工序解析、单调阶段/进度计算和已交付状态保护。
- `scripts/sync-stage-flow.js` 与 `scripts/check-stage-flow-sync.js` 维护前端和两个部署函数的生成副本。
- `submitStageLog` 服务端按项目当前工序兜底，未知工序拒绝，审核角色本人上传自动 approved，普通员工保持 pending。
- `reviewStageLog` 使用事务、pending 限制、幂等返回和并发竞争保护，旧日报不覆盖更高项目阶段或进度。
- `sendOwnerNotice` 及直接通知 helper 增加租户/项目/日报校验、准确成功计数和脱敏错误摘要。
- 上传页默认显示项目当前工序，主动选较早工序时提供返修/补充确认。

### 4.3 重叠与覆盖风险

直接重叠的运行文件包括：

- `cloudfunctions/submitStageLog/index.js`
- `cloudfunctions/submitStageLog/package.json`
- `cloudfunctions/reviewStageLog/index.js`
- `cloudfunctions/reviewStageLog/package.json`
- `cloudfunctions/sendOwnerNotice/index.js`
- `cloudfunctions/sendOwnerNotice/package.json`
- 上传日报页及工序配置副本
- hotfix 行为测试与 main 的 `tests/security-regression.test.js`

main 侧 PR #2 的 `reviewStageLog/index.js` 会覆盖 hotfix 的事务/幂等/单调更新结构；机械 merge、cherry-pick 或直接部署任一分支都可能丢失另一侧的安全能力。PR #2 其它云函数不应因本阶段而全量部署。

## 5. 三个云函数语义矩阵

结论中的“hotfix 更完整”表示其目标逻辑更接近本阶段根因修复，但仍需在新 release candidate 中人工整合 main 的安全能力。

### 5.1 `submitStageLog`

| 语义项 | main | hotfix | 结论 |
| --- | --- | --- | --- |
| OPENID / 用户身份 | `cloud.getWXContext()` + active users | 同样使用服务端 OPENID 和 active users | 等价 |
| 角色来源 | 不读取 event.role | 不读取 event.role，增加稳定错误码 | hotfix 更完整 |
| tenant 来源 | 服务端用户默认租户兼容 | 服务端用户默认租户兼容，项目在事务前和事务内校验 | hotfix 更完整 |
| 项目访问 | 管理审核角色放行，其它角色查 project_members | 抽出 access helper，非成员拒绝 | hotfix 更完整 |
| 空 tenant | 默认租户可兼容空值；非默认路径不够细化 | 默认租户兼容空/null，非默认租户只查精确 tenant | hotfix 更完整 |
| stage 兜底 | 要求 event.stage，基本信任前端 stage | 合法 stageCode 优先，否则读取项目当前工序；无合法值返回 `STAGE_REQUIRED` | hotfix 更完整 |
| 未知工序 | 可能保存未知/空 stageCode | 返回 `INVALID_STAGE`，不回退第一工序 | hotfix 更完整 |
| boss 自动审核 | 普通 pending 流程 | `admin/boss_qi/boss_hu` 自传 approved、ownerVisible、reviewed 字段完整 | hotfix 更完整 |
| 普通员工 | pending | pending | 等价 |
| 事务范围 | 日报和照片事务，但重复查找存在事务外窗口 | fresh project、重复保护、日报、照片、自动审核项目 patch 在同一事务 | hotfix 更完整 |
| 阶段/进度单调 | 不负责自动审核阶段 patch | 复用规范顺序，阶段只前进，进度取 max，已交付不恢复 | hotfix 更完整 |
| 通知 | 普通提交发企业微信 | 普通提交企业微信；自动审核在事务后发业主通知 | hotfix 更完整 |
| 通知状态 | 无结构化状态回写 | `sent/partial/failed/not_requested/persist_failed` 与 warning | hotfix 更完整 |

### 5.2 `reviewStageLog`

| 语义项 | main | hotfix | 结论 |
| --- | --- | --- | --- |
| 审核权限 | 服务端 active user + 审核角色 | 同样服务端校验并返回稳定错误码 | hotfix 更完整 |
| tenant 一致性 | 有日志/项目租户校验，但逻辑分散 | 日志、项目、照片均严格按 tenant scope 校验 | hotfix 更完整 |
| pending 限制 | 有 pending 检查，重复返回错误 | 事务内 pending 条件，重复返回 `ALREADY_REVIEWED` 幂等结果 | hotfix 更完整 |
| 并发审核 | 直接 update，无法证明单次转换 | transaction 内只允许一次 pending -> approved/rejected | hotfix 更完整 |
| 项目阶段/进度 | 直接用日报阶段，进度逻辑不完整，存在覆盖风险 | 按规范顺序和 max 规则单调更新 | hotfix 更完整 |
| 已交付保护 | 未形成 hotfix 的保护 | status/statusCode 不被旧日报改写 | hotfix 更完整 |
| ownerVisible / 照片 | 审核后更新 | 同事务更新并带租户范围 | hotfix 更完整 |
| 通知 | 审核函数内嵌调用 `sendOwnerNotice`，只 console warning | 事务成功后直接调用已鉴权 helper，写回结构化通知状态 | hotfix 更完整 |
| 通知写回失败 | 无独立状态模型 | `persist_failed` warning，不回滚审核、不重试审核 | hotfix 更完整 |

### 5.3 `sendOwnerNotice`

| 语义项 | main | hotfix | 结论 |
| --- | --- | --- | --- |
| 调用鉴权 | active user + `admin/boss_qi/boss_hu` | 同样服务端鉴权；内部 helper 只由已鉴权 submit/review 调用 | 基本等价，hotfix 调用链更完整 |
| tenant / 项目 / 日报 | 有 project 和 log 校验 | project、log projectId、log tenant、approved、ownerVisible 均校验 | hotfix 更完整 |
| 接收人 | 兼容 ownerOpenids/ownerOpenid | 去重后发送 | hotfix 更完整 |
| miniprogramState | `formal` | `formal` | 等价 |
| 成功失败计数 | 有计数，但异常返回形态不完全统一 | `ok` 仅在全部成功时为 true，准确区分全失败/部分失败 | hotfix 更完整 |
| 敏感信息 | 不返回完整 openid 列表 | 不返回 openid 列表，错误摘要脱敏 | hotfix 更完整 |
| SDK | `2.6.3` | `2.6.3` | 等价 |

## 6. 正式小程序版本确认

只读查阅了仓库上线归档和已有体验版记录，并检查了微信开发者工具 CLI 能力。当前 CLI 可上传，但没有提供微信公众平台正式版本历史查询命令；本阶段没有上传动作。

| 项目 | 证据与结论 |
| --- | --- |
| 正式上线时间 | 历史上线归档记录为 `2026-07-06`。 |
| 正式版版本号 | 未在可核验的本地上线归档中记录；当前正式后台版本未通过只读平台记录确认。 |
| 正式版备注 | 未确认。 |
| 上一正式版本 | 未确认。 |
| 当前可回退版本 | 未确认，需由微信公众平台版本管理页人工导出/截图记录。 |
| 正式版 commit/tag | 历史上线候选可追溯到 `b005c96` / `v1-onsite-issue-fix`，但不能证明当前线上正式包仍是该提交。 |
| 当前体验版 | 最后一条本地记录为 `7.3.0`，记录 commit 为 `5b8a0fb`；当前微信后台体验版是否仍为该版本未确认。 |
| 生产小程序状态 | `MINIPROGRAM_PRODUCTION_COMMIT_UNCERTAIN`。 |

## 7. 生产三个云函数实际基线

### 7.1 只读方式

- 使用微信开发者工具 CLI 的 `cloud env list`、`cloud functions info` 和 `cloud functions download`。
- 只读下载目录：`/tmp/transparent-construction-production-function-baseline/`。
- 未调用业务云函数，未查询或写入数据库，未部署。
- CLI 可确认三个函数均为 `Active`、运行时 `Nodejs16.13`、超时 20 秒；未返回部署时间或可读函数版本号。

### 7.2 下载代码与基线比较

| 函数 | 下载代码结果 | 与 A `b005c96` | 与 C main | 与 D hotfix | 结论 |
| --- | --- | --- | --- | --- | --- |
| `submitStageLog` | 下载成功；源码摘要 `1ba3ca1489a4...`；package 使用 `latest` | `index.js` 和 `package.json` 完全一致 | 不一致 | 不一致 | 线上未包含 PR #2 或 hotfix 根因修复 |
| `reviewStageLog` | 下载成功；源码摘要 `0b2cb2f20008...`；package 使用 `latest` | `index.js` 和 `package.json` 完全一致 | 不一致 | 不一致 | 线上仍是旧的非单调、非事务审核实现 |
| `sendOwnerNotice` | 下载成功；源码摘要 `7b949d6e3a76...`；package 使用 `latest` | 逻辑接近，但 `miniprogramState` 为 `formal`，与仓库 A 的 `trial` 不同 | 不一致 | 不一致 | 存在未映射的线上手工差异；无服务端 caller/tenant 鉴权 |

线上下载的 `sendOwnerNotice` 仍返回部分接收人结果并未统一错误状态；生产 `reviewStageLog` 仍通过 `cloud.callFunction('sendOwnerNotice')` 调用通知，且不写结构化通知状态。三个线上函数均不包含 hotfix 的服务端当前工序兜底、单调阶段/进度、boss 自传自动审核和并发幂等修复。

生产基线总体判定：**`PRODUCTION_FUNCTION_BASELINE_PARTIAL`**。

含义：实际函数源码和 package 已成功下载并可比对，代码内容已确认；但平台未提供部署时间、函数版本号、环境变量名称清单和发布回执，因此部署元数据仍不完整。下载包只保存在 `/tmp`，未进入仓库。

## 8. 测试可信度二次审查

本次重新执行：

```text
node --test tests/stage-log-behavior/*.test.js
node scripts/check-stage-flow-sync.js
所有 A..D 变更 JS 的 node --check
所有 A..D 变更 JSON 解析
git diff --check
```

结果：

- Node 行为/治理测试：`48/48` 通过，0 失败。
- 其中原有 hotfix 行为测试：`18/18` 通过。
- 新增发布阻塞项测试：`28/28` 通过，其中 25 项行为测试、3 项生成治理断言。
- 48 项的其余 2 项为原有工序运行副本/加载一致性检查；按执行能力分类，本地共有 43 项行为测试、5 项配置/运行加载断言。
- 工序同步：6 个生成文件通过，漂移命令可返回非 0 的测试通过。
- 修改 JS：全部 `node --check` 通过。
- 修改 JSON：全部解析通过。
- SDK/package 本地检查：三个候选部署函数均固定为 `2.6.3`；但下载的生产 package 仍为 `latest`。
- 本地模块加载：共享工序模块及 submit/review 部署目录模块通过；本地未宣称真实 CloudBase SDK 运行通过。

测试真实性：

- fake transaction 有串行锁和竞争模拟，能覆盖并发审核的业务分支，但不是 CloudBase 服务端真实事务。
- 通知状态写回失败在 fake DB 中真实触发了业务函数分支，但没有真实订阅消息平台回执。
- 伪造 role、event tenant、跨租户项目/日报使用独立 fake 对象覆盖。
- 未覆盖真实 CloudBase 的事务冲突重试、真实 OPENID/users/project_members 关系、真实订阅模板和真实并发云函数。
- main 的 PR #2 `tests/security-regression.test.js` 20 项安全测试不在 hotfix 审查 worktree 中；人工整合后必须重新运行，不能用 48 项替代。

## 9. 测试环境 CloudBase Gate

只读 `cloud env list` 返回当前项目可见的单一环境；项目配置和小程序运行配置指向同一脱敏环境标识。未发现第二个隔离 envId、专用测试数据库或专用集合。

| Gate 项 | 结果 |
| --- | --- |
| 独立测试 envId | 无证据 |
| 与生产 envId 不同 | 无证据 |
| 独立数据库/集合 | 无证据 |
| 专用测试项目 | 未建立 |
| 测试后清理 | 无方案 |
| 关闭真实订阅消息 | 无证据 |
| 本阶段是否测试环境写入 | 否 |

判定：**`NO_SAFE_TEST_ENV`**。

因此以下 14 项只能作为 5D 测试环境 Gate，当前没有执行：普通工长 pending、boss 自传 approved、伪造 role、跨 tenant 提交/审核、并发审核、旧工序不倒退、低进度不下降、已交付保护、通知全成功/部分失败/全失败、通知写回失败和待审核数量。

## 10. 推荐 release candidate 路线

推荐：**路线 C：创建新的 release candidate 分支，逐文件人工整合 main 与 hotfix。**

原因：

1. main 的安全改动必须保留，尤其是 PR #2 的租户和调用者校验。
2. hotfix 的日报事务、单调阶段/进度、当前工序兜底、自动审核和通知状态必须保留。
3. `reviewStageLog`、`submitStageLog`、`sendOwnerNotice` 都存在直接重叠；机械合并会丢失一侧逻辑。
4. 需要同时保留 main 的 `security-regression.test.js` 和 hotfix 的 48 项测试，整合后重跑。

本阶段只确认路线，不创建或修改 release candidate 业务代码。

## 11. 精确部署清单

候选通过测试环境和体验版 Gate 后，原则上只涉及：

### 云函数

1. `cloudfunctions/sendOwnerNotice/`
2. `cloudfunctions/submitStageLog/`
3. `cloudfunctions/reviewStageLog/`

三个目录必须使用人工整合后的同一候选版本和锁定的 `wx-server-sdk: 2.6.3`。不部署 PR #2 其它云函数，不部署 AI 云函数，不部署 V2 云函数，不批量部署全部目录。

### 小程序

- 上传完整小程序代码包。
- 包含上传日报页、工序生成运行文件和通知 warning 展示兼容。
- 不把 `shared/`、`tests/`、`scripts/`、`AI_TASKS/` 或 `/tmp` 文件当作上传/部署对象。

## 12. 建议部署顺序

本阶段不执行以下动作。未来 5D/后续 Human Gate 可按此顺序：

1. 先在隔离测试环境部署 `sendOwnerNotice`。
2. 部署 `submitStageLog`。
3. 部署 `reviewStageLog`。
4. 在隔离测试环境完成 14 项 CloudBase Gate 和安全回归。
5. 上传体验版完整小程序包，记录版本号、备注、commit、包体和回滚版本。
6. 用老板、工长、业主真实测试账号完成真机回归。
7. 正式环境保存三个旧函数下载包、package、info 截图/回执后，再按受控窗口部署三个函数。
8. 再上传候选小程序包，记录微信正式版本和可回退版本。
9. 提交审核或正式发布必须另行 Human Gate，本阶段不授权。

## 13. 新旧版本兼容性

| 场景 | 结论 |
| --- | --- |
| 旧正式小程序调用候选 `submitStageLog` | 普通上传参数仍兼容；新函数会改变 boss 自传为自动审核，并可能返回额外 warning 字段，旧前端通常会忽略额外字段，但行为已变化。 |
| 新体验版调用旧正式 `submitStageLog` | 普通有 stage 的上传可工作；服务端兜底、未知工序拒绝和 boss 自动审核不会生效，不能用于验证目标修复。 |
| 旧正式小程序调用候选 `reviewStageLog` | 核心审核参数兼容，但会获得幂等/事务/单调项目更新的新行为；这是有意的生产行为变化，需先测试。 |
| 新体验版调用旧正式 `reviewStageLog` | 可能审核成功，但旧函数可直接覆盖项目工序/进度，不能用于验证防倒退。 |
| `warningCode` / 新可选字段 | 新增字段不应导致旧前端解析失败；旧前端可能不显示 warning，不能据此判断通知成功。 |
| 新旧函数是否必须同批切换 | 目标链路必须把三个候选函数作为一组测试；生产切换应在受控窗口内完成，不能长期只更新其中一个。 |
| 云函数先行部署 | 测试环境可先函数后前端；生产不建议无窗口先行，因为旧正式用户会立即获得部分新行为而没有 warning UI。 |

需要人工确认的业务语义：共享配置将“水电定位”设为 20%，而历史人工修复曾使用 30%。在发布候选前必须确定这个进度口径，不能由部署过程猜测。

## 14. 回滚基线

### 14.1 小程序回滚

- 可追溯代码候选：`v1-onsite-issue-fix` / `b005c96`。
- 当前正式版版本号、上一正式版、当前体验版和微信可回退版本未从版本管理页取得独立证据。
- 体验版最后本地记录为 `7.3.0`，不等于当前后台版本。
- 回滚前必须记录微信后台正式版本和候选版本；否则不能把 Git tag 当作微信包回滚凭证。
- 小程序回滚不删除已经写入的新日报字段，也不自动回滚项目数据。

小程序回滚完整性：**不完整**，状态为 `MINIPROGRAM_PRODUCTION_COMMIT_UNCERTAIN`。

### 14.2 云函数回滚

当前生产函数下载备份目录：

`/tmp/transparent-construction-production-function-baseline/`

| 函数 | 当前下载备份 | 代码回滚候选 | 元数据完整性 |
| --- | --- | --- | --- |
| `submitStageLog` | 有，源码与 package 已下载；当前 package 为 `latest` | 下载备份；代码历史上可对照 `b005c96` | 缺部署时间/函数版本号 |
| `reviewStageLog` | 有，源码与 package 已下载；当前 package 为 `latest` | 下载备份；代码历史上可对照 `b005c96` | 缺部署时间/函数版本号 |
| `sendOwnerNotice` | 有，源码与 package 已下载；存在 `formal` 手工差异 | 以下载备份为首选旧版本，不用 Git 猜测 | 缺部署时间/函数版本号 |

未来回滚只能使用已保存的云函数包或控制台明确的上一版本，并在回滚前确认没有新的正常日报/项目更新。不得用旧快照覆盖后续业务数据。本阶段没有执行回滚。

总体回滚 Gate：**`ROLLBACK_BASELINE_INCOMPLETE`**，原因是小程序版本和云函数部署元数据尚未从平台完整留档；云函数源代码备份本身已经存在。

## 15. 阻塞项

1. 正式小程序当前版本号、上一版本和微信可回退版本未确认。
2. 三个线上函数源码已确认是历史旧实现，但部署时间/函数版本号未取得。
3. 没有安全隔离的 CloudBase 测试环境，不能执行真实事务、并发和订阅消息验证。
4. main 与 hotfix 的三个核心函数有直接逻辑冲突，必须在 5D 新分支人工整合。
5. PR #2 的 20 项安全测试尚未与 hotfix 48 项测试在同一候选上重跑。
6. “水电定位”进度 20%/30% 的产品口径需人工确认。
7. 候选函数可能新增 `currentStageCode`，需在整合审查中明确兼容边界；不得未经确认做历史数据迁移。

## 16. 最终发布 Gate

最终建议：**B：完成明确的生产基线元数据确认或测试环境准备后，可以进入 Phase 7-HOTFIX-5D。**

这里的 B 只表示允许下一阶段创建并审查人工整合的 release candidate，不表示：

- 可以部署生产云函数；
- 可以上传正式版或体验版；
- 可以提交审核；
- 可以写生产数据库；
- 可以合并 PR #2 的新变更。

## 17. 下一阶段建议

建议进入：**Phase 7-HOTFIX-5D：创建人工整合后的 release candidate 并执行隔离测试环境 Gate**。

5D 的第一步应是保留 main 的 PR #2 安全修复和 hotfix 的根因修复，逐文件整合三个核心云函数及其直接依赖；第二步再执行 20 项 PR #2 安全测试、48 项 hotfix 测试和真实隔离 CloudBase 验证。5D 仍不自动部署生产。

## 18. 隐私与执行声明

- 本文不包含完整 envId、AppID、openid、手机号、客户数据、原始生产函数包或私有配置。
- 生产函数下载包只存在于 `/tmp/transparent-construction-production-function-baseline/`，未进入 Git、未 push。
- 本阶段未连接生产数据库写入；只读取 CloudBase 环境列表、函数状态和函数代码包。
- 本阶段未执行任何数据库 update/add/remove/transaction write。
- 本阶段未部署云函数、未上传体验版、未发布正式版、未合并 PR #2。
