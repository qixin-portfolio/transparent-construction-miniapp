# Production Gaps

This branch has completed a test-environment, real-WeChat-identity acceptance of the Mock pipeline only. It is not production-ready and it does not contain a real image model integration.

## Closed Boundaries

- `STYLE_PREVIEW_PROVIDER=mock`
- `STYLE_PREVIEW_REAL_AI_ENABLED=false`
- `ENABLE_STYLE_PREVIEW_ENTRY=false`
- `ENABLE_V2_DEAL_LOOP_ENTRY=false` at both existing V2 guards
- No production environment query, deployment, function change, data change, or entry change was performed.

## Required Future Gates

1. Select and approve a real image provider, contract, model, region, retention policy, and test-only credentials.
2. Implement the provider adapter in a separate reviewed change, with image safety, polling/callback validation, timeouts, cost limits, idempotency, and safe errors.
3. Run isolated test-environment quality, privacy, tenant-isolation, failure, and cost tests using approved non-real images.
4. Perform a production security and operational review, including storage retention, access rules, observability, quota, rollback, and user-facing disclosure.
5. Obtain a separate explicit Human Gate before any production configuration, deployment, or user-facing entry decision.

No provider, credential, endpoint, model, or production rollout is selected by this V2 acceptance.
