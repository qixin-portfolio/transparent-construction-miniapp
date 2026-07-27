# Test Environment Revalidation Plan

Only after a new independent code review may these changes be deployed to the isolated test environment `shengjing-style-test-d3ac90f38b1`.

Never target production environment `cloud1-d4g7zh8kpca0e26d5` during this plan.

Required synthetic-data checks:

1. Illegal `stageCode` produces zero writes.
2. A duplicate behind 30 historical records is rejected.
3. Concurrent duplicate submission creates only one log and one claim.
4. Notifications are disabled by default.
5. Direct and concurrent notification calls reuse one claim.
6. Auto-approval, pending manual approval, non-regressing progress, and `ALREADY_REVIEWED` remain correct.
7. Test data is removed only by exact document ID after evidence is persisted.

This document authorizes neither deployment nor any production operation.
