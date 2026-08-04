# Test Deployment

Only target `shengjing-style-test-d3ac90f38b1` with `cloudbaserc.style-preview-test.json`:

```text
TARGET_ENV=shengjing-style-test-d3ac90f38b1
FEATURE=STYLE_PREVIEW_V2
PRODUCTION_ACCESS=false
PRODUCTION_DEPLOY=false
```

Deploy only `stylePreviewApi` and `processStylePreviewTask`, then create the `style-preview-worker` timer trigger. The repository default config is production-bound and must never be used for this task.
