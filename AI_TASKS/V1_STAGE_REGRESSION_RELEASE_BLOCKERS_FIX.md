# Phase 7-HOTFIX-5B：工序根因修复发布阻塞项处理

## 1. 当前阶段

- 阶段：Phase 7-HOTFIX-5B：工序根因修复发布阻塞项处理。
- 原分支：`hotfix/stage-regression-and-reviewer-auto-approve`。
- 修复分支：`hotfix/stage-regression-release-blockers`。
- 修复前 HEAD：`0fb71e57881b89fc5a74c016e327ede9a8912b95`。
- 本阶段不连接生产 CloudBase，不写生产数据库，不部署、不上传体验版、不发布正式版。
- `ENABLE_V2_DEAL_LOOP_ENTRY = false`，未修改 V2。

## 2. HOTFIX-5A 阻塞项

本阶段处理的阻塞项：

1. 工序运行副本没有受控生成机制。
2. 通知全部失败时可能被误记为 `sent`。
3. 通知状态写回失败可能冒泡成核心业务失败。
4. 空 tenant、跨租户、伪造角色和非项目成员测试不足。
5. 提交日报的重复检查在事务外，存在并发重复提交窗口。
6. hotfix 与 PR #2 的通知鉴权、tenant 和审核事务逻辑需要人工整合。
7. `wx-server-sdk` 使用 `latest`，部署不可复现。

## 3. 工序配置治理

采用受控生成方案：

- 人工维护唯一源：`shared/stage-flow.js`。
- `scripts/sync-stage-flow.js` 根据唯一源生成运行时副本。
- 生成文件顶部写入 `GENERATED FILE - DO NOT EDIT`。
- `scripts/check-stage-flow-sync.js` 比较源文件和生成结果，漂移时以非 0 退出。

生成并检查的运行路径：

- `miniprogram/utils/stage-flow.js`
- `cloudfunctions/submitStageLog/stage-flow.js`
- `cloudfunctions/reviewStageLog/stage-flow.js`
- `cloudfunctions/submitStageLog/owner-notice.js`
- `cloudfunctions/reviewStageLog/owner-notice.js`
- `cloudfunctions/reviewStageLog/access.js`

上传日报前端、submit/review 云函数、行为测试和 dry-run 脚本均以 `shared/stage-flow.js` 的数据或受控生成副本为准。没有使用部署包外的父目录 require。

说明：`getOwnerArchive/index.js` 的 `KEY_STAGES` 是业主归档筛选白名单，不参与工序排序或进度计算；其名称口径仍应在后续独立治理，不在本阶段扩大修改范围。

## 4. 通知状态模型

`shared/stage-flow.js` 新增 `summarizeNoticeResults` 和 `runApprovalNotice`：

| 状态 | 判定 |
| --- | --- |
| `not_requested` | 没有合法接收人、通知被跳过或没有通知请求 |
| `sent` | 所有要求发送的通知成功 |
| `partial` | 至少一条成功、至少一条失败 |
| `failed` | 需要通知但全部失败 |
| `persist_failed` | 通知结果已有，但通知状态写库失败 |

写回字段为兼容性扩展：

- `noticeStatus`
- `noticeRequestedCount`
- `noticeSuccessCount`
- `noticeFailureCount`
- `noticeAttemptedAt`
- `noticeErrorSummary`
- `noticeStatusUpdatedAt`

不再保存完整通知返回对象，避免写入 openid、token 或完整错误正文。全部失败不会再被标记为 `sent`。

## 5. 通知状态写回失败

业务流程现在明确分层：

1. 日报、照片和项目汇总更新先在事务中完成。
2. 事务完成后发送业主通知。
3. 发送结果聚合后尝试写回通知状态。
4. 写回失败返回 `warningCode: NOTICE_STATUS_PERSIST_FAILED` 和 `noticeStatus: persist_failed`。
5. 不撤销已成功的审核，不重发审核，不重复通知。

`upload-log.js` 会把通知失败、部分失败和状态写回失败显示给上传人，但仍明确日报核心业务已完成，避免把 warning 显示成核心提交失败。

## 6. submitStageLog 整合结果

修改：

- 服务端只使用当前 OPENID 查询到的 active user role，不读取 event.role。
- event.tenantId 不参与写入，tenant 来自服务端用户关系和默认租户兼容规则。
- 项目 tenant 在事务前和事务内 fresh read 均校验。
- 非默认租户不会读取空 tenant 的旧日报；默认租户保留旧数据兼容边界。
- 项目成员校验抽出到 `access.js`，非项目成员返回 `PROJECT_ACCESS_DENIED`。
- 重复日报检查移动到创建事务内，避免并发重复提交窗口。
- 审核角色自传仍为 `approved`，普通员工仍为 `pending`。
- 自动审核项目更新继续复用规范工序顺序和进度 `max` 规则。
- 自动审核通知改为已鉴权云函数内直接调用订阅消息，不再通过未鉴权的跨云函数调用链。

稳定错误码包括：`UNAUTHORIZED`、`ROLE_NOT_ALLOWED`、`TENANT_MISMATCH`、`PROJECT_ACCESS_DENIED`、`PROJECT_NOT_FOUND`、`STAGE_REQUIRED`、`ALREADY_SUBMITTED`。

## 7. reviewStageLog 整合结果

修改：

- 审核调用者 role 来自服务端 active user 查询。
- 日报和项目 tenant 均使用严格匹配；默认租户只保留明确的空 tenant 旧数据兼容。
- `pending -> approved/rejected` 仍在 CloudBase transaction 内完成。
- 已审核记录返回 `code: ALREADY_REVIEWED`、`alreadyReviewed: true`，不重复更新项目或通知。
- 项目阶段仍按规范顺序比较，进度仍取最大值，已交付 status/statusCode 不被写回。
- 照片可见性更新也按 tenant scope 限制。
- 通知在事务完成后执行，失败不回滚审核。

## 8. sendOwnerNotice 整合结果

`cloudfunctions/sendOwnerNotice/index.js` 属于 submit/review 的直接通知依赖，本阶段一并收紧：

- 服务端 OPENID 查询 active user。
- 只允许 `admin`、`boss_qi`、`boss_hu`。
- 校验项目 tenant、日报 projectId、日报 tenant、`approved` 和 `ownerVisible`。
- 订阅消息使用 `miniprogramState: formal`。
- 返回 `sentCount`、`totalCount`，全部失败时 `ok: false`。
- 不返回 openid 列表，不记录完整通知正文。

## 9. 事务、幂等和并发

- 普通日报创建：在 transaction 内 fresh read 项目、检查重复日报、写日报和照片。
- 审核角色自传：日报、照片和单调项目 patch 在同一 transaction 内完成。
- pending 审核：日报状态、项目 patch、照片 ownerVisible 在同一 transaction 内完成。
- 通知不在 transaction 内执行。
- fake DB 增加查询链、事务串行竞争和通知状态写回失败模拟。
- 真实 CloudBase transaction 和真实云函数并发仍需下一阶段集成验证。

## 10. 测试执行结果

命令：

```bash
node --test tests/stage-log-behavior/*.test.js
node scripts/check-stage-flow-sync.js
```

结果：

- 全部测试：48/48 通过，0 失败。
- 既有 hotfix 测试：18 个行为测试通过，另有配置/运行加载断言通过。
- 新增发布阻塞项测试：28 个，其中 25 个行为测试、3 个配置治理断言，全部通过。
- 工序同步检查：6 个生成文件通过。
- 修改 JS：全部 `node --check` 通过。
- 修改 JSON：全部解析通过。
- 部署包本地检查：submit/review/sendOwnerNotice 的 SDK 均固定为 `2.6.3`，本地运行时文件可加载。

新增行为测试覆盖：

1. 前端 role 伪造不能自动审核。
2. event tenantId 不改变服务端 tenant。
3. 跨 tenant 项目提交被拒绝。
4. 空 tenant 旧项目不向非默认租户开放。
5. 空 tenant 用户不能访问非默认项目。
6. 非项目成员不能提交。
7. 跨 tenant 日报审核被拒绝。
8. 日报和项目 tenant 不一致被拒绝。
9. 全部通知成功为 `sent`。
10. 部分通知成功为 `partial`。
11. 全部通知失败为 `failed`。
12. 无通知对象为 `not_requested`。
13. 通知状态写回失败不影响审核成功。
14. 写回失败不重试审核转换。
15. 通知错误摘要脱敏。
16. 通知发送器拒绝跨租户项目。
17. 通知发送器准确返回全部失败计数。
18. 并发审核只有一次状态转换。
19. 重复审核返回 `ALREADY_REVIEWED`。
20. 自动审核和人工审核竞争只有一次转换。
21. 高进度不会被旧日报降低。
22. 已交付项目状态保持不变。
23. 旧工序日报标签保留。
24. 生成文件带禁止手改标记。
25. 生成文件漂移可被检测。
26. 同步目标覆盖前端和两个部署函数。
27. 未知工序 code 不会回退第一工序。
28. 通知状态写回异常与核心审核结果隔离。

## 11. CloudBase 真实集成测试缺口

本阶段没有连接任何 CloudBase 环境，没有读取生产数据，也没有写入测试数据。当前缺口：

- 真实 CloudBase transaction 冲突/重试行为。
- 真实云函数 OPENID、users、tenant 和 project_members 关系。
- 真实订阅消息成功、部分失败和模板配置。
- 真实小程序上传页、老板待审核数量和三端页面回归。

没有安全隔离的测试 envId 和专用集合，因此没有创建或执行集成写入脚本。下一阶段必须提供独立测试环境和显式测试写入开关；不得使用生产 envId。

## 12. 与 PR #2 冲突矩阵

PR #2 当前 GitHub 状态为 `MERGED`；base 为 `codex/init-ai-collaboration`，head 为 `codex/v1-security-hardening`，PR head 为 `bf046dbd747f028bebb8f2264474f549b3f26d4a`。本修复分支没有合并 PR #2 的整体提交。

| 文件/逻辑 | hotfix 现状 | PR #2 现状 | 保留逻辑 | 整合方式 |
| --- | --- | --- | --- | --- |
| 身份解析 | active users + OPENID | active users + OPENID | 服务端身份 | 保留并补稳定错误码 |
| tenant | 项目/日报 tenant 检查，默认租户旧数据兼容 | 更严格空 tenant 边界 | 严格匹配 + 明确兼容边界 | 已在 submit/review/send notice 逐段整合 |
| 审核角色 | 服务端 `admin/boss_qi/boss_hu` | 同类审核角色校验 | 服务端角色 | 保留，不信任 event.role |
| pending -> approved | hotfix transaction + 幂等 | PR #2 版本存在直接 update 冲突 | hotfix transaction | 保留 transaction，补 `ALREADY_REVIEWED` |
| 项目工序/进度 | 规范顺序 + 单调更新 | PR #2 直接更新逻辑有覆盖风险 | hotfix 单调 patch | 未用 PR #2 直接覆盖版本 |
| 通知 | 原 nested `sendOwnerNotice` | PR #2 直接 authenticated send + formal | 直接 authenticated send | 抽出运行时 owner-notice helper，并收紧 standalone 函数 |
| 通知状态 | 原 `ok` 判断过宽 | PR #2 只记录部分发送警告 | 明确五态模型 | 新增纯函数聚合和 persist warning |
| SDK | `latest` | `2.6.3` | 固定版本 | 三个直接部署函数固定为 `2.6.3` |

## 13. 未吸收的 PR #2 内容

未吸收 PR #2 的其它云函数、AI 云函数、公开案例、完工纪念册、套餐、售后、企业注册和 V2 相关改动。PR #2 的 62 个云函数目录改动未批量部署。

后续 PR #2 必须基于新的正式基线 rebase，或 cherry-pick 本阶段业务修复 commit；禁止让 PR #2 的旧 `reviewStageLog` 覆盖本 hotfix 的事务和单调更新。

## 14. 部署兼容性

本阶段计划部署对象：

- `cloudfunctions/submitStageLog/`
- `cloudfunctions/reviewStageLog/`
- `cloudfunctions/sendOwnerNotice/`
- 完整小程序代码包，包含上传日报页面和生成的前端工序副本。

三个云函数包均包含本目录运行所需的本地 JS 文件，依赖版本固定为 `wx-server-sdk: 2.6.3`。本地未安装云函数 SDK，因此未声称完成真实 SDK 运行验证；当前已完成语法、JSON、生成文件和本地模块加载检查。

兼容性结论：

- 旧日报和旧项目缺少 `currentStageCode` 时仍可按 `currentStage` 解析。
- 通知字段为新审核写入的可选扩展，不要求历史数据迁移。
- 本阶段没有修改 `stage_logs` 历史工序标签。
- 本 hotfix 不需要生产数据迁移。
- 回滚旧函数前仍需确认线上没有新的正常业务更新。

## 15. 生产基线与后续 Gate

生产代码仓库基线可追溯到 `b005c96` / `v1-onsite-issue-fix`，但线上小程序实际版本和云函数实际部署版本仍没有独立微信/云开发回执，生产基线仍标记 `PRODUCTION_BASELINE_UNCERTAIN`。

进入 Phase 7-HOTFIX-5C 前必须完成：

1. 补齐真实 CloudBase 测试环境和部署包验证。
2. 记录线上当前小程序和云函数版本。
3. 人工复核“水电定位”进度语义与共享配置。
4. 在体验版验证普通工长、boss 自传、旧工序返修、通知 warning 和待审核数量。
5. 重新执行 PR #2 安全测试和本阶段 48 个测试。
6. 保持 V2 关闭，不部署无关云函数。

## 16. 本阶段边界

- 未执行生产数据库写入。
- 未连接生产 CloudBase。
- 未部署云函数。
- 未上传体验版。
- 未发布正式版。
- 未合并 main 或执行新的 PR 合并操作。
- 未写入真实密钥。
- 未提交 `/tmp` 文件。

本阶段修复完成后，下一步是 Phase 7-HOTFIX-5C 二次发布审查，不自动进入部署或发布。
