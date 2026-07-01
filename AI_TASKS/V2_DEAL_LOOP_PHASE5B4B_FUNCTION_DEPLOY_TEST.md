# V2 Deal Loop Phase 5B-4B：getV2EvidenceSummary 部署与直达测试记录

## 当前阶段

Phase 5B-4B：只部署 `getV2EvidenceSummary` 云函数并做开发者工具直达测试。

本阶段只记录人工部署与开发者工具直达测试结果，不修改业务代码，不上传体验版，不打开工作台入口，不进入 Phase 5B-5。

## 当前 HEAD / tag

- 当前 HEAD：`2c8373f7cdd614aa88d08b844cd353fed400682a`
- 当前 tag：`v2-deal-loop-phase5b4a-deploy-preflight`

## 云环境确认

人工确认云环境：

```text
cloud1-d4g7zh8kpca0e26d5
```

## 实际部署对象

实际部署对象：

```text
cloudfunctions/getV2EvidenceSummary
```

是否部署其它云函数：否。

## 部署结果

`getV2EvidenceSummary` 云函数已完成人工部署。

本阶段未上传体验版，未发布正式版，未打开工作台入口。

## 测试路径

测试页面：

```text
subpackages/deal-loop/pages/trust-materials/trust-materials
```

测试方式：

从 V2 客户链路进入 `trust-materials`，携带真实 `customerId`。

## 测试客户

测试客户：齐鑫。

## 真实证据摘要测试结果

真实 `customerId` 下，真实证据摘要读取成功。

页面显示摘要：

- 项目数量：1 个
- 已审核可见日报：1 条
- 可见照片：1 张
- 效果图：0 张
- 质保卡：0 张
- 证据等级：中
- 阶段覆盖：开工交底
- 可用证据类型：已审核日报、可见照片
- 公开使用状态：暂不可以公开发布

结论：

- 页面客户上下文未串人。
- 真实证据摘要可以正常读取并展示摘要字段。
- mock 推荐素材仍保持“示例推荐素材”定位。
- 无公开营销授权时，没有提示可直接公开发布。

## 错误态验证

已验证：

1. 上一轮未传 `customerId` 时，页面进入 mock fallback，未串到其它真实客户。
2. 本轮真实 `customerId` 下，真实摘要读取成功。
3. 无公开营销授权时，正确显示“暂不可以公开发布”。

待后续可补充验证：

1. `NO_EVIDENCE` 空证据状态。
2. `NOT_FOUND` 不 fallback 到默认 mock 客户。
3. `READ_FAILED` 不冒充真实证据。
4. 无权限账号的 `FORBIDDEN` 展示。

## 隐私字段检查

页面未展示以下敏感字段：

- 图片 URL
- `fileID`
- `cloudPath`
- `tempFileURL`
- 日报正文
- 审核意见
- 手机号
- `openid`
- 员工姓名
- 工长姓名
- 详细地址
- 内部备注

结论：当前页面仅展示摘要统计和安全状态，不展示真实原始素材。

## 入口开关确认

`ENABLE_V2_DEAL_LOOP_ENTRY = false`

本阶段未打开工作台入口。

## 发布状态确认

- 已部署云函数：`cloudfunctions/getV2EvidenceSummary`
- 未上传体验版
- 未发布正式版
- 未进入 Phase 5B-5

## 风险点

1. 当前测试覆盖了成功读取和无公开营销授权状态，但尚未完整覆盖所有错误码。
2. 后续若打开工作台入口，需要重新验证 boss/admin 可见性和普通员工/业主不可见性。
3. 真实证据摘要仍必须和公开营销授权分开理解，不能把“业主可见”误认为“可公开营销”。
4. 后续如扩展到 `case-assets`，必须继续禁止读取原始照片、日报正文和图纸文件。

## 是否建议进入下一阶段

不自动进入下一阶段。

建议在继续 Phase 5B-5 前，先由人工确认是否需要补测 `NO_EVIDENCE / NOT_FOUND / READ_FAILED / FORBIDDEN` 等错误态。
