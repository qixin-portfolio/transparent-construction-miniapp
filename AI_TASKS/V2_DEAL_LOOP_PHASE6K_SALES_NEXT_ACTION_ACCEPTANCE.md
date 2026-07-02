# 透明工地 V2：成交闭环版 - Phase 6-K 销售下一步动作卡本地验收

## 1. 当前阶段

Phase 6-K：本地人工验收销售下一步动作卡

## 2. 当前 HEAD / tag

- 当前 HEAD：bfbd3d34e026ad66d556cf7446ae114a861fe12f
- 当前 tag：v2-deal-loop-phase6j-sales-next-action-mini-implementation
- 当前安全状态：入口关闭，未上传体验版，未发布正式版

## 3. 本阶段目标

本阶段本地临时打开 V2 入口，验收 Phase 6-J 新增的“销售下一步动作卡”和“复制跟进话术”是否清楚、可用、无误导。

本阶段不上传体验版，不部署云函数，不发布正式版。

## 4. 本地临时开关操作

本阶段按验收流程曾在本地临时执行：

- 将 `miniprogram/pages/workbench/workbench.js` 中的 `ENABLE_V2_DEAL_LOOP_ENTRY = false` 临时改为 `true`
- 用于本地查看工作台 V2 成交跟进入口
- 验收结束后已立即恢复为 `ENABLE_V2_DEAL_LOOP_ENTRY = false`

最终提交状态确认：

- `ENABLE_V2_DEAL_LOOP_ENTRY = false`
- `git diff` 中未保留入口打开状态
- 工作台入口默认仍隐藏
- 本阶段不提交 `workbench.js`

## 5. 工作台入口验收结果

本地临时打开入口后，工作台 V2 成交跟进入口卡片验收通过。

入口卡片文案仍保持安全边界：

- 成交跟进
- V2 试验功能
- 仅老板内部体验
- 只读客户资料
- 不创建真实工地
- 不调用真实 AI
- 不自动发布内容

入口仍通过 `canViewDealLoopV2` 控制，显示条件保持：

```js
ENABLE_V2_DEAL_LOOP_ENTRY && isBoss
```

## 6. pipeline 动作卡验收结果

`pipeline` 页面客户卡片新增“下一步动作”验收通过。

客户卡片新增内容正常显示：

- 下一步动作
- 跟进重点
- 提示

验收结论：

- 文案能让老板/销售快速理解下一步怎么跟
- 文案保持“内部参考”语气
- 未暗示真实 AI 自动判断
- 未暗示写入客户状态
- 未暗示自动跟进
- 未改变客户状态

## 7. customer-detail 动作卡验收结果

`customer-detail` 页面“下一步跟进动作”卡验收通过。

卡片内容正常显示：

- 当前判断
- 建议动作
- 可复制跟进话术

验收结论：

- 当前判断清楚
- 建议动作实用
- 跟进话术自然
- 明确内部参考、人工判断
- 未暗示自动发送
- 未暗示写入跟进记录

## 8. 复制能力验收

“复制跟进话术”按钮验收通过。

复制能力边界确认：

- 可复制文本
- 只使用 `wx.setClipboardData`
- 不发送消息
- 不写数据库
- 不请求接口
- 不上传文件
- 不产生客户数据变更

## 9. 文案风险检查

用户可见文案检查通过。

未发现新增用户可见文案出现以下风险表达：

- 自动成交
- AI 自动判断
- 自动跟进
- 自动发送
- 自动创建工地
- 一键创建工地
- 自动发布案例
- 可直接发布
- 正式功能
- 正式上线
- `createProject`
- `db.collection`
- `wx.request`
- Phase 3B
- Readonly

允许并保留的限制说明：

- 内部参考
- 示例建议
- 人工判断
- 只读客户资料
- 不影响现有数据
- 复制跟进话术
- 不调用真实 AI
- 不写入跟进记录

说明：既有 CSS 类名中的 `mock` 不是用户可见文案，不影响本阶段验收结论。

## 10. 入口关闭恢复确认

验收结束后已恢复：

```js
const ENABLE_V2_DEAL_LOOP_ENTRY = false
```

最终状态确认：

- `ENABLE_V2_DEAL_LOOP_ENTRY = false`
- 工作台入口默认隐藏
- `git diff` 中未保留 true 状态
- 本阶段只提交验收文档

## 11. 未改变的能力边界

本阶段未改变以下能力边界：

- 未修改 `cloudfunctions/`
- 未修改 `miniprogram/app.json`
- 未修改 tabBar
- 未修改 V2 其它页面
- 未新增数据库写入
- 未新增真实 AI API
- 未调用 `createProject`
- 未调用 `submitStageLog`
- 未调用 `reviewStageLog`
- 未调用 `getTempFileURL`
- 未新增 `wx.request`
- 未部署云函数
- 未上传体验版
- 未发布正式版

## 12. 发布判断

当前不建议发布正式版。

当前判断：

- 不打开入口
- 不上传体验版
- 不部署云函数
- 不发布正式版
- 不给真实业务人员大范围使用

## 13. 是否建议进入 Phase 6-L

可以进入 Phase 6-L。

建议 Phase 6-L 目标：

- 做销售下一步动作卡体验版再次验证决策
- 判断是否需要再次短期打开入口给 admin / boss_qi / boss_hu 验证
- 不直接进入真实 AI、写库、`createProject` 或正式发布
