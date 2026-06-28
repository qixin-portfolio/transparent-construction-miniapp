# Phase 4C AI 业主摘要审核页联动测试文档

## 测试场景

### 场景 1：管理员审核页按钮可见
- 管理员打开审核页
- 能看到业主摘要 textarea 和 "AI 生成业主摘要" 按钮
- 按钮文字、样式正常

### 场景 2：AI 生成摘要成功
- 管理员点击 "AI 生成业主摘要"
- 按钮显示 loading 状态
- 成功后摘要填入 textarea
- 弹出 toast：`AI 摘要已生成，可修改后再通过`
- 摘要可手动编辑

### 场景 3：摘要人工编辑
- textarea 内容可自由修改
- 修改后文本保留在界面中
- 最大 200 字

### 场景 4：审核通过时保存 ownerSummary
- 填写或 AI 生成摘要后，点击 "通过并发布"
- 审核通过
- 数据库 `stage_logs.ownerSummary` 保存了摘要内容
- 页面重新加载后清空

### 场景 5：AI 调用失败时的降级
- 关闭或改错 AI 环境变量
- 调用 AI 生成
- 页面提示错误信息
- 不影响手动审核流程
- 不崩溃

### 场景 6：worker / owner 看不到 AI 按钮
- 员工或业主登录审核页
- 看不到 "AI 生成业主摘要" 按钮
- 能看到 textarea 但可手动填写

### 场景 7：worker / owner 不能直接调用云函数
- 员工或业主在 Console 直接调用 `aiGenerateOwnerSummary`
- 返回 `{ success: false, code: 'FORBIDDEN' }`

### 场景 8：AI 摘要不会自动发送给业主
- AI 生成摘要后，不触发业主通知
- 只有审核通过时，`sendOwnerNotice` 才触发

### 场景 9：业主端不显示未通过的 AI 摘要
- AI 生成后不通过审核
- 业主端看不到该摘要
- 只有 ownerVisible: true + ownerSummary 有值时，业主端才展示

### 场景 10：数据库写入检查
- AI 调用后 `stage_logs.ownerSummary` 不变化
- 只有审核通过时，ownerSummary 才被写入
