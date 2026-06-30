# 透明工地 V2：成交闭环版 Phase 2.5 成交动作感优化

## 1. 当前阶段

Phase 2.5：成交动作感优化。

本阶段基于 `v2-deal-loop-phase2-mock` 安全 tag 之后继续，只做 V2 Mock 原型的产品体验优化，不进入 Phase 3。

## 2. 优化目标

把 V2 Mock 原型从“客户列表 + 静态资料”优化为“老板今天的成交作战台”：

- 让 pipeline 首屏直接看到今日待跟进、重点推进、临门一脚和高风险流失。
- 让客户卡片突出今日动作、推荐素材、建议话术和风险等级。
- 让 AI mock 建议更像销售助手，而不是普通文本提示。
- 让信任素材库更像销售可用的信任证据库。
- 让签约转工地、工地转案例资产的边界更清楚。

## 3. 修改文件列表

- `AI_TASKS/V2_DEAL_LOOP_PHASE2_5_POLISH.md`
- `miniprogram/subpackages/deal-loop/mock/aiSuggestions.js`
- `miniprogram/subpackages/deal-loop/mock/caseAssets.js`
- `miniprogram/subpackages/deal-loop/mock/customers.js`
- `miniprogram/subpackages/deal-loop/mock/trustMaterials.js`
- `miniprogram/subpackages/deal-loop/pages/ai-assistant/ai-assistant.js`
- `miniprogram/subpackages/deal-loop/pages/ai-assistant/ai-assistant.wxml`
- `miniprogram/subpackages/deal-loop/pages/ai-assistant/ai-assistant.wxss`
- `miniprogram/subpackages/deal-loop/pages/case-assets/case-assets.wxml`
- `miniprogram/subpackages/deal-loop/pages/case-assets/case-assets.wxss`
- `miniprogram/subpackages/deal-loop/pages/contract-to-project/contract-to-project.js`
- `miniprogram/subpackages/deal-loop/pages/contract-to-project/contract-to-project.wxml`
- `miniprogram/subpackages/deal-loop/pages/contract-to-project/contract-to-project.wxss`
- `miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.wxml`
- `miniprogram/subpackages/deal-loop/pages/customer-detail/customer-detail.wxss`
- `miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.js`
- `miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.json`
- `miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.wxml`
- `miniprogram/subpackages/deal-loop/pages/pipeline/pipeline.wxss`
- `miniprogram/subpackages/deal-loop/pages/trust-materials/trust-materials.js`
- `miniprogram/subpackages/deal-loop/pages/trust-materials/trust-materials.json`
- `miniprogram/subpackages/deal-loop/pages/trust-materials/trust-materials.wxml`
- `miniprogram/subpackages/deal-loop/pages/trust-materials/trust-materials.wxss`
- `miniprogram/subpackages/deal-loop/utils/aiMockEngine.js`
- `miniprogram/subpackages/deal-loop/utils/materialMapper.js`
- `miniprogram/subpackages/deal-loop/utils/pipelineStatus.js`
- `miniprogram/subpackages/deal-loop/utils/riskGuards.js`
- `miniprogram/subpackages/deal-loop/utils/v1Adapters.js`

## 4. pipeline 优化说明

- 页面标题改为“今日成交跟进”。
- 副标题改为“看清客户阶段、下一步动作和可发送的信任素材”。
- 顶部统计改为行动指标：今日待跟进、重点推进、临门一脚、高风险流失。
- 增加行动筛选：今日跟进、高风险、临门一脚。
- 默认队列按行动优先级排序：高风险 > 重点推进 > 临门一脚 > 新线索。
- Phase 2.5 保护说明改为弱化折叠展示，避免抢占主视觉。

## 5. 客户卡片优化说明

- 客户卡片突出成交动作，不再只展示客户资料。
- 新增展示字段：今日动作、推荐素材、建议话术、中文风险等级。
- 风险等级展示改为：高风险、中风险、低风险。
- 新增 mock 快捷动作：看客户、AI 话术、推荐素材。
- 快捷动作只做页面跳转，不触发真实数据写入。

## 6. AI mock 优化说明

- AI 建议结构调整为：客户当前顾虑、推荐跟进方式、可发送素材、建议话术。
- AI 页面明确标注：当前为本地 mock 建议，不调用真实 AI。
- AI mock 数据继续来自 `mock/aiSuggestions.js` 和本地 `utils/aiMockEngine.js`。
- 不新增任何真实 AI API、网络请求或云函数调用。

## 7. 信任素材库优化说明

- 页面命名调整为“信任证据库”。
- 素材卡片展示：素材标题、素材类型、适合客户阶段、解决的客户顾虑、推荐发送场景。
- mock 发送按钮只弹出本地提示，不调用分享 API，不写数据库，不上传素材。

## 8. 签约转工地保护说明

- 页面明确表达：签约后，客户资料如何转换为工地创建草案。
- 展示字段映射：`customerId -> project.customerId`、客户姓名 -> 业主姓名、小区/面积/风格/预算 -> 工地基础信息草案。
- 创建工地按钮保持 disabled。
- 页面明确标注：Phase 2.5 不调用 createProject，不写 projects。

## 9. 工地转案例资产说明

- 页面明确表达：完工工地如何沉淀成案例内容资产。
- 增加内容方向：小红书笔记标题草案、抖音短视频选题、官网案例摘要、GEO 问答素材。
- 增加可用素材清单和授权状态 mock。
- 页面明确标注：当前仅为 mock 案例资产，不自动发布，不修改 case_authorizations。

## 10. V1 未触碰说明

本阶段未修改：

- `miniprogram/pages/`
- `miniprogram/subpackages/owner/`
- `miniprogram/subpackages/internal/`
- `cloudfunctions/`
- `miniprogram/app.json`
- `project.config.json`
- `project.private.config.json`
- 数据库读写逻辑
- 工作台入口
- tabBar

## 11. 风险防护检查

本阶段保持以下边界：

- 不接真实 `customers/projects/stage_logs/photos`。
- 不调用 `wx.cloud.callFunction`。
- 不调用 `db.collection`。
- 不调用 `cloud.database`。
- 不接真实 AI API。
- 不部署。
- 不上传体验版。
- 不进入 Phase 3。

## 12. 验收方式

建议验收：

1. 运行 `git diff --check`。
2. 检查 `git diff --name-only` 是否只包含 `miniprogram/subpackages/deal-loop/` 和本文件。
3. 搜索 V2 分包内是否存在真实调用关键字。
4. 在微信开发者工具中分别打开 6 个 V2 直达页面。
5. 验证按钮只做页面跳转、mock 提示、复制草案，不触发真实写入。

## 13. Phase 3 前置条件

进入 Phase 3 前必须单独 Human Gate 确认：

- 是否允许新增真实数据库集合。
- 是否允许设计或部署 V2 云函数。
- 是否允许接入 V1 只读数据。
- 是否允许接入真实 AI API。
- 是否允许增加工作台入口或灰度入口。
- 是否允许进入体验版上传或部署流程。
