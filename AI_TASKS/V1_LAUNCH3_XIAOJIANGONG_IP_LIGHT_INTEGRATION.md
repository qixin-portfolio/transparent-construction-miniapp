# Phase 7-LAUNCH-3：晟景小监工 IP 轻量接入记录

## 1. 当前阶段

- 阶段：Phase 7-LAUNCH-3：晟景小监工 IP 轻量接入
- 基线 commit：fe510d0c3f1bf086f99cec20226498da8792a1b9
- 基线 tag：HEAD 当前无 tag
- 当前分支：codex/init-ai-collaboration

## 2. IP 定位

晟景小监工是晟景透明工地服务的人格化入口。

核心作用是帮用户形成一个清楚记忆点：装修进度有人管，现场照片看得见，施工记录有留痕。

## 3. 使用边界

- 不把晟景小监工描述为现实中的个人或施工人员。
- 不把 IP 形象当作真实工地证据。
- 不把示意内容当作真实客户案例。
- 不新增自动验收结论。
- 不新增消息推送、分享海报或复杂动画。
- 保持专业、温暖、可信，不过度娱乐化。

## 4. 接入页面

- 首页 / 角色分流页：`miniprogram/pages/workbench/workbench.wxml`
- 业主端绑定与工地详情页：`miniprogram/subpackages/owner/pages/owner/owner.wxml`
- 业主项目列表空状态：`miniprogram/subpackages/owner/pages/projects/projects.wxml`
- 工长日报上传成功状态：`miniprogram/subpackages/internal/pages/upload-log/upload-log.js`
- 老板审核日报页：`miniprogram/subpackages/internal/pages/review-log/review-log.wxml`

## 5. 首页欢迎卡改动

角色分流页顶部新增轻量欢迎卡：

- 标题：晟景小监工为你记录装修进度
- 副标题：施工日报、现场照片、设计方案，手机上就能看。
- 标语：装修进度，看得见才放心

该卡片不改变三个角色入口，不影响新用户选择入口。

## 6. 空状态改动

已替换或补充以下空状态：

- 未绑定工地：提示联系晟景工作人员获取 6 位绑定码。
- 今天没有施工日报：提示审核后业主才能看到。
- 现场照片未上传：提示上传后可查看工地进度。
- 设计方案未上传：提示上传后可在线查看确认。
- 老板端暂无待审核：提示新的施工日报会进入审核列表。

本阶段只改文案和轻量卡片，不改变数据判断条件。

## 7. 日报上传成功状态改动

工长提交日报成功后，弹窗标题调整为“已上传”，内容补充：

- 小监工已收到今日施工记录。
- 管理员审核通过后，业主才能看到日报和现场照片。
- 如果本次没有照片，提示建议补充现场照片。
- 如果施工说明过短，提示补充后更方便老板审核。

本阶段未新增必填项，未改变上传、审核、语音或手写兜底逻辑。

## 8. 老板审核成功状态改动

老板审核通过后，成功提示调整为：

- 已审核，业主可查看

退回修改场景补充说明：

- 请补充现场照片或施工说明后重新提交。

审核流程、状态流转和云函数调用保持不变。

## 9. 业主端小监工提醒模块

业主工地详情页新增“小监工提醒”模块。

默认文案：

- 小监工帮你整理了今日工地进度。

按项目阶段展示轻量提醒：

- 水电阶段：建议重点查看管线照片和验收记录。
- 防水阶段：建议重点查看闭水记录和现场照片。
- 瓦工阶段：建议查看瓷砖铺贴、缝隙和阳角处理。
- 完工后：可以查看家装档案、电子质保和售后服务。

该模块不生成验收结论，不遮挡核心进度和施工日报列表。

## 10. 素材使用情况

本阶段未发现本地晟景小监工 PNG 素材。

处理方式：

- 未生成假图片。
- 未使用网图。
- 未接入外部素材。
- 页面采用纯文案卡片和预留 class。

后续待补充：晟景小监工透明背景 PNG。

## 11. 修改文件列表

- `miniprogram/pages/workbench/workbench.wxml`
- `miniprogram/pages/workbench/workbench.wxss`
- `miniprogram/subpackages/internal/pages/upload-log/upload-log.js`
- `miniprogram/subpackages/internal/pages/review-log/review-log.js`
- `miniprogram/subpackages/internal/pages/review-log/review-log.wxml`
- `miniprogram/subpackages/internal/pages/review-log/review-log.wxss`
- `miniprogram/subpackages/owner/pages/owner/owner.js`
- `miniprogram/subpackages/owner/pages/owner/owner.wxml`
- `miniprogram/subpackages/owner/pages/owner/owner.wxss`
- `miniprogram/subpackages/owner/pages/projects/projects.wxml`
- `AI_TASKS/V1_LAUNCH3_XIAOJIANGONG_IP_LIGHT_INTEGRATION.md`

## 12. 权限安全确认

- 未修改云函数。
- 未修改数据库。
- 未修改权限逻辑。
- 未修改 V2 deal-loop。
- 未新增自动创建工地。
- 未新增自动发送。
- 未新增订阅消息。
- 未新增分享海报。
- 未改变老板、工长、业主主流程的数据边界。

## 13. V2 状态确认

- `miniprogram/pages/workbench/workbench.js`：`ENABLE_V2_DEAL_LOOP_ENTRY = false`
- `miniprogram/subpackages/deal-loop/utils/accessGuard.js`：`ENABLE_V2_DEAL_LOOP_ENTRY = false`
- V2 成交闭环入口继续关闭。
- deal-loop guard 未删除。

## 14. 测试结果

已执行：

- `node --check miniprogram/subpackages/internal/pages/upload-log/upload-log.js`：通过
- `node --check miniprogram/subpackages/internal/pages/review-log/review-log.js`：通过
- `node --check miniprogram/subpackages/owner/pages/owner/owner.js`：通过
- `git diff --check`：通过
- 本阶段改动文件禁用表述检查：通过
- 本阶段改动范围内真实 AI key / createProject 自动调用检查：通过

静态确认：

- 未修改 `cloudfunctions/`
- 未新增真实 AI
- 未新增 `createProject` 自动调用
- 未新增订阅消息
- 未新增数据库写入

## 15. 是否建议上传体验版验证

建议进入体验版验证。

验证重点：

- 新用户进入首页时，角色分流入口仍稳定显示。
- 首页欢迎卡不遮挡三个角色入口。
- 业主未绑定工地时能继续输入绑定码。
- 工长提交日报后成功提示正常出现。
- 老板审核通过和退回修改提示正常出现。
- 业主端“小监工提醒”不遮挡进度、照片和施工时间线。
- V2 成交闭环入口仍不可见。
