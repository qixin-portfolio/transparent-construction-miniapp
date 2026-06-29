# 照片显示问题修复结果

## 修复信息

| 项目 | 内容 |
|------|------|
| 当前分支 | `fix-photo-display-issue` |
| 修复 commit | `9a19bd5 fix: return temp photo URLs for pending stage logs` |
| 修复文件 | `cloudfunctions/listPendingStageLogs/index.js` |

## 修复原因

`listPendingStageLogs` 返回 raw `stage_logs` 数据，`photoFileIDs` 是原始 cloud fileID，**未调用 `getTempFileURL`** 转换为临时可访问 URL。微信 `<image>` 在某些基础库版本或云环境配置下无法直接渲染 cloud fileID。

对比：`getOwnerProject`、`getProjectDetail` 等已有 `getTempFileURL` 转换逻辑，照片正常显示。

## 修复方式

在 `listPendingStageLogs` 中新增：

1. 收集所有待审核日报的 `photoFileIDs`
2. 调用 `cloud.getTempFileURL({ fileList })` 转换为临时 URL
3. 建立 `fileID → tempFileURL` 映射
4. 每条日报增加新字段（保留原有 `photoFileIDs`）：

```js
{
  photoFileIDs,            // 原始 fileID 数组（保留）
  photoUrls,              // temp URL 数组（仅成功的）
  photoTempUrls,          // 同 photoUrls
  photos: [{              // 结构化数据
    fileID,
    url,                  // tempURL 或 fileID 兜底
    tempFileURL
  }]
}
```

## 部署状态

| 项目 | 状态 |
|------|------|
| 部署云函数 | `listPendingStageLogs` |
| 部署是否成功 | 是 |
| 部署包大小 | 1.6 KB |

## 真机验收

等待用户测试。验收场景：

1. 管理员进入待审核日报列表，确认有照片的日报照片正常显示
2. 无照片的日报不受影响
3. 项目名称显示正常
4. AI 摘要功能不受影响
5. 审核通过/驳回不受影响

## 状态确认

| 项目 | 状态 |
|------|------|
| 是否执行数据库脚本 | 否 |
| 是否执行 `initSaasDefaults` | 否 |
| 是否影响 AI 功能 | 否 |
| 是否影响套餐功能 | 否 |
| 是否合并 master | 否 |
| 是否上传体验版 | 否（仅云函数改动，前端不变） |
| stash 是否仍保留 | 是 |
