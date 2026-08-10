# V2 Integration Test Report

## Scope

This acceptance used only the CloudBase test environment `shengjing-style-test-d3ac90f38b1` and the test Mini Program. `STYLE_PREVIEW_PROVIDER=mock` and `STYLE_PREVIEW_REAL_AI_ENABLED=false` remained unchanged. No production environment, production function, real AI provider, PR #7 code, daily-log flow, or production entry was accessed or changed.

## Real WeChat Login Acceptance

Four independently logged-in test WeChat accounts were used: admin A, employee A, employee B, and an ordinary/owner account. The existing login chain supplied their Mini Program identities. No `OPENID` was invented, copied from production, written to Git, or retained in the evidence. The test records use only the `spv2_auth_` prefix.

| Check | Result |
| --- | --- |
| Admin A start and tenant scope | Passed. Admin A entered start and later saw employee A/B records only in tenant A. |
| Employee A start and customer scope | Passed. Employee A saw and selected only `spv2_auth_customer_a1`. |
| Employee B isolation | Passed. History was empty before B created a permitted record; direct A session and task URLs were denied. |
| Ordinary/owner access | Passed. Start and direct history were denied with no customer/history data shown. |
| URL/scene/Mock parameter bypass | Passed. `mock=1` and `stylePreviewMock=1` on a real device did not enable local Mock mode. |
| Cross-tenant/customer escalation | Passed. A2 was unavailable to employee A; tenant B customer access returned `CUSTOMER_ACCESS_DENIED`; client tenantId and role values did not grant access. |
| Upload | Passed. Employee A selected two non-real test images from the real page. They were uploaded to separate source/reference session paths; sessions held file IDs and metadata only, without base64 or persistent public URLs. |
| Mock generation and idempotency | Passed. A session and task moved through queued/worker processing to succeeded, result displayed source/reference/intent, and repeated action did not create a second active task. An initial recoverable attempt showed the safe retry state; the completed retry was used for the success verification. |
| AI marker and disclaimer | Passed. Result rendered the permanent `AI生成图片` disclosure and communication boundary text. |
| Feedback | Passed. Authorized employee A saved rating, reason, and note to its session. Repeat submission followed the existing update/reject rule. Employee B and tenant B could not feedback on A's session. |
| History | Passed. History status filtering worked; unauthorized records were not exposed and failure UI did not expose an internal stack. |

## Retained Visual Evidence

`evidence/admin-start-redacted.png` is the retained, redacted admin-start image. Other real-device screens were checked during the manual flow but were not copied into the repository because their supplied captures contained image previews or device information. No QR code, complete `OPENID`, customer identity, actual-room image, base64 payload, or long-lived storage URL is retained.

## Automated Regression

- Style-preview contract/flow tests: `10/10` passed.
- Daily-log behavior regression: `171/171` passed.
- V2-related JavaScript syntax, Mini Program JSON parsing, and `git diff --check`: passed.
- Sensitive-literal scan and production/V2-entry-close checks: passed.

The actual test-environment worker was exercised once for the queued-to-succeeded path. The worker remains the test-only `style-preview-worker`; no production deployment occurred.
