# V2 Real WeChat Identity Acceptance

## Conclusion

**A. 真实微信身份下 Mock 全链路完成，等待真实图片模型接入；**

## Identity Boundary

| Account | Real login result | Verified scope |
| --- | --- | --- |
| Admin A | Existing Mini Program login chain | Start access; tenant-A admin history scope |
| Employee A | Existing Mini Program login chain | A1 access, upload, Mock completion, feedback |
| Employee B | Existing Mini Program login chain | A2-only access, A-record direct-link denial, own record |
| Ordinary/owner | Existing Mini Program login chain | Feature denial and no customer/history read |

Only masked identity evidence was used. Full `OPENID` values were neither written nor retained.

## Authorization and Isolation

- Admin A and employee A entered start; ordinary/owner was denied.
- Employee A could select only A1. A2 was absent/denied, and customer B1 returned `CUSTOMER_ACCESS_DENIED`.
- Client-supplied tenant ID and client-supplied admin role were ignored by server authorization.
- Real-device URL, scene, `mock=1`, and `stylePreviewMock=1` did not bypass access control.
- Employee B could not list, open, task-poll, or feedback on employee A's record. Admin A could see tenant-A records but no tenant-B record.
- Unauthenticated or expired identity paths did not render customer or history content.

## Upload, Generation, and Feedback

- Two non-real test images were uploaded from the Mini Program page with normal progress.
- Source and reference used separate tenant/customer/session storage paths. Session records stored file IDs and validated metadata, not base64 or permanent public URLs.
- The real page created a session and a queued task. The test worker claimed the task once and produced a succeeded Mock result.
- Result rendered source/reference/intent plus permanent AI-image disclosure and disclaimer. Repeated generation could not create a second active task.
- Authorized feedback wrote rating, reason, and note to the matching session; cross-user and cross-tenant feedback were denied. History filtering worked and no internal stack was shown in failure UI.

## Evidence and Cleanup

- Retained redacted evidence: `evidence/admin-start-redacted.png`.
- Device captures containing preview imagery or device information were not added to Git. No QR code, full `OPENID`, real room photograph, or public long-lived URL is retained.
- Fixture cleanup is recorded in `12_CLEANUP_REPORT.md`: all queried fixture counts and the fixture storage prefix are `0`.

## Guardrails Still Active

The test environment remains `shengjing-style-test-d3ac90f38b1`; provider remains `mock`; real AI remains disabled; production and V2 entries remain disabled. PR #9 remains Draft and is not merged.
