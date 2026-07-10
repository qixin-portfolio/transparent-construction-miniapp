# Phase 7-SEC-3：PR #2 合并阻塞项修复记录

## 1. 当前基线

- 修复分支：`codex/v1-security-hardening`
- 修复前 HEAD：`bf046dbd747f028bebb8f2264474f549b3f26d4a`
- 原 PR base：`4da678dff8797dc76287b38559555586c1ca8833`
- 原 PR head：`bf046dbd747f028bebb8f2264474f549b3f26d4a`
- V2 状态：`ENABLE_V2_DEAL_LOOP_ENTRY = false`
- 未部署云函数，未上传体验版，未发布正式版，未执行生产数据迁移。

## 2. PR 状态校准

GitHub 在本阶段执行过程中显示 PR #2 已于 2026-07-10 17:52（Asia/Shanghai）合并，merge commit 为：

`5f4d94275cee2f9564613efe14470b7c40e0c128`

该合并发生在 SEC-3 阻塞项修复提交之前。因此：

- 本文记录的 SEC-3 修复不属于 PR #2 的 merge commit。
- 将修复 push 到原分支不会自动进入已合并的 PR #2。
- 后续必须新建独立安全修复 PR，完成二次审查后再决定是否合并。
- 本阶段不创建合并提交，不部署，不发布。

## 3. dailySummary 修复

- 普通用户调用被拒绝。
- 管理员手工调用只使用服务端识别到的自身 `tenantId`，忽略客户端传入的其它 tenant。
- 无 OPENID 的调用必须提供与服务端环境变量 `DAILY_SUMMARY_CRON_SECRET` 匹配的定时任务密钥。
- 不信任 `event.source`、`event.isCron`、`event.tenantId` 或 `event.role`。
- 定时任务逐 tenant 生成独立结果。
- 全局 `WECOM_WEBHOOK_URL` 只允许默认租户发送，防止其它租户摘要被发送到默认企业群。
- 未配置可信触发密钥时失败关闭。

部署前要求：

1. 在云函数环境配置强随机 `DAILY_SUMMARY_CRON_SECRET`，不得写入仓库或前端。
2. 在定时触发配置中单独保存同一密钥，不得输出到日志。
3. 未完成配置和真实定时触发验证前，禁止部署 `dailySummary`。

## 4. reviewStageLog 修复

- 仅 `reviewStatus = pending` 可进入审核状态转换。
- 日报、照片、项目进度更新进入同一个数据库事务。
- 并发审核只有一个请求可成功，后续请求返回 `ALREADY_REVIEWED`。
- 项目进度使用 `Math.max(currentProgress, logProgress)`，不允许倒退。
- 旧阶段日报不覆盖进度更高的当前阶段。
- 只有成功完成状态转换的请求才发送业主通知。
- 通知失败不会回滚已提交审核，并写回 `noticeStatus / noticeError`。
- 通知状态写回本身失败时，审核仍返回成功，同时返回 `noticeTrackingError`，避免前端误以为审核未完成。

固定依赖 `wx-server-sdk 2.6.3` 的包实现已只读确认支持 `runTransaction`、事务 collection query 和 query update。该结论仍不等于真实云环境回归，部署前必须用测试日报验证一次审核、重复审核和通知状态。

## 5. 完工纪念册修复

- 业主本人或同租户管理员通过服务端身份校验私有访问。
- 公开访客必须同时提供 `projectId` 和有效 HMAC `shareToken`。
- token 绑定授权记录、项目、随机盐和过期时间。
- 数据库只保存随机盐和过期时间，不保存可直接使用的 token。
- 撤销授权、授权过期、项目不匹配、无 token、无服务端密钥均拒绝访问。
- 未明确授权项目名称时，公开标题固定为“装修完工纪念册”。
- 返回对象不包含 `ownerOpenid`、`ownerOpenids`、内部 tenant 字段、原始授权对象和原始 fileID。
- `COMPLETION_SHARE_TOKEN_SECRET` 只允许配置在云函数环境，禁止写入仓库、前端和日志。

兼容策略：

- 旧的 projectId-only 公开链接在新后端部署后安全失效。
- 业主登录后的私有访问不应失效。
- 旧 public 授权若没有 `shareTokenSalt / shareTokenExpiresAt`，业主需重新保存公开授权后再分享。
- 小程序前端、`getCompletionAlbum` 和 `updateCaseAuthorization` 必须同一发布批次处理，禁止提前单独部署后端。

## 6. 公开案例字段白名单

- `listPublicCases` 通过 `buildPublicCaseDto` 构造公开 DTO，不展开原项目记录。
- `house_info` 只控制小区、面积、户型和风格。
- `budget` 只控制价格和预算区间。
- `completion_photos / process_photos` 只控制已授权照片。
- `planType`、`designHighlights`、`deliveredAt`、openid、tenant 内部字段默认不返回。
- 临时链接生成失败时不回退原始 fileID。

## 7. 员工邀请码修复

- 服务端可授予角色固定为：`worker / project_manager / designer / sales`。
- 禁止邀请码授予 `admin / boss / boss_qi / boss_hu / platform_admin / super_admin`。
- tenant 只取邀请码服务端记录，不接受客户端 tenant 参数。
- 邀请码兑换在事务内更新用户、邀请码状态、使用人和使用时间，并发只能成功一次。
- 错误尝试按 `openid + code` 哈希键记录在 `invite_code_attempts`，事务累加，5 次后锁定 15 分钟。
- 过期、撤销、缺 tenant 的邀请码拒绝兑换。
- 默认租户创建新邀请码时不再复用历史空 tenantId 旧码，避免生成后无法兑换。

## 8. 测试结果

### 静态回归测试

- 命令：`node --test tests/security-regression.test.js`
- 结果：20/20 通过。
- 用途：检查生产入口是否接入安全模块、关键安全开关与边界是否仍存在。
- 限制：静态源码断言不能代替真实云函数、数据库事务和微信订阅消息测试。

### 行为测试

- 命令：`node --test tests/security-behavior/*.test.js`
- 结果：38/38 通过。
- 类型：调用提取出的业务函数，使用受控 fake transaction 模拟状态读取、事务提交和并发竞争。
- 覆盖：dailySummary 7 项、reviewStageLog 7 项、完工纪念册 10 项、公开案例 5 项、员工邀请码 9 项。
- 限制：未连接生产数据库，未调用真实微信订阅消息，未执行真实云定时触发。

## 9. 历史数据与迁移需求

本阶段未执行迁移。部署前需要：

1. 只读盘点各业务集合中空 `tenantId` 数据及真实归属。
2. 非默认租户的空 tenant 数据必须人工确认后另行迁移，否则新代码会拒绝访问。
3. 旧空 tenantId 员工邀请码应作废并重新生成，或在单独迁移阶段补齐 tenant。
4. 旧 public 纪念册授权需由业主重新保存后生成新分享凭证。
5. 不需要迁移旧日报状态，但需用 pending / approved / rejected 样本做兼容回归。

## 10. 部署边界

本轮禁止直接部署：

- `dailySummary`：可信密钥与定时触发尚未在真实云环境验证。
- `aiGenerateOwnerSummary`
- `generateStageLogDraft`
- `initSaasDefaults`
- `seedCustomerBenefits`
- 所有未列入后续部署批次的云函数。

后续必须分批部署，不得一次性全量部署。当前仓库实际有 62 个云函数 package，需按风险和依赖拆分；完工纪念册前端与两个相关后端必须同批。

## 11. 未改变的能力边界

- 未打开 V2 deal-loop。
- 未接真实 AI。
- 未新增自动创建工地或自动发送。
- 未修改数据库或云存储安全规则。
- 未执行生产数据库读写、迁移或脚本。
- 未部署云函数。
- 未上传体验版。
- 未发布正式版。

## 12. 后续 Gate

建议进入 Phase 7-SEC-4 前先完成：

1. 将 SEC-3 修复提交 push 到安全分支。
2. 新建独立安全修复 PR，因为 PR #2 已提前合并。
3. 对新 PR 做二次安全审查。
4. 在任何部署前完成空 tenant 数据只读盘点、两个环境密钥配置方案和分批部署清单。
