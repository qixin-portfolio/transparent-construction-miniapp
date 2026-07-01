# V2 Deal Loop Phase 5B-4D：关键错误态最小实测补齐

## 当前阶段

Phase 5B-4D：关键错误态最小实测补齐。

本阶段只补测 `trust-materials` 页面中 `getV2EvidenceSummary` 的关键错误态展示，重点关注 `NOT_FOUND / NO_EVIDENCE / READ_FAILED`。本阶段不修改业务代码，不部署云函数，不上传体验版，不打开工作台入口，不进入 Phase 5B-5。

## 当前 HEAD / tag

- 当前 HEAD：`fcb7082a5f04adebc0f8f655a4441c18f2f1d69c`
- 当前 tag：`v2-deal-loop-phase5b4c-error-state-test`

## 测试目标

1. 补测无效 `customerId` 的 `NOT_FOUND` 页面展示。
2. 补测有效真实客户但无可用证据时的 `NO_EVIDENCE` 页面展示。
3. 评估是否能安全模拟 `READ_FAILED` 页面展示。
4. 复查错误态下不展示原始素材和敏感字段。
5. 确认入口开关、部署状态、体验版状态不变化。

## NOT_FOUND 实机测试结果

本阶段未完成 `NOT_FOUND` 实机页面验证。

计划测试值：

```text
customerId=not_found_qa_20260701
```

已尝试的安全路径：

1. 未新增编译模式，避免可能写入 `project.private.config.json` 或开发者工具编译配置。
2. 尝试通过开发者工具调试控制台执行只读页面跳转：

```js
wx.navigateTo({ url: '/subpackages/deal-loop/pages/trust-materials/trust-materials?customerId=not_found_qa_20260701' })
```

实际结果：

- 开发者工具控制台输入未能可靠保留 JS 标点，命令未成功执行。
- 系统不允许 `osascript` 向微信开发者工具发送按键，未能通过剪贴板粘贴并回车执行。
- 未使用“添加编译模式”等可能修改本地项目配置的方式。
- 未修改代码、未修改配置、未部署。

结论：

- `NOT_FOUND` 前端实机展示本阶段仍未覆盖。
- 静态口径仍保持为：`未找到可用工地证据，请返回客户列表重新打开。`
- 后续需要人工通过安全直达 query 或临时非提交编译方式补测。

## NO_EVIDENCE 实机测试结果

本阶段已完成 `NO_EVIDENCE` 实机验证。

测试方式：

从 `pipeline` 页面选择真实客户“齐嘉”的“推荐素材”，进入：

```text
subpackages/deal-loop/pages/trust-materials/trust-materials
```

页面结果：

- 页面保持客户为“齐嘉”，未串到“齐鑫”或其它客户。
- 数据源显示：`真实客户字段 + Mock 推荐素材`。
- 页面提示：`暂无可用证据摘要，可继续使用示例素材。`
- 真实证据摘要区域显示：`暂无真实证据摘要`。
- 阶段覆盖显示：`暂无阶段覆盖`。
- 可用证据类型显示：`暂无证据类型`。
- 公开使用状态显示：`暂不可公开发布`。
- 使用限制显示：`暂无可用证据摘要，可继续使用示例素材。`
- mock 推荐素材区域仍标明：`示例推荐素材`、`来源：示例素材`。

结论：

- `NO_EVIDENCE` 实机通过。
- 页面没有 fallback 到默认客户。
- 页面没有冒充真实证据。
- 页面没有提示可公开发布。
- 示例素材继续保留，并明确标注为示例素材。

## READ_FAILED 实机测试结果

本阶段未完成 `READ_FAILED` 实机页面验证。

原因：

1. 未修改代码，不能通过改云函数名或制造异常来触发失败。
2. 未部署云函数，不能通过部署异常版本来触发失败。
3. 未修改网络、代理、云环境或系统设置，避免破坏当前开发者工具环境。
4. 未找到不影响环境的稳定断网/云函数读取失败模拟方式。

结论：

- `READ_FAILED` 实机展示仍未覆盖。
- 静态口径仍保持为：`证据摘要读取失败，请稍后重试。`
- 代码侧 `catch` 分支会构造 `READ_FAILED` 视图，且数据源语义为真实客户字段 + Mock 推荐素材，不冒充真实证据。

## 隐私字段复查

本阶段结合实机页面可见文本和静态代码复查确认：

1. `NO_EVIDENCE` 页面只展示客户基础阶段、摘要状态、空证据提示和示例推荐素材。
2. `trust-materials` 页面证据摘要区域只展示摘要统计、阶段覆盖、证据类型、公开使用状态、安全提示。
3. 页面未展示以下敏感字段或原始素材字段：

- 手机号
- `openid`
- `unionid`
- 身份证
- 详细地址
- 内部备注
- `fileID`
- `cloudPath`
- `tempFileURL`
- 图片 URL
- 缩略图 URL
- 日报正文
- 审核意见
- 员工姓名
- 工长姓名

## 入口开关确认

`ENABLE_V2_DEAL_LOOP_ENTRY = false`

本阶段未打开工作台入口。

## 发布状态确认

- `getV2EvidenceSummary` 已在 Phase 5B-4B 完成人工部署。
- 本阶段未再次部署云函数。
- 未部署其它云函数。
- 未上传体验版。
- 未发布正式版。
- 未进入 Phase 5B-5。

## 仍未覆盖项

1. `NOT_FOUND` 实机展示：缺少不改配置的稳定直达 query 方式。
2. `READ_FAILED` 实机展示：暂未具备安全模拟网络异常或云函数读取失败的条件。
3. `FORBIDDEN`：缺少非 boss/admin 测试账号，延续 Phase 5B-4C 未覆盖状态。
4. `UNAUTHENTICATED`：未安全模拟未登录状态，延续 Phase 5B-4C 未覆盖状态。

## 风险点

1. `NOT_FOUND` 和 `READ_FAILED` 仍未实机覆盖前，不建议打开工作台入口。
2. 通过开发者工具新增编译模式可能污染本地项目配置，当前阶段未采用。
3. 通过断网或修改云环境模拟 `READ_FAILED` 可能影响开发者工具状态，当前阶段未采用。
4. 后续如进入 Phase 5B-5，必须继续保持内部摘要和公开营销授权分离。
5. 后续不得把 `NO_EVIDENCE` 当成系统错误，也不得把示例素材冒充真实证据。

## 是否建议进入 Phase 5B-5

不建议直接进入 Phase 5B-5。

建议先由人工选择一种安全方式补齐：

1. 无效 `customerId` 的 `NOT_FOUND` 页面实机展示。
2. 可控网络异常或云函数读取异常下的 `READ_FAILED` 页面实机展示。
3. 非 boss/admin 测试账号下的 `FORBIDDEN` 页面实机展示。

