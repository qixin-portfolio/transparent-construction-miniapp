# 公开首页审核整改验证报告

验证日期：2026-08-02
实现基线：整改提交 `f2e2715`（起点 `821d96e`，审计提交 `dbe4a62`）

## 已完成的本地验证

| 检查 | 结果 |
| --- | --- |
| 公开入口路由与授权边界 | `node --test tests/public-home-entry.test.js`，`14/14` 通过 |
| 日报既有行为回归 | `node --test tests/stage-log-behavior/*.test.js`，`171/171` 通过 |
| 修改 JavaScript 语法 | `node --check` 通过 |
| 小程序 JSON | 全量解析通过 |
| 变更空白/冲突 | `git diff --check` 通过 |
| 示例工地隔离 | 静态扫描未发现 `wx.cloud`、云函数、手机号、头像或昵称授权调用 |
| 冻结入口 | `ENABLE_V2_DEAL_LOOP_ENTRY = false`；未发现新增量房风格预览入口 |

自动化覆盖的关键结论：未知用户进入公开首页而非老板注册；老板/员工保留工作台；已绑定业主按项目数量进入原详情或列表；未绑定页只重新检查权限；示例工地仅使用本地数据；头像昵称仍是可选资料编辑。

## 模拟器运行验证

- 微信开发者工具 Nightly `2.02.2607312` 已成功以根目录导入该 worktree，并确认 AppID 为 `wxbfe2172a118ae67f`；旧 `41002 appid missing` 不再出现。
- 当前已登录管理员真实启动后进入原老板工作台，验证“已识别老板 -> 原工作台”。
- 未识别用户页面以本地运行时路由桩模拟，进入公开首页；该桩只影响当前模拟器内存，不修改代码、OpenID、CloudBase 或任何项目数据。
- 从公开首页进入“查看我的工地”后显示未绑定项目说明页；页面没有手机号、头像、昵称授权、项目 ID 输入或前端绑定能力。
- 示例工地首页、施工进度、施工日报、现场照片、设计确认、问题与验收均实际渲染，所有页面显示“示例数据，仅用于功能体验”。
- “我是工作人员”主动入口可回到原工作台；未验证该文字控件的自动化点击事件，工作台跳转使用相同的本地 `wx.switchTab` 路径验证。
- 控制台仍出现开发者工具基础库的 `SystemError (appServiceSDKScriptError) timeout` 和 `reportRealtimeAction:fail not support`，但不影响上述页面渲染、路由或截图。没有业务代码异常、个人信息授权弹窗或 CloudBase 调用证据。

## 截图目录

`docs/public-home-remediation/screenshots/`

1. `01-public-home-unknown-simulator.png`
2. `02-project-unbound-simulator.png`
3. `03-demo-home-simulator.png`
4. `04-demo-progress-simulator.png`
5. `05-demo-stage-log-simulator.png`
6. `06-demo-photos-simulator.png`
7. `07-demo-design-confirm-simulator.png`
8. `08-demo-issues-simulator.png`
9. `09-staff-workbench-simulator.png`

## 剩余边界与下一步

- 当前模拟器账号是管理员，未取得可安全切换的员工和已绑定业主测试身份；两类分流由 `14/14` 自动化路由测试覆盖，尚无新的实机运行截图。
- 未上传体验版 `7.3.3`、未 push、未创建 PR、未部署云函数，也未触碰生产数据。
- 上传体验版、push 和创建 PR 都属于 Human Gate，须由齐鑫在此运行验证结果基础上明确确认后再执行。
