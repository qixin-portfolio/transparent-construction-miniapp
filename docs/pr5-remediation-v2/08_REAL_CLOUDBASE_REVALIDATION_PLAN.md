# Real CloudBase Revalidation Plan

This plan is not authorization. It may be considered only after a fresh independent code review and explicit human approval. The only possible future target is `shengjing-style-test-d3ac90f38b1`. Never use `cloud1-d4g7zh8kpca0e26d5`.

Future human-run sequence:

1. Create `stage_log_submission_keys` and restrict it to cloud-function server access.
2. Verify the collection-absent request safely fails before any log, project patch, or notice.
3. With the collection present, verify first submission, duplicate `pending`, and duplicate `approved` behavior.
4. Reject an attempt, submit again, and verify a distinct log and incremented `attemptNo`.
5. Send two real concurrent submit requests for the same slot and retain raw result IDs/statuses as evidence.
6. Seed only synthetic legacy logs without a key: rejected permits; pending/approved block; mixed statuses block.
7. Capture whether the legacy query requires a CloudBase compound index and its latency with more than 100 matching rows.
8. Verify denied collection permission and transaction errors fail closed.
9. Persist evidence, then delete only the exact synthetic IDs created by this plan and confirm no data remains.

No deploy command is included because this repository has no verified CloudBase deployment CLI workflow. The approved operator must record the exact console/tool procedure used with the evidence.
