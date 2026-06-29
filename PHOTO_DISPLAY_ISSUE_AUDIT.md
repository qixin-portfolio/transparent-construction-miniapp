# 照片显示问题审计文档

## 1. 问题现象

- 审核日报页面（review-log）照片区域显示为空白占位符
- 此前 VPN 开启时出现类似问题，关闭 VPN 后恢复
- 本次用户未开 VPN 仍出现
- 涉及体验版 `4.0.0`
- 尚未确认其他页面（业主端、项目详情）是否有同样问题

## 2. 数据链路

```txt
upload-log 上传照片
  → wx.cloud.uploadFile() 上传到云存储，返回 cloud fileID
  → submitStageLog 接收 photoFileIDs (fileID 数组)
    → 存入 stage_logs.photoFileIDs
    → 写入 photos 集合 { fileID, stageLogId, projectId, tenantId }
  → listPendingStageLogs (审核页)
    → 读取 stage_logs，返回原始 photoFileIDs（纯 fileID，未转 tempURL）
  → review-log.wxml
    → <image src="{{photo}}"> 直接用 cloud fileID 渲染
```

## 3. 涉及字段

| 位置 | 字段 | 类型 |
|------|------|------|
| stage_logs | `photoFileIDs` | string[] (cloud fileID) |
| stage_logs | `photos` | string[]（旧格式，备选） |
| photos 集合 | `fileID` | string (cloud fileID) |
| photos 集合 | `tempFileURL` | string（其他云函数转换后写入） |
| photos 集合 | `ownerVisible` | boolean |

## 4. 关键发现

### 4.1 listPendingStageLogs 不转换 tempURL

`listPendingStageLogs` 返回 raw `stage_logs` 数据，`photoFileIDs` 字段直接是原始 cloud fileID（如 `cloud://xxx`），**没有调用 `getTempFileURL`**。

对比其他云函数：

| 云函数 | 调用 getTempFileURL |
|--------|-------------------|
| `getOwnerProject` | ✔ |
| `getProjectDetail` | ✔ |
| `listDesignDrawings` | ✔ |
| `listPendingStageLogs` | ✘ |

### 4.2 微信 <image> 对 cloud fileID 的支持

微信小程序 `<image>` 标签支持直接使用 cloud fileID 作为 `src`，SDK 会自动解析。但以下情况可能失效：

- 基础库版本升级后兼容性问题
- 云环境权限配置变更
- 文件所属环境与当前环境不一致

### 4.3 前端数据绑定

review-log 前端代码：

```js
// prepareItems
photoFileIDs: item.photoFileIDs || item.photos || [],
```

WXML 使用 `item.photoFileIDs` 迭代渲染，结构与数据绑定正确。

### 4.4 Phase 4C 改动未触碰照片相关代码

| 检查项 | 结论 |
|--------|------|
| review-log.js 照片字段映射 | 未改动 |
| review-log.wxml 照片 grid 结构 | 未改动 |
| review-log.wxss 照片相关样式 | 未改动 |
| reviewStageLog 照片逻辑 | 未改动 |
| listPendingStageLogs | 未改动 |

**明确结论：照片显示问题非 Phase 4C 引起。**

## 5. 可能原因（按可能性排序）

### 原因 A：cloud fileID 在 <image> 中渲染失败（最可能）

`listPendingStageLogs` 返回原始 cloud fileID，微信 `<image>` 在某些基础库版本或云环境配置下无法直接渲染 cloud fileID。

**证据：** 对比 `getOwnerProject`、`getProjectDetail` 等均调用 `getTempFileURL` 转换为可访问的临时 URL 后再返回给前端。

### 原因 B：云环境配置或权限变更

云开发环境的权限设置变更，导致当前环境不允许直接通过 fileID 访问文件。

### 原因 C：文件所属环境不一致

照片上传时使用了一个云环境 ID，而 `listPendingStageLogs` 调用时的云环境是 `cloud.DYNAMIC_CURRENT_ENV`，可能解析到不同的环境。

### 原因 D：基础库版本兼容性

体验版 `4.0.0` 使用的基础库版本与之前不一致，导致 cloud fileID 渲染行为变化。

## 6. 建议修复方案（最小范围）

### 方案 A：listPendingStageLogs 增加 tempURL 转换

修改 `cloudfunctions/listPendingStageLogs/index.js`，在返回数据前调用 `getTempFileURL` 转换 `photoFileIDs` 为可访问 URL，与 `getOwnerProject`、`getProjectDetail` 保持一致。

改动范围：

```txt
cloudfunctions/listPendingStageLogs/index.js
```

影响范围：仅影响审核页照片展示。

### 方案 B：前端兜底字段兼容

如果云函数不改，可以在 review-log.js 中增加 `getTempFileURL` 调用，但前端调用云函数转换会额外增加网络请求和处理复杂度。

### 方案 C：将 cloud fileID 转为可展示 URL

在 `submitStageLog` 阶段就将上传后的 fileID 通过 `getTempFileURL` 转为 tempURL 并存入数据库中，后续所有读取直接使用 URL。

**推荐：方案 A。** 最小改动，与已有模式一致。

## 7. 风险与禁止事项

- 不执行数据库迁移
- 不批量改照片数据
- 不删除云存储文件
- 不执行 `initSaasDefaults`
- 不改 AI 功能
- 不改套餐逻辑
- 不恢复 stash
- 不改业主端功能
