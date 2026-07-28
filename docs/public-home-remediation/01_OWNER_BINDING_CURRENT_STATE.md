# 现有业主绑定机制

审计基线：`821d96efa7f4d1495939703cc58d028a2ea75d6d`
审计日期：2026-07-28

## 当前可用流程

项目负责人可在内部“工地详情”的“业主绑定”区域完成以下操作：

1. 点击“生成绑定码”。
2. 系统调用 `createOwnerBindCode`，为指定项目生成 6 位绑定码，有效期为 7 天。
3. 项目负责人复制邀请文案或使用现有分享入口发送给业主。
4. 业主使用自己的微信打开小程序，在原业主进度页输入绑定码。
5. `bindOwnerProject` 在服务端校验码、租户和人数上限后，将该微信 OpenID 写入项目的 `ownerOpenids`，并兼容写入旧字段。

一个项目最多绑定两位业主。项目负责人还能在同一工地详情中查看已绑定业主并调用 `unbindOwner` 解除绑定。

## 代码位置

| 能力 | 位置 |
| --- | --- |
| 生成、复制和分享绑定码 | `miniprogram/subpackages/internal/pages/project-detail/` |
| 创建绑定码 | `cloudfunctions/createOwnerBindCode/index.js` |
| 服务端绑定当前 OpenID | `cloudfunctions/bindOwnerProject/index.js` |
| 服务端解除绑定 | `cloudfunctions/unbindOwner/` |
| 业主项目访问校验 | `cloudfunctions/getOwnerProject/index.js`、`cloudfunctions/listOwnerProjects/index.js` |

## 本轮边界

本轮不改变上述绑定系统，也不把它暴露在公开首页。公开页未绑定说明只提示联系项目负责人，避免公开输入项目 ID、猜测 OpenID 或在前端写入项目权限。

## 非阻塞后续建议

未来可在已授权的独立任务中，把现有绑定码升级为“专属邀请链接或二维码”：项目负责人生成邀请 -> 业主打开 -> 静默获得当前 OpenID -> 展示脱敏摘要 -> 业主确认 -> 服务端绑定 OpenID。

不建议使用微信手机号查询客户手机号自动匹配项目：历史手机号未必完整或一致，家属代看场景也会增加错误绑定和个人信息收集风险。
