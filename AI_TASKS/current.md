---
schema_version: 1
task_id: public-home-review-remediation
revision: 12
owner: matrix
status: review_ready
updated_at: 2026-08-04T11:15:00+08:00
---

# Current AI Task

## 任务标题

微信审核整改：公开首页、未绑定项目说明与无需登录的示例工地。

## 任务来源

- 用户于 2026-07-28 明确要求从 `821d96e` 创建独立 worktree，审计启动/授权路由后完成整改。
- 禁止新增微信手机号至客户或项目的匹配、迁移和授权流程。

## 本次范围

允许：公开首页启动分流、复用现有 OpenID 项目权限恢复、未绑定项目说明页、纯本地示例工地、审核文案、自动化测试与本地提交。

禁止：新增 `getPhoneNumber`、手机号解密或匹配、前端项目绑定、生产集合/权限模型变更、云函数部署、生产数据修改、日报事务改动、V2 或量房风格预览入口变更、正式发布和稳定 tag。

## 已完成实施

- 启动时仍静默调用既有 `login` 恢复身份；老板/员工进入原工作台，已绑定业主进入原项目详情或项目列表，未知和未绑定用户停留公开首页。
- 未识别用户不再自动进入老板注册；只有公开首页主动点击“我是工作人员”才进入原工作台/注册链路。
- 增加未绑定项目说明页和无需登录、无 CloudBase/云函数调用的本地示例工地。
- 新增现有 `ownerOpenid` / `ownerOpenids` 绑定机制审计与审核提审备注。

## 验收证据

- `node --test tests/public-home-entry.test.js`：`14/14` 通过。
- `node --test tests/stage-log-behavior/*.test.js`：`171/171` 通过。
- 改动 JS 语法、全量小程序 JSON 解析、`git diff --check`、示例子包静态禁用扫描、V2 入口开关与量房风格预览入口静态检查均通过。
- 微信开发者工具已恢复正确 AppID 关联；管理员真实启动进入原工作台，未知路由桩渲染公开首页，未绑定页和示例工地 6 个核心页面均完成模拟器截图。截图目录：`docs/public-home-remediation/screenshots/`。

## 当前状态与唯一人工动作

- 瘦身提交 `ad993d4c1b530ed99be0341d2cc78859ef5ce285` 已推送到 `origin/fix/public-home-review-remediation`，Draft PR #7 保持 open/draft，base 为 `release/pr5-production`。
- 微信体验版 `7.3.3` 已于 `2026-08-02 22:16:34 +08:00` 上传成功。微信编译主包 `1,385,369B`（约 `1353KB`），满足 `<= 1900KB` 目标；详见 `docs/public-home-remediation/04_PACKAGE_SIZE_RESULT.md`。
- 本轮未部署云函数、未访问或修改生产数据、未提交审核、未正式发布、未合并 PR、未创建 tag；V2 和量房风格预览入口保持关闭。

唯一人工动作：在微信公众平台检查体验版 `7.3.3`，确认体验无误后再单独决定是否提交审核。

## 下一步

本轮交付完成。不得在未经齐鑫新确认的情况下提交微信审核、正式发布、合并 PR、部署云函数或修改生产数据。
