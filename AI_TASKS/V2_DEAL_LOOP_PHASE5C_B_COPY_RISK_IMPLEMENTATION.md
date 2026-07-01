# V2 Deal Loop Phase 5C-B：真实证据摘要产品文案最小实现

## 当前阶段

Phase 5C-B：真实证据摘要产品文案最小实现。

本阶段只在 `trust-materials` 页面最小实现 Phase 5C-A 设计的产品文案与风险提示，让“真实证据摘要 / 示例推荐素材 / 公开授权提示 / 错误态”更容易被老板和销售理解。本阶段不新增功能，不扩大接入范围，不部署，不上传体验版，不打开工作台入口，不进入 Phase 5C-C。

## 当前 HEAD / tag

- 当前 HEAD：`240436760fbede84b8d9cfb69e923a20075c76ae`
- 当前 tag：`v2-deal-loop-phase5c-a-copy-risk-design`

## 本阶段目标

1. 在页面顶部增加 V2 试验功能风险提示。
2. 收口真实证据摘要区文案，强调只读、脱敏、不展示原始素材。
3. 收口公开授权提示，区分“已具备公开使用授权”和“仅内部参考，暂不可公开发布”。
4. 将页面业务文案中的测试素材表达改为更适合老板/销售理解的“示例推荐素材”。
5. 将容易误导的“发送给客户”按钮文案改为“查看示例话术”。
6. 收口错误态文案，不展示内部错误码、不提租户、不暗示数据丢失。
7. 保留现有调用逻辑、fallback 规则和能力边界。

## 修改文件列表

```text
miniprogram/subpackages/deal-loop/pages/trust-materials/trust-materials.wxml
miniprogram/subpackages/deal-loop/pages/trust-materials/trust-materials.js
miniprogram/subpackages/deal-loop/pages/trust-materials/trust-materials.wxss
miniprogram/subpackages/deal-loop/utils/evidenceSummaryAdapter.js
miniprogram/subpackages/deal-loop/utils/materialMapper.js
miniprogram/subpackages/deal-loop/mock/trustMaterials.js
AI_TASKS/V2_DEAL_LOOP_PHASE5C_B_COPY_RISK_IMPLEMENTATION.md
```

## 页面顶部风险提示实现

页面顶部 `hero` 区已收口为：

```text
V2 试验功能
信任证据库
把已审核的工地记录整理成内部成交跟进参考，公开使用需先确认授权。
仅用于内部成交跟进，不影响现有客户、工地和日报数据。
```

实现目的：

1. 明确这是 V2 试验功能。
2. 明确仅用于内部成交跟进。
3. 明确不影响现有客户、工地和日报数据。
4. 避免看起来像错误提示或阻断提示。

## 真实证据摘要文案实现

真实证据摘要区保留标题：

```text
真实证据摘要
```

保留标签：

```text
只读摘要
```

副标题调整为：

```text
仅统计已审核、业主可见的工地记录，不展示原始照片和日报正文。
```

底部安全说明新增：

```text
本区只展示脱敏摘要，不展示原始照片、文件地址、日报正文和个人隐私。
```

文案目标：

1. 老板/销售能理解这里是摘要统计，不是照片库。
2. 不暗示可以查看或下载原始照片、文件地址和日报正文。
3. 不改变 `getV2EvidenceSummary` 的只读调用逻辑。

## 公开授权提示文案实现

新增摘要区“公开授权提示”说明。

可公开使用时：

```text
已具备公开使用授权
已具备公开使用授权，发布前仍建议人工复核授权范围、素材内容和平台规则。
```

公开使用状态显示：

```text
已具备公开使用授权，发布前仍建议人工复核。
```

不可公开发布时：

```text
仅内部参考，暂不可公开发布
如需用于小红书、抖音、官网或 GEO 内容，应先取得案例授权。
```

实现约束：

1. 未使用直接发布类表达。
2. 未出现“自动生成公开案例”。
3. 未使用公开平台直发类表达。
4. 保留 `NO_MARKETING_AUTHORIZATION` 不阻断内部摘要、只阻断公开发布的语义。

## 示例推荐素材文案实现

页面下方推荐素材区标题保持：

```text
示例推荐素材
```

新增说明：

```text
仅供话术和跟进思路参考，不代表当前客户的真实工地证据。
```

素材元信息调整：

```text
来源：示例素材
示例可见性：业主可见 / 内部参考
授权示例 / 本地示例
```

按钮文案已调整为：

```text
查看示例话术
```

弹窗文案调整为：

```text
示例话术
当前仅为示例预览，不调用分享或接口。
```

本地示例素材中的可见授权标签已收口为：

```text
授权示例
本地示例
```

实现目的：

1. 避免销售误以为已经能直接发送真实证据。
2. 避免把示例素材误解为当前客户真实证据。
3. 保留原本只弹窗、不调用分享、不写库的行为。

## 错误态文案实现

`evidenceSummaryAdapter.js` 中错误态文案收口为：

| 状态 | 文案 |
| --- | --- |
| `NO_EVIDENCE` | 暂无可用证据摘要，可继续查看示例推荐素材。 |
| `NOT_FOUND` | 未找到可用工地证据，请返回客户列表重新打开。 |
| `READ_FAILED` | 证据摘要读取失败，请稍后重试。 |
| `FORBIDDEN` | 当前账号暂无查看证据摘要权限。 |
| `UNAUTHENTICATED` | 请先登录后再查看证据摘要。 |
| `NO_MARKETING_AUTHORIZATION` | 仅内部参考，暂不可公开发布。 |

补充说明：

```text
为避免串用客户资料，本页不会自动切换到其它客户。
```

当前实现不展示内部错误码，不提租户，不暗示数据丢失，不 fallback 到其它客户。

## 未改变的能力边界

本阶段未改变：

1. `getV2EvidenceSummary` 调用逻辑。
2. `getCustomer` 调用逻辑。
3. `customerId` 传参逻辑。
4. fallback 安全规则。
5. `NO_EVIDENCE` 处理规则。
6. `NOT_FOUND` 不 fallback 规则。
7. `READ_FAILED` 不冒充真实证据规则。
8. `NO_MARKETING_AUTHORIZATION` 不阻断内部摘要但阻断公开发布的规则。
9. 示例推荐素材的本地推荐逻辑。
10. 入口开关状态。

本阶段未新增：

1. 数据库写入。
2. 新云函数调用。
3. `wx.request`。
4. `createProject`。
5. `submitStageLog`。
6. `reviewStageLog`。
7. 真实 AI API。
8. 公开发布动作。

## 测试结果

已执行：

```bash
node --check miniprogram/subpackages/deal-loop/pages/trust-materials/trust-materials.js
node --check miniprogram/subpackages/deal-loop/utils/evidenceSummaryAdapter.js
git diff --check
```

结果：通过。

变更范围检查：

1. 未修改 `cloudfunctions/`。
2. 未修改 `miniprogram/app.json`。
3. 未修改工作台入口。
4. 未修改 tabBar。
5. 未修改其它 V2 页面。
6. 未新增数据库写入或新网络请求。

## 风险点

1. 本阶段只改文案，不补齐 `NOT_FOUND / READ_FAILED / FORBIDDEN / UNAUTHENTICATED` 实机测试。
2. 仍不建议上传体验版。
3. 仍不建议打开工作台入口。
4. 仍不建议给真实业务人员使用。
5. 后续如果进入下一阶段，必须继续保持“示例素材不等于真实证据”的页面表达。

## 是否建议进入下一阶段

不建议自动进入下一阶段。

建议先人工验收本阶段页面文案，再决定是否进入 Phase 5C-C。进入下一阶段前仍应保持：

1. 不部署。
2. 不上传体验版。
3. 不打开工作台入口。
4. 不扩大到其它 V2 页面。
