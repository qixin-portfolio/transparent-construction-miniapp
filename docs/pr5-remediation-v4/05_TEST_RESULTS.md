# Local Test Results

测试先行证据：在起点 `56139ab` 上运行本轮新增的 `pr5-remediation-v4.test.js`，结果为 `12/28` 通过、`16/28` 失败。失败项覆盖同步伪造的 0/负数 attempt、非法日期、非法状态和非规范 key ID。

修复后的实际计数：原有 `48/48`，第一轮 `27/27`，第二轮 `14/14`，第三轮 `34/34`，第四轮新增 `48/48`，合计 `171/171`。`node --test tests/stage-log-behavior/*.test.js` 通过；JSON 解析、生成副本同步、39 页面完整性、V2 双入口关闭、环境变更检查和 `git diff --check` 均通过。

所有行为测试均使用本地事务模型和通知 stub，不连接 CloudBase。
