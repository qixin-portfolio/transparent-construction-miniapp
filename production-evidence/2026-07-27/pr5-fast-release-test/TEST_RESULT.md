# PR5 Fast Release Test Result

Date: 2026-07-27

## Local Gate

- `node --test tests/stage-log-behavior/*.test.js`: 171 passed, 0 failed.
- JavaScript syntax, JSON parsing, generated-copy checks, V2 entry checks, `git diff --check`, and the credential scan passed before cloud testing.

## Test Environment

- Target: `shengjing-style-test-d3ac90f38b1` only.
- `stage_log_submission_keys` was created with its default `PRIVATE` ACL.
- Deployed functions: `submitStageLog`, `reviewStageLog`, `sendOwnerNotice`.
- All three deployed functions report no environment variables; external owner notifications are disabled.

## P0 Result

Blocked. The initial two synthetic ordinary-user submissions, plus two more after one targeted P0 fix, all reached the deployed `submitStageLog` transaction and returned the safe public error `日报提交事务失败，请稍后重试`.

- No `stage_logs`, `photos`, `notifications`, or `stage_log_submission_keys` document was created.
- The CloudBase control-plane invocation does not inject a Mini Program `OPENID`, and the local Developer Tools GUI automation service timed out twice. This route cannot prove a user-context transaction.
- The one allowed targeted fix changed each deployed whitelist function to use `cloud.database({ env: cloud.DYNAMIC_CURRENT_ENV })`, so private collections can be accessed with the cloud-function environment identity. The full local `171/171` regression passed, but the same P0 remained in the test environment.
- The underlying CloudBase transaction error is not available through the supported log command and has not been isolated beyond the control-plane invocation path.

Production release, release-candidate creation, tag creation, upload, and style-preview Task 1 are stopped.
