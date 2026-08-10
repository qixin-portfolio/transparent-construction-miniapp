# Test Deployment

Only target `shengjing-style-test-d3ac90f38b1` with `cloudbaserc.style-preview-test.json`:

```text
TARGET_ENV=shengjing-style-test-d3ac90f38b1
FEATURE=STYLE_PREVIEW_V2
PRODUCTION_ACCESS=false
PRODUCTION_DEPLOY=false
```

Deployment completed on 2026-08-04. `stylePreviewApi` and `processStylePreviewTask` are `Active`; `style-preview-worker` is enabled with cron `0 */1 * * * * *`. The test collections have 5 session indexes and 4 task indexes, including unique `tenantId + idempotencyKey`.

The repository default config is production-bound and was never used for a V2 deployment. An earlier account-level `env list` passively displayed the production ID; no production business resource was queried or targeted. Every later business command explicitly used the test environment ID.
