# V2 Deal Loop Phase 5B-4F：NOT_FOUND / READ_FAILED 最小安全实测

## 当前阶段

Phase 5B-4F：NOT_FOUND / READ_FAILED 最小安全实测。

本阶段只按 Phase 5B-4E 设计的方法，尝试在微信开发者工具控制台临时补测 `trust-materials` 页面中 `getV2EvidenceSummary` 的 `NOT_FOUND / READ_FAILED` 展示。本阶段不修改业务代码，不修改配置，不写数据库，不部署，不上传体验版，不打开工作台入口，不进入 Phase 5B-5。

## 当前 HEAD / tag

- 当前 HEAD：`f5dfc24c32ccc79225844f95d02f8c69225452fe`
- 当前 tag：`v2-deal-loop-phase5b4e-error-test-method-design`

## 测试目标

1. 在已进入真实客户 `trust-materials` 页面的前提下，通过控制台临时调用 `page.loadEvidenceSummary('not_found_qa_20260701')` 验证证据摘要区域 `NOT_FOUND` 展示。
2. 通过控制台临时 monkey patch `wx.cloud.callFunction`，仅模拟 `getV2EvidenceSummary` reject，验证 `READ_FAILED` 展示。
3. 测试结束后立即恢复 `wx.cloud.callFunction`。
4. 全程不修改代码、不修改配置、不写数据库、不创建测试客户、不重新部署云函数。
5. 复查页面不展示原始素材、图片地址、日报正文和个人隐私字段。

## 测试前确认

- 当前目录：`/Users/qixin/Documents/晟景AI助理/透明工地小程序/开发骨架`
- 起始工作区：clean
- 当前 HEAD：`f5dfc24c32ccc79225844f95d02f8c69225452fe`
- 当前 tag：`v2-deal-loop-phase5b4e-error-test-method-design`
- `ENABLE_V2_DEAL_LOOP_ENTRY = false`
- 微信开发者工具当前已停留在 `subpackages/deal-loop/pages/trust-materials/trust-materials`
- 当前可见客户为真实客户“齐嘉”，页面处于 `NO_EVIDENCE` 安全状态：
  - 数据源：`真实客户字段 + Mock 推荐素材`
  - 页面提示：`暂无可用证据摘要，可继续使用示例素材。`
  - mock 区域仍标明 `示例推荐素材` / `来源：示例素材`

## NOT_FOUND 控制台实测结果

本阶段未完成 `NOT_FOUND` 控制台实测覆盖。

计划执行命令：

```js
const page = getCurrentPages()[getCurrentPages().length - 1]
page.loadEvidenceSummary('not_found_qa_20260701')
```

实际情况：

1. 先尝试通过开发者工具控制台执行无害表达式验证控制台可用性。
2. 控制台输入未能得到可见、可确认的执行结果。
3. 由于无法确认控制台命令是否可靠执行，按本阶段约束立即停止。
4. 未执行 `page.loadEvidenceSummary('not_found_qa_20260701')`。
5. 未修改业务代码、未新增编译模式、未修改 `project.private.config.json`。

结论：

- `NOT_FOUND` 摘要区域实测仍未覆盖。
- 未出现 fallback 到其它真实客户的新增风险。
- 未通过修改代码或配置强行制造测试条件。
- 静态映射仍保持为：`未找到可用工地证据，请返回客户列表重新打开。`

## READ_FAILED 控制台实测结果

本阶段未完成 `READ_FAILED` 控制台实测覆盖。

计划执行命令：

```js
const originalCallFunction = wx.cloud.callFunction
wx.cloud.callFunction = function(options) {
  if (options && options.name === 'getV2EvidenceSummary') {
    return Promise.reject(new Error('QA simulated getV2EvidenceSummary failure'))
  }
  return originalCallFunction.call(wx.cloud, options)
}

const page = getCurrentPages()[getCurrentPages().length - 1]
page.loadEvidenceSummary(page.data.customerId)

wx.cloud.callFunction = originalCallFunction
```

实际情况：

1. 因控制台基础执行无法可靠确认，本阶段未执行 monkey patch。
2. 未替换 `wx.cloud.callFunction`。
3. 未触发模拟 reject。
4. 未通过断网、修改云函数名、修改代码、修改配置或重新部署来制造失败。

结论：

- `READ_FAILED` 实测仍未覆盖。
- 静态映射仍保持为：`证据摘要读取失败，请稍后重试。`
- 由于 monkey patch 未执行，不存在未恢复的运行时 patch。

## monkey patch 是否已恢复

本阶段未执行 monkey patch，因此无需恢复。

确认：

- 未持久修改 `wx.cloud.callFunction`。
- 未修改任何小程序源码。
- 未修改任何云函数源码。
- 未修改任何项目配置。

## 隐私字段复查

基于当前可见的“齐嘉” `NO_EVIDENCE` 页面状态及现有静态代码，本阶段复查确认：

1. 页面仅展示客户阶段、证据摘要状态、空证据提示和示例推荐素材。
2. mock 素材继续标明 `示例推荐素材` / `来源：示例素材`。
3. 页面未展示以下字段：

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
- 本阶段未重新部署云函数。
- 本阶段未部署其它云函数。
- 未上传体验版。
- 未发布正式版。
- 未进入 Phase 5B-5。

## 仍未覆盖项

1. `NOT_FOUND` 摘要区域控制台实测：因开发者工具控制台执行无法可靠确认，本阶段未覆盖。
2. `READ_FAILED` 控制台 monkey patch 实测：因控制台执行无法可靠确认，本阶段未覆盖。
3. `FORBIDDEN`：缺少非 boss/admin 测试账号，继续后置。
4. `UNAUTHENTICATED`：未安全模拟未登录态，继续后置。

## 风险点

1. `NOT_FOUND / READ_FAILED` 仍未完成实机覆盖前，不建议打开工作台入口。
2. 为了补测而新增编译模式可能污染 `project.private.config.json`，本阶段未采用。
3. 为了补测而修改代码、修改云函数名或重新部署异常版本会扩大风险，本阶段未采用。
4. 通过断网模拟 `READ_FAILED` 可能影响开发者工具状态，当前未采用。
5. 后续若继续测试，应优先由人工直接在开发者工具控制台确认命令可执行，再进行最小命令测试。

## 是否建议进入 Phase 5B-5

不建议直接进入 Phase 5B-5。

建议先在不修改代码、不修改配置、不写库、不重新部署的前提下，由人工补齐：

1. `NOT_FOUND` 摘要区域控制台实测。
2. `READ_FAILED` 控制台 monkey patch 实测。
3. 如具备账号条件，再补 `FORBIDDEN / UNAUTHENTICATED`。
