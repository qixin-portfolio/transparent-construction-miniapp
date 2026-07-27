# Local Test Results

Executed locally after implementation:

```text
node --test tests/stage-log-behavior/*.test.js
89 passed, 0 failed
```

Breakdown:

| Group | Result |
| --- | --- |
| Original baseline | 48/48 |
| Phase 0F-1 blocker tests | 27/27 |
| Phase 0F-3 new tests | 14/14 |
| Total | 89/89 |

The Phase 0F-3 tests cover rejected resubmission, repeated rejection, new IDs, attempt increments, legacy statuses, state inconsistency, stale-attempt review protection, optimistic conflict retry, collection absence, read/write permission denial, unavailable transactions, write failure, and rollback model. These are local tests only.
