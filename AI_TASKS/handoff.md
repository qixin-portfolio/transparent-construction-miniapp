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

### 2026-07-10 — Phase 7-SEC-3 PR #2 合并阻塞项修复

- 来源：Phase 7-SEC-2 审查结论 C；用户要求修复 PR #2 合并阻塞项并增加最小行为测试
- 分支：`codex/v1-security-hardening`
- 修复前 HEAD：`bf046dbd747f028bebb8f2264474f549b3f26d4a`
- PR：https://github.com/qixin-portfolio/transparent-construction-miniapp/pull/2
- 本次修复：dailySummary 增加可信定时密钥、tenant 分区及默认租户 webhook 边界；reviewStageLog 审核事务化并补并发幂等、进度单调和通知状态；完工纪念册改用 HMAC 有效期 token 并收紧标题与返回字段；公开案例改为服务端 DTO 白名单；员工邀请码增加角色白名单、事务兑换和原子限流
- 测试：静态安全回归 20/20；行为测试 38/38；行为测试使用提取业务函数和受控 fake transaction，不等同于真实云环境测试
- 历史兼容：旧 projectId-only 分享链接安全失效；旧 public 授权需重新保存；空 tenantId 数据和旧邀请码仍需生产库只读盘点
- 部署边界：未部署、未上传体验版、未发布、未执行迁移；dailySummary 未完成真实密钥与定时触发验证前禁止部署；AI、initSaasDefaults、seedCustomerBenefits 排除
- 状态变化：GitHub 显示 PR #2 已于本阶段修复提交前合并，merge commit `5f4d94275cee2f9564613efe14470b7c40e0c128`；SEC-3 新提交不会进入已合并 PR，后续必须新建独立安全修复 PR
- 记录：`AI_TASKS/V1_PR2_SECURITY_BLOCKERS_RESOLUTION.md`
- 下一步建议：push 安全分支后新建修复 PR，进入 Phase 7-SEC-4 二次安全审查；不得直接部署

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

---

### 2026-07-08 — Phase 7-LAUNCH-2-E 体验版验证阶段尝试被云函数部署阻塞

- 来源：用户要求进入体验版验证阶段
- 分支：`codex/init-ai-collaboration`
- 当前 commit：`9df2a94a02674e89ec807f38c08614291d3a9679`
- 当前 tag：`v1-launch2-role-entry-free-usage-mode`
- 本次计划：部署 `createProject`、`getCurrentTenantPlan`、`createStaffInviteCode`、`bindStaffRole`，然后上传体验版验证首页角色分流和试运行免费开放模式
- 检查结果：相关 JS `node --check` 通过；`git diff --check` 通过；`ENABLE_V2_DEAL_LOOP_ENTRY = false`；CLI 登录状态正常；云环境 `cloud1-d4g7zh8kpca0e26d5` 可查询
- 阻塞原因：微信开发者工具 CLI 连续两次部署 4 个云函数均失败，错误为 `getCloudAPISignedHeader failed`，`ret=41002`，`errmsg=system error`
- 本次决策：未上传体验版，避免前端显示“免费开放”但线上云函数仍保留旧额度限制造成体验错位
- 新增记录：`AI_TASKS/V1_LAUNCH2_EXPERIENCE_VALIDATION_ATTEMPT.md`
- 下一步建议：人工打开微信开发者工具，确认账号/云环境后手动部署一个云函数测试；成功后再回 Codex 重试部署 4 个云函数并上传体验版

---

### 2026-07-08 — Phase 7-LAUNCH-2-E 体验版上传成功

- 来源：用户反馈云函数已部署成功，要求继续
- 当前 commit：`a8695f39f96d48bb0b95e80bcaa909ae38f5ef3d`
- 云函数状态：用户反馈已通过微信开发者工具人工部署成功；Codex CLI 复验部署仍因 `getCloudAPISignedHeader failed / ret=41002` 失败，因此以人工部署成功反馈为准
- 体验版上传命令：微信开发者工具 CLI `upload`
- 体验版版本：`7.2.0`
- 体验版备注：`V1上线后体验优化：首页角色分流；试运行期免费开放；V2成交闭环入口保持关闭。`
- 上传结果：成功
- 包体大小：TOTAL 1.9 MB；main 1.3 MB；deal-loop 131.6 KB；internal 251.0 KB；owner 156.5 KB
- 当前 V2 状态：`ENABLE_V2_DEAL_LOOP_ENTRY = false`
- 未发布正式版
- 下一步建议：进入真机体验版验证，重点测新用户三入口、业主绑定、员工邀请码、老板工作台、创建工地/员工邀请码不再被套餐额度阻断

---

### 2026-07-08 — 体验版 7.2.1 注册闪退修复覆盖上传

- 来源：用户反馈新用户扫码后进入装修公司注册页闪退，随后要求上传体验版
- 修复 commit：`d5fd44fd1bb2cddd7a1baa23c7ff5c152996947b`
- 修复内容：`pages/register/register?entry=boss_register` 不再被残留扫码入口上下文或临时 `owner` 身份重定向走；进入装修公司注册页保持停留
- 体验版版本：`7.2.1`
- 体验版备注：`V1上线后体验优化补丁：修复新用户进入装修公司注册页闪退；V2成交闭环入口保持关闭。`
- 上传结果：成功
- 包体大小：TOTAL 1.9 MB；main 1.3 MB；deal-loop 131.6 KB；internal 251.0 KB；owner 156.5 KB
- 当前 V2 状态：`ENABLE_V2_DEAL_LOOP_ENTRY = false`
- 未发布正式版
- 下一步建议：用新微信或清缓存后扫码体验版，点击“我是装修公司 / 管理员”，确认注册页不再闪退

---

### 2026-07-08 — 新用户首页三入口消失问题修复

- 来源：用户录屏反馈新用户扫码后没有角色选择入口，直接进入“我的施工进度 / 还未绑定工地”业主页
- 根因：workbench 默认登录时仍可能因为残留入口上下文触发 `allowGuestFlow`，`login` 云函数会把新用户创建为 `owner`；已经创建过的无租户 `owner` 又被旧兼容逻辑补默认租户，导致首页不显示三入口
- 修复：workbench 默认登录传入 `ignoreEntryContext`，避免首页被扫码上下文误判为游客业主流；`login` 云函数不再把 `owner` 纳入内部旧角色默认租户兼容
- 修改文件：`miniprogram/app.js`、`miniprogram/pages/workbench/workbench.js`、`cloudfunctions/login/index.js`
- 检查结果：`node --check` 通过；`git diff --check` 通过；`ENABLE_V2_DEAL_LOOP_ENTRY = false`
- 后续生效要求：需要部署 `login` 云函数，并重新上传体验版

---

### 2026-07-08 — 体验版 7.2.2 新用户角色入口修复部署上传

- 来源：用户反馈新用户扫码后角色选择入口消失，要求部署并上传
- 修复 commit：`e5fe997c03bb7eafb0e4d2928dcc690cf90e57c5`
- 部署云函数：`login`
- 部署环境：`cloud1-d4g7zh8kpca0e26d5`
- 部署结果：成功，`login` success=true，filesCount=3，packSize=2.1 KB
- 体验版版本：`7.2.2`
- 体验版备注：`V1上线后体验优化补丁：修复新用户角色选择入口消失；V2成交闭环入口保持关闭。`
- 上传结果：成功
- 包体大小：TOTAL 1.9 MB；main 1.3 MB；deal-loop 131.6 KB；internal 251.0 KB；owner 156.5 KB
- 当前 V2 状态：`ENABLE_V2_DEAL_LOOP_ENTRY = false`
- 未发布正式版
- 下一步建议：用全新微信或清缓存后扫码体验版，确认首页出现“我是业主 / 我是员工工长 / 我是装修公司管理员”三入口

---

### 2026-07-10 — V1 上线后安全加固完成，待 PR 审查

- 来源：GitHub Issue #1；用户要求依据代码审计建议修复 BUG 和安全雷点
- 分支：`codex/v1-security-hardening`
- 修复 commit：`69cfbd6899fce54f923335b8b7490cfbccb77b1d`
- PR：https://github.com/qixin-portfolio/transparent-construction-miniapp/pull/2
- 本次修复：通知和种子函数补调用者鉴权；公开纪念册改为业主/同租户管理员私有访问或可撤销公开授权；公开案例按授权材料返回；套餐管理禁止普通企业管理员跨租户修改；日报只允许审核 pending 且项目进度不倒退；邀请码事务兑换并限制错误尝试；历史空 `tenantId` 仅归默认租户；关键多记录写入改为事务；删除工地补全分页和旧照片清理；真实 AI 外部请求默认关闭；云函数 SDK 固定为 `2.6.3`
- 前端改动：完工纪念册分享携带授权记录 ID；未公开时引导设置授权；未授权房屋信息不对外展示
- 测试：`tests/security-regression.test.js` 20/20 通过；全部 JS `node --check` 通过；64 个 JSON 解析通过；39 个页面文件完整；`git diff --check` 通过
- 安全状态：`ENABLE_V2_DEAL_LOOP_ENTRY = false`；V2 guard 未删除；未执行数据库脚本或生产写入
- 未执行：未部署云函数；未上传体验版；未发布正式版；未自动合并 PR
- 下一步：创建 PR 并人工审查；通过后再单独决定云函数部署和体验版回归范围
