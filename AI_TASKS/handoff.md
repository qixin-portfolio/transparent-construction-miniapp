# AI Handoff Log

> 本文件是 ChatGPT、Codex、GitHub Issue、PR 之间的长期交接记录。每次任务完成或暂停时追加，不覆盖历史。

## 记录格式

### YYYY-MM-DD HH:mm — 任务标题

- 来源：
- 分支：
- PR：
- 本次做了什么：
- 修改文件：
- 检查结果：
- 风险与未决问题：
- 下一步建议：

---

### 2026-07-28 — PR #6 Production Function Deployment and Experience Upload Block

- 来源：齐鑫明确确认 PR #6 最小受控生产发布。
- PR：[#6](https://github.com/qixin-portfolio/transparent-construction-miniapp/pull/6) 已合并到 `hotfix/stage-regression-release-blockers`；merge commit `70724a7838cb641c2ce7f05fac3b736d2ad8b97b`，包含锁定 head `0851acfdf3b7916aa4dd6f94b0b914f7b2daf7ee`。
- 发布 worktree：`/Users/qixin/Documents/晟景AI助理/transparent-construction-pr5-production-release`，分支 `release/pr5-production`，创建时 clean 且指向 merge commit。
- 生产数据库 Gate：仅查询 `stage_log_submission_keys`；集合存在、为空、ACL 为 `PRIVATE`。未读取其他集合，未写入或删除生产数据。
- 部署白名单：仅 `submitStageLog`、`reviewStageLog`、`sendOwnerNotice`。三函数源码从生产下载后与 release worktree 逐项一致，状态均为 `Active`、`Nodejs16.13`、20 秒，`CodeResult=success`；部署完成时间分别为 13:05:45、13:06:02、13:06:21（+08:00）。
- 函数包 SHA-256：`submitStageLog` `aee12db4d23663b7eb5dfb94b80c325c7991ccdfb1c9b2eebec00b622a1da31d`；`reviewStageLog` `d34a166aeef8b08b5d38cc6499c6052d0514b973f7ecd0179cde7b78e2fb28dc`；`sendOwnerNotice` `f911b5e449969d510956ecf9ac240bf60afbdb7925356fb59806448c8e00ef2b`。
- 通知配置：未写入、未覆盖生产环境变量；`sendOwnerNotice` 的两个外发开关均未配置，当前代码默认不会外发通知。
- 上传结果：版本 `7.3.2` 从 clean merge worktree 上传两次均未生成体验版。首次被可选信息输出的二维码路径错误阻断；移除该可选参数后，微信开发者工具返回 `41002 appid missing`。未提交审核、未正式发布、未创建 tag。
- 下一步建议：在微信开发者工具中恢复 `wxbfe2172a118ae67f` 对发布 worktree 的 AppID 关联，然后只重试一次 `7.3.2` 体验版上传。

---

### 2026-07-28 — PR #5 Release Candidate Ready

- 来源：真实小程序会话通过后，齐鑫授权创建发布候选。
- 分支：`fix/pr5-release-blockers-v4`；候选 commit 见 PR #6 的当前分支头。
- PR：[ #6](https://github.com/qixin-portfolio/transparent-construction-miniapp/pull/6)，目标分支 `hotfix/stage-regression-release-blockers`，这是该修复分支的唯一直接上游祖先。
- 检查结果：日报行为测试 `171/171`、运行时副本同步、111 个 JSON 解析、V2 双入口关闭、候选 JS 语法和 `git diff --check` 均通过；真实测试和清理证据在 `production-evidence/2026-07-28/pr5-real-miniapp-session/`。
- 未做事项：未访问生产环境、未部署生产、未合并、未打 tag、未上传体验版或正式发布。
- 下一步建议：审查 PR #6；生产发布仅在齐鑫单独确认后执行。

---

### 2026-07-28 — PR #5 Real Mini Program Session Pass and Candidate Authorization

- 来源：齐鑫明确授权“按本次真实成功结果继续创建发布候选”。
- 分支：`fix/pr5-release-blockers-v4`，基线 `899401614a3b92416ec6c3f47b6d5e6bb8ea94ad`。
- PR：候选创建中；未访问或操作生产环境 `cloud1-d4g7zh8kpca0e26d5`。
- 本次做了什么：在测试环境 `shengjing-style-test-d3ac90f38b1` 的真实小程序管理员会话中创建 `pr5t-stage-core-20260728-r3` 合成工地，成功提交无图片、无语音日报；审核通过后待审核列表为空。提交没有出现 `runTransaction` 错误，因此没有可提取的 `errorCode`、`errorMessage`、`requestId`、堆栈或报错行。重复提交入口被页面按当前节点拦截，未产生第二条日报。
- 清理：已从同一测试环境精确删除该 `pr5t-` 工地，删除确认明确包含关联日报；按精确名称搜索返回“暂无工地”，工地总数从 `15` 降至 `14`。未触及其他工地、真实数据或生产环境。
- 检查结果：`node --test tests/stage-log-behavior/*.test.js` 为 `171/171`；运行时副本同步、111 个 JSON 解析、V2 双入口关闭、候选 JS 语法与 `git diff --check` 通过。
- 风险与未决问题：本次路径未复现旧事务失败，故未新增业务修复；未刻意制造并发事务冲突。生产发布、体验版上传、tag 和合并仍未授权。
- 下一步建议：提交并推送用户已授权的发布候选；随后等待生产发布的单独 Human Gate。

---

### 2026-07-27 — PR #5 P0 Transaction Gate Recheck

- 来源：Goal Mode 快速收口 PR #5；针对测试环境事务失败的一次定向修复
- 分支：`fix/pr5-release-blockers-v4`，基线 `899401614a3b92416ec6c3f47b6d5e6bb8ea94ad`
- PR：未创建，未 push；未访问或操作生产环境 `cloud1-d4g7zh8kpca0e26d5`
- 本次做了什么：将 `submitStageLog`、`reviewStageLog`、`sendOwnerNotice` 的数据库实例显式改为 `cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV })`，完整本地 `171/171` 回归通过，并只部署这三项到测试环境。
- 修改文件：三个函数入口、`production-evidence/2026-07-27/pr5-fast-release-test/`、本条 handoff；无其它业务逻辑改动。
- 检查结果：测试环境三函数均 Active 且环境变量为空；同一合成普通用户提交两次仍安全失败为“日报提交事务失败”，零日报、零照片、零通知、零提交槽位残留；第二轮夹具已精确删除，测试用户角色已恢复。
- 风险与未决问题：同一 P0 在一次定向修复后仍存在，按 Goal Mode 停止生产发布、发布候选、tag、上传和量房风格预览 Task 1。控制面调用缺少小程序 OPENID，支持的函数日志接口没有暴露底层事务错误。
- 下一步建议：由人工通过开发者工具的测试小程序会话取得真实用户上下文和原始事务错误；在该 Gate 通过前不得发布。

---

### 2026-07-27 — PR #5 Fast Release Test Environment Gate

- 来源：Goal Mode 快速收口 PR #5
- 分支：`fix/pr5-release-blockers-v4`，候选 `899401614a3b92416ec6c3f47b6d5e6bb8ea94ad`
- PR：未创建，未 push；未访问或操作生产环境 `cloud1-d4g7zh8kpca0e26d5`
- 本次做了什么：只在 `shengjing-style-test-d3ac90f38b1` 创建 `stage_log_submission_keys`（ACL `PRIVATE`），以无环境变量白名单部署 `submitStageLog`、`reviewStageLog`、`sendOwnerNotice`，验证函数 Active 且通知默认关闭；使用合成 `pr5t-` 夹具尝试真实普通用户提交。
- 修改文件：`production-evidence/2026-07-27/pr5-fast-release-test/` 测试证据；无业务代码改动。
- 检查结果：本地行为测试 `171/171` 通过；测试环境两次 submit 均安全失败为“日报提交事务失败”，零日报、零照片、零通知、零提交槽位残留；合成项目和成员已精确删除，测试用户角色已恢复。
- 风险与未决问题：真实 `runTransaction` 路径未通过，CloudBase 控制面直调没有小程序 OPENID，开发者工具 GUI 自动化超时，且支持的日志命令未给出事务底层错误。该项是 P0，不能发布。
- 下一步建议：由人工在开发者工具中以测试小程序身份重现并取得原始事务错误；仅在首次普通用户 submit 成功、重复拦截、rejected 重提、审核和进度单调性等核心场景完整通过后，才重新讨论发布候选。

---

### 2026-07-27 — Phase 0F-3C 提交槽位语义合法性校验修复

- 来源：用户任务“Phase 0F-3C——修复提交槽位语义合法性校验”
- 分支：`fix/pr5-release-blockers-v4`，起点 `56139ab1b69922eaaa6f81b9b4797b0234dc139e`
- PR：未创建，未 push；未访问 CloudBase、测试环境或生产环境
- 本次做了什么：以 service 层失败测试先行，集中校验 key 和新结构日报的正整数 attemptNo、严格上海业务日期、状态枚举、非空未 trim 的 ID 与规范派生 key ID；submit/review 复用同一共享实现，审核仅对合法已审核记录保留幂等早退
- 修改文件：`shared/submission-slot.js`、submit/review 生成副本与 service、key helper、第三/四轮测试、`docs/pr5-remediation-v4/`、本任务单和本条 handoff
- 检查结果：原有 `48/48`、第一轮 `27/27`、第二轮 `14/14`、第三轮 `34/34`、第四轮 `48/48`，合计 `171/171`；生成副本、JSON、39 页面完整性、V2 双入口关闭、环境变更检查和 `git diff --check` 通过。新增测试先在 `56139ab` 上 `12/28` 通过、`16/28` 失败
- 风险与未决问题：本地事务模型不等同真实 CloudBase；未创建集合、未部署或访问任何环境，真实事务/权限/索引仍无证据
- 下一步建议：只进入第五次独立代码复审；复审和后续 Human Gate 前，不得创建测试集合、部署测试环境、创建发布候选、受控发布或进入量房风格预览 Task 1

---

### 2026-07-27 — Phase 0F-3B 第三轮定向修复

- 来源：用户任务“修复业务日期漂移与提交槽位一致性缺口”，对应独立复审目录 `production-evidence/2026-07-27/pr5-remediation-v2-independent-review`
- 分支：`fix/pr5-release-blockers-v3`，起点 `8d4c017ca4b0dfb3cc0f6d32762d7f4d4ae20a35`
- PR：未创建，未 push
- 本次做了什么：在提交入口固定一次请求级上海业务时间；key、日报、历史查询和事务重试复用同一 context；新增共享槽位关联校验与严格旧数据识别；提交与审核均在缺 key/关联不一致时安全失败；审核事务错误收敛为公开安全错误；新增本地回滚覆盖
- 修改文件：`cloudfunctions/submitStageLog/`、`cloudfunctions/reviewStageLog/`、`shared/submission-slot.js`、`scripts/sync-stage-flow.js`、`tests/stage-log-behavior/pr5-remediation-v3.test.js`、`docs/pr5-remediation-v3/`、本任务单
- 检查结果：原有 `48/48`、第一轮 `27/27`、第二轮 `14/14`、第三轮 `34/34`，合计 `123/123`；JS 语法、生成副本同步待最终提交前复跑
- 风险与未决问题：本地事务模型不等同真实 CloudBase；未创建集合、未部署或访问任何环境，真实事务/权限/索引仍无证据
- 下一步建议：只进入新的独立代码复审；复审和后续 Human Gate 前，不得创建测试集合、部署测试环境、创建发布候选、受控发布或进入量房风格预览 Task 1

---

### 2026-07-27 — Phase 0F-3 二次阻塞修复

- 来源：用户任务“Phase 0F-3——修复拒绝后重提与真实事务验证缺口”
- 分支：`fix/pr5-release-blockers-v2`，起点 `4cd7ec3d565eac12fa99e38c4279e6346f9ca2af`
- PR：未创建，未 push
- 本次做了什么：将 `stage_log_submission_keys` 改为当前业务提交槽位；拒绝后保留旧日报并创建新尝试；审核在同一事务中同步当前 key；集合/权限/事务错误安全失败；新增乐观冲突与回滚本地模拟
- 修改文件：`cloudfunctions/submitStageLog/submitService.js`、`cloudfunctions/reviewStageLog/reviewService.js`、`tests/stage-log-behavior/pr5-remediation-v2.test.js`、`tests/stage-log-behavior/transaction-model.js`、`docs/pr5-remediation-v2/`
- 检查结果：原有 `48/48`、第一轮 `27/27`、本轮 `14/14`，合计 `89/89`；本地模拟不等同 CloudBase 真实事务证据
- 风险与未决问题：必须人工创建并验证 `stage_log_submission_keys` 集合、服务端权限、真实事务、并发、索引与精确测试数据清理；测试环境部署仍需新的独立复审和齐鑫 Human Gate
- 下一步建议：新的 Codex 会话进行独立代码复审；本轮不得部署、创建集合、访问生产、创建发布候选或进入量房风格预览

---

### 2026-07-27 — Phase 0F-1 PR #5 发布阻塞修复

- 来源：用户任务“Phase 0F-1——修复 PR #5 独立复审阻塞项”
- 分支：`fix/pr5-release-blockers`，起点 `f9656e18c47bfa169998082fdff344755194961a`
- PR：未创建，未 push
- 本次做了什么：创建本地证据分支 `archive/pr5-phase0e-tested-53bbfde`；修复非法 `stageCode` 静默回退、日报最新 20 条去重漏洞、通知默认外发和通知重复调用；上传页对无效保存工序显示明确错误
- 修改文件：日报提交/阶段工具/通知服务及生成副本、`sendOwnerNotice` 服务入口、阻塞测试与 `docs/pr5-remediation/`
- 检查结果：原有 `48/48`、新增 `27/27`、合计 `75/75`；JS 语法、JSON 解析、生成文件同步和 `git diff --check` 通过
- 风险与未决问题：新增 `stage_log_submission_keys` 为惰性创建集合，尚未在任何云环境验证 CloudBase 真实事务；通知默认关闭，外发配置和真实发送必须仅在后续隔离测试环境、且经独立复审后验证
- 下一步建议：由新的 Codex 会话独立复审代码、测试意义、数据结构影响和测试环境部署清单；本轮不得部署、上传、发布或进入量房风格预览

---

### 2026-07-03 — 上传日报 -30001 record manager 冲突修复

- 来源：用户真机截图显示 `-30001: record manager record failed`
- 分支：`codex/init-ai-collaboration`
- PR：未创建，当前仓库没有配置 Git remote
- 本次做了什么：对照微信同声传译文档确认插件内部调用 `wx.getRecorderManager`；修复插件可用时仍初始化普通 `RecorderManager` 的冲突，避免两个录音管理器抢同一录音通道
- 修改文件：`miniprogram/subpackages/internal/pages/upload-log/upload-log.js`
- 检查结果：`node --check miniprogram/subpackages/internal/pages/upload-log/upload-log.js` 通过；`miniprogram/app.json` JSON 解析通过；`git diff --check` 通过
- 风险与未决问题：如仍出现 `-30001`，下一步只查系统麦克风权限、真机占用和微信插件环境，不再改业务逻辑
- 下一步建议：重新编译后真机测试“开始录制 -> 停止录制 -> 是否出现识别原文”

---

### 2026-07-03 — 上传日报录音权限链路与手写入口修复

- 来源：用户截图反馈 `WechatSI` 仍返回 `-30001: record manager record failed`，要求彻底排查语音输入不可用问题
- 分支：`codex/init-ai-collaboration`
- PR：未创建，当前仓库没有配置 Git remote
- 本次做了什么：按微信官方文档确认 `WechatSI` 语音输入配额为每小程序 250 条/分钟、3w 条/天，当前 `-30001` 官方定义为“录音接口出错”，不是配额错误；上传日报页录音前新增隐私授权、系统微信麦克风权限、小程序 `scope.record` 权限三段检查；`WechatSI` 失败后根据权限状态给出更明确提示；修复启动阶段失败时没有 `voiceTempPath` 导致手写补充卡片不出现的问题
- 修改文件：`miniprogram/subpackages/internal/pages/upload-log/upload-log.js`、`miniprogram/subpackages/internal/pages/upload-log/upload-log.wxml`
- 检查结果：`node --check miniprogram/subpackages/internal/pages/upload-log/upload-log.js` 通过；`miniprogram/app.json` JSON 解析通过；`git diff --check` 通过；确认 `ENABLE_V2_DEAL_LOOP_ENTRY = false`
- 风险与未决问题：本地无法代替真机验证 iOS/微信系统麦克风权限；如果修复后仍返回 `-30001` 且权限提示均正常，问题将收敛到 WechatSI 插件录音层/真机环境/微信后台隐私声明，而不是代码额度或云函数额度
- 下一步建议：重新编译后真机测试；如提示“微信没有系统麦克风权限”，去手机设置打开微信麦克风；如提示“小程序录音权限已被拒绝”，去小程序右上角设置打开麦克风；如仍是 `-30001`，截图页面新提示并查看开发者工具 Console

---

### 2026-07-03 — 上传日报 WechatSI 语音识别链路排查与修复

- 来源：用户反馈语音输入仍不能用，要求全面排查根因
- 分支：`codex/init-ai-collaboration`
- PR：未创建，当前仓库没有配置 Git remote
- 本次做了什么：对照微信同声传译官方文档和 `Tencent/Face2FaceTranslator` 示例，确认 `duration/lang` 参数合法；根据开发者工具提示将 `WechatSI` 插件从 `0.3.6` 升到 `0.3.7`；取消 `WechatSI` 失败后自动切普通录音，避免普通录音被误认为语音转文字；失败时直接显示错误码/错误信息并聚焦手写补充
- 修改文件：`miniprogram/app.json`、`miniprogram/subpackages/internal/pages/upload-log/upload-log.js`
- 本地配置：`project.private.config.json` 为 skip-worktree 文件，已在本机改为 `useApiHook: false`，用于关闭开发者工具 API Hook 干扰，但不进入提交
- 检查结果：`node --check miniprogram/subpackages/internal/pages/upload-log/upload-log.js` 通过；`miniprogram/app.json` JSON 解析通过；`project.private.config.json` JSON 解析通过；`git diff --check` 通过
- 风险与未决问题：如果真机仍返回 `WechatSI` 错误码，则问题在微信插件服务/网络/环境，不再由普通录音兜底掩盖；页面会显示具体错误码用于下一步定位
- 下一步建议：重新编译后先在开发者工具测一次，再用真机预览测一次；如仍失败，记录页面/Console 中的 `retcode/msg`

---

### 2026-07-03 — 上传日报恢复语音输入主流程并保留手写补充

- 来源：用户明确要求保留原来的“语音输入 AI 整理”，只补一个打字功能
- 分支：`codex/init-ai-collaboration`
- PR：未创建，当前仓库没有配置 Git remote
- 本次做了什么：移除上传日报页中过重的语音插件诊断提示；恢复“AI 识别并整理”主文案；保留识别失败时的手写补充输入框；保留手写内容可绕过无识别文字 warning 的兜底逻辑
- 修改文件：`miniprogram/subpackages/internal/pages/upload-log/upload-log.js`、`miniprogram/subpackages/internal/pages/upload-log/upload-log.wxml`、`miniprogram/subpackages/internal/pages/upload-log/upload-log.wxss`
- 检查结果：`node --check miniprogram/subpackages/internal/pages/upload-log/upload-log.js` 通过；`git diff --check` 通过；确认 `ENABLE_V2_DEAL_LOOP_ENTRY = false`
- 风险与未决问题：`WechatSI` 真机/开发者工具识别稳定性仍取决于微信插件能力；本阶段只保证识别失败时能打字继续 AI 整理
- 下一步建议：重新编译后按“录音 -> 失败则手写一句 -> AI 识别并整理”验证回填

---

### 2026-07-03 — 上传日报手写兜底仍被语音 warning 卡住修复

- 来源：用户截图反馈已手写“今天开工交底”后仍提示语音未识别，点击流程仍不通
- 分支：`codex/init-ai-collaboration`
- PR：未创建，当前仓库没有配置 Git remote
- 本次做了什么：修复手写补充后旧语音 warning 不清理的问题；AI 整理阶段如果没有语音识别文字，则只把手写文本传给 `generateStageLogDraft`，不再提前上传无 transcript 的语音文件触发云函数 warning；将按钮文案从“AI 识别并整理”改为“AI 整理日报”，避免误导
- 修改文件：`miniprogram/subpackages/internal/pages/upload-log/upload-log.js`、`miniprogram/subpackages/internal/pages/upload-log/upload-log.wxml`
- 检查结果：`node --check miniprogram/subpackages/internal/pages/upload-log/upload-log.js` 通过；`git diff --check` 通过
- 风险与未决问题：`WechatSI` 仍可能在开发者工具或当前环境不返回识别文字；该修复保证手写文本兜底可继续生成日报，但不等同于新增真实语音转文字服务
- 下一步建议：重新编译后用“录音失败/无识别文字 + 手写一句 + AI 整理日报”验证今日完成是否回填

---

### 2026-07-03 — 上传日报语音识别不可用诊断增强

- 来源：用户反馈上传日报语音仍无法识别，且找不到同声传译 / WechatSI 插件
- 分支：`codex/init-ai-collaboration`
- PR：未创建，当前仓库没有配置 Git remote
- 本次做了什么：确认上传日报语音转文字依赖微信同声传译 `WechatSI` 插件；增强插件不可用、启动失败、识别失败的页面提示；保留普通录音和手写补充兜底；修复手写补充按钮优先聚焦兜底输入框
- 修改文件：`miniprogram/subpackages/internal/pages/upload-log/upload-log.js`、`miniprogram/subpackages/internal/pages/upload-log/upload-log.wxml`、`miniprogram/subpackages/internal/pages/upload-log/upload-log.wxss`
- 检查结果：`node --check miniprogram/subpackages/internal/pages/upload-log/upload-log.js` 通过；`git diff --check` 通过；确认 `ENABLE_V2_DEAL_LOOP_ENTRY = false`
- 风险与未决问题：本地无法读取微信公众平台插件状态或额度；如后台确实无法添加同声传译插件，则当前项目没有可用的真实语音转文字能力，只能普通录音 + 手写补充，或后续接入新的 ASR 服务
- 下一步建议：在微信开发者工具重新编译后测试；若页面提示插件不可用，优先确认小程序后台插件/隐私权限，或进入独立阶段接入新的语音识别服务

---

### 2026-06-29 — 初始化 AI 协作机制

- 来源：用户要求初始化 ChatGPT + Codex + GitHub 协作机制
- 分支：`codex/init-ai-collaboration`
- Commit：`8c665e3`
- PR：未创建，当前仓库没有配置 Git remote，`git push -u origin codex/init-ai-collaboration` 失败
- 本次做了什么：新增仓库级协作协议、任务模板、handoff 日志、Loop 协议、Issue 模板和 PR 模板
- 修改文件：见本分支 diff
- 检查结果：`git diff --cached --check` 通过；未运行 build（本次只改文档）
- 风险与未决问题：当前仓库暂无 Git remote，push 和 PR 创建可能需要先配置远端
- 下一步建议：配置 GitHub remote 后推送分支并创建 PR

---

### 2026-06-30 — Phase 2：V2 Mock 原型页面

- 来源：用户 Human Gate 确认允许进入 Phase 2
- 分支：`codex/init-ai-collaboration`
- PR：未创建，当前仓库没有配置 Git remote
- 本次做了什么：新增 `deal-loop` 独立分包、6 个 V2 mock 页面、5 个 mock 数据文件、5 个 utils 文件，并仅在 `app.json` 注册分包
- 修改文件：`miniprogram/app.json`、`miniprogram/subpackages/deal-loop/**`、`AI_TASKS/handoff.md`
- 检查结果：`miniprogram/app.json` JSON 解析通过；新增 JS 文件 `node --check` 通过；`deal-loop` 未命中云函数、数据库、真实 AI 请求关键词；未运行 build，未部署
- 风险与未决问题：Phase 2 只保留开发者直达入口，未挂工作台；进入 Phase 3 前需再次 Human Gate
- 下一步建议：人工用开发者直达路径检查 mock 页面，再决定是否进入 Phase 3 只读接入设计
