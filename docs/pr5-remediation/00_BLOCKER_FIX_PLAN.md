# PR #5 Blocker Fix Plan

Scope: only the four Phase 0F release blockers.

- Base: `f9656e18c47bfa169998082fdff344755194961a`.
- Evidence archive: local-only `archive/pr5-phase0e-tested-53bbfde` points to the Phase 0E-tested `53bbfde`.
- Invalid submitted `stageCode` now returns `INVALID_STAGE_CODE`; only missing values may use a valid project current stage.
- Duplicate submission detection now uses exact server-side conditions plus a deterministic transactional submission-key document.
- Owner notification is disabled unless server environment `ENABLE_EXTERNAL_NOTIFICATIONS` is exactly `true` and `WECHAT_MINIPROGRAM_STATE` is one of `developer`, `trial`, or `formal`.
- A stage log stores a notification claim and final status so direct and concurrent calls cannot duplicate an external send.

No production action, release candidate, test-environment deployment, PR #3 change, V2 change, migration, or secret is included.
