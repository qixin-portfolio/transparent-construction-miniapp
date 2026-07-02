# V2 Deal Loop Phase 6-B：反馈采集与销售跟进增强最小实现

## 当前阶段

Phase 6-B：反馈采集与销售跟进增强最小实现。

本阶段基于 Phase 6-A 的优先级结论，在 V2 的 `pipeline` 和 `customer-detail` 页面增加轻量反馈采集提示与销售跟进增强提示。

## 当前 HEAD / tag

- 当前 HEAD：`18241ecc8f94c4634fc5314bca408fa89e943d4c`
- 当前 tag：`v2-deal-loop-phase6a-feedback-priority-design`
- 当前入口状态：`ENABLE_V2_DEAL_LOOP_ENTRY = false`

## 本阶段目标

本阶段目标：

1. 帮助老板体验后能给出有效反馈。
2. 帮助销售更容易理解下一步该跟什么。
3. 只做页面文案和剪贴板复制，不写数据库。
4. 不接真实 AI。
5. 不创建真实工地。
6. 不自动发布内容。

## 修改文件列表

本阶段修改：

1. `miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.js`
2. `miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.wxml`
3. `miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.wxss`
4. `miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.js`
5. `miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.wxml`
6. `miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.wxss`
7. `AI_TASKS/V2_DEAL_LOOP_PHASE6B_FEEDBACK_FOLLOWUP_MINI_IMPLEMENTATION.md`

## pipeline 增强内容

新增轻量模块：`本轮体验反馈`。

说明文案：

`看完成交跟进后，请老板重点反馈：是否看得懂、哪个客户最值得跟、下一步动作是否清楚。`

展示 3 个问题：

1. `你能一眼看懂今天应该重点跟进谁吗？`
2. `当前客户阶段和跟进建议是否清楚？`
3. `哪个信息最能帮助你判断成交机会？`

新增按钮：

`复制反馈问题`

按钮行为：

1. 仅使用 `wx.setClipboardData` 复制反馈问题文本。
2. 不写数据库。
3. 不请求接口。
4. 不上传。

## customer-detail 增强内容

新增轻量模块：`成交跟进复盘`。

说明文案：

`进入客户详情后，先确认顾虑、下一步动作和需要补充的信任材料。`

展示 4 个复盘问题：

1. `这个客户当前最大的顾虑是什么？`
2. `下一步应该约沟通、补资料，还是推进签约？`
3. `需要给客户看哪些工地证据或案例？`
4. `当前建议有没有误导或看不懂的地方？`

新增按钮：

`复制客户反馈问题`

按钮行为：

1. 仅使用 `wx.setClipboardData` 复制客户反馈问题文本。
2. 不写数据库。
3. 不请求接口。
4. 不上传。

## 反馈采集方式

本阶段采用低风险反馈采集方式：

1. 页面展示反馈问题。
2. 老板或内部人员可点击复制问题。
3. 反馈通过人工方式收集。
4. 不在小程序内写入反馈数据。
5. 不新增反馈表数据库。
6. 不新增云函数。

## 销售跟进增强内容

pipeline 新增“销售跟进提示”：

1. `优先看高意向客户`
2. `先确认客户顾虑`
3. `再准备信任证据`
4. `最后推进下一步动作`

customer-detail 新增跟进提示：

1. `先确认客户顾虑`
2. `再判断下一步动作`
3. `补充信任材料后再推进`
4. `请人工判断后使用`

销售助手建议继续表达为：

1. 示例建议。
2. 内部参考。
3. 请人工判断后使用。
4. 不调用真实 AI。

## 未改变的能力边界

本阶段未改变：

1. 工作台入口状态。
2. V2 入口开关。
3. 云函数调用逻辑。
4. 数据库读写逻辑。
5. V2 其它页面。
6. tabBar。
7. `miniprogram/app.json`。
8. 工作台入口。

继续保持：

1. V2 试验功能。
2. 只读客户资料。
3. 内部成交跟进。
4. 不调用真实 AI。
5. 不创建真实工地。
6. 不自动发布内容。
7. 不影响现有客户、工地和日报数据。

## 测试结果

已执行：

```bash
node --check miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.js
node --check miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.js
git diff --check
git status
```

检查结论：

1. `pipeline.js` 语法检查通过。
2. `customer-detail.js` 语法检查通过。
3. `git diff --check` 通过。
4. `ENABLE_V2_DEAL_LOOP_ENTRY = false`。
5. 未修改 `cloudfunctions/`。
6. 未修改 `miniprogram/app.json`。
7. 未修改工作台入口。
8. 未修改 tabBar。
9. 未修改 `ai-assistant / trust-materials / contract-to-project / case-assets`。
10. 未新增 `db.collection`。
11. 未新增 `cloud.database`。
12. 未新增 `wx.request`。
13. 未新增 `createProject / submitStageLog / reviewStageLog / getTempFileURL`。
14. 未新增真实 AI API。
15. 未部署云函数。
16. 未上传体验版。
17. 未发布正式版。

## 发布判断

当前不建议发布正式版。

当前仍不做：

1. 不打开入口。
2. 不上传体验版。
3. 不部署云函数。
4. 不接真实 AI。
5. 不创建真实工地。
6. 不写数据库。

## 是否建议进入 Phase 6-C

建议进入 Phase 6-C：反馈提示人工验收与优先级复核。

Phase 6-C 建议只做：

1. 人工查看两个页面新增模块。
2. 确认复制反馈问题可用。
3. 确认文案没有误导真实 AI、创建工地、自动发布能力。
4. 根据老板反馈决定是否继续增强销售跟进或信任证据素材。
