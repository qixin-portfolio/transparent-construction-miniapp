# Test Results

Command:

```sh
node --test tests/stage-log-behavior/*.test.js
```

Result: `75/75` passed.

- Original Phase 0E local behavior tests: `48/48` passed.
- New Phase 0F-1 blocker tests: `27/27` passed.

The new tests cover invalid stage zero-write behavior, 19/20/30 newer-record duplicate cases, tenant/project/day boundaries, concurrent submission claim, notification default-off configuration, allowed state values, event override rejection, no-owner/failure persistence, sequential and concurrent notification reuse, direct invocation authorization, and review-to-direct-call reuse.

Additional checks passed: changed-JS syntax, all tracked JSON parsing, generated runtime synchronization, `git diff --check`, V2 entry guards, and a changed-diff sensitive-content scan.
