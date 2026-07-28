# Phase 0F-3 Review Blockers

This remediation addresses the independent-review blockers only. It does not authorize deployment, collection creation, production access, release candidates, controlled release, or the measurement-style-preview Task 1.

| Blocker | Local remediation |
| --- | --- |
| Rejected log could not be resubmitted | A submission key now represents the current submission slot and advances to a new attempt after rejection. |
| Collection behavior was asserted without evidence | Collection existence and server-side permission are explicit future deployment gates. Missing or inaccessible storage fails closed. |
| Serial fake DB was presented as concurrency proof | A local optimistic-conflict model now forces a stale transaction retry. It is not CloudBase transaction evidence. |

The previous `docs/pr5-remediation/` records remain unchanged as historical Phase 0F-1 evidence. This directory supersedes its collection-initialization claim for future review.
