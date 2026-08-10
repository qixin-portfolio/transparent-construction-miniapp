# Secret Configuration

Status: user manually configured the test function on 2026-08-05. Values were not read back through the CLI or copied into this repository.

Required runtime variables for `processStylePreviewTask` are `STYLE_PREVIEW_PROVIDER=seedream5`, `STYLE_PREVIEW_REAL_AI_ENABLED=true`, `ARK_API_KEY`, `ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3`, `SEEDREAM_MODEL_ID`, `SEEDREAM_SIZE=2K`, `SEEDREAM_RESPONSE_FORMAT=url`, `SEEDREAM_WATERMARK=true`, `SEEDREAM_TIMEOUT_MS=180000`, and `SEEDREAM_MAX_OUTPUT_BYTES=20971520`.

`ARK_API_KEY` must be entered by the user through the test-environment secret/configuration control. It is not in source, Git, documentation, screenshots, frontend code, logs, or CLI output. The only permitted verification output is `ARK_API_KEY_PRESENT=true` or `false`.
