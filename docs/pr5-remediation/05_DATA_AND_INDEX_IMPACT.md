# Data And Index Impact

| Item | Change | Compatibility |
| --- | --- | --- |
| `stage_logs` | Add optional `submissionKey` and `ownerNotice*` audit/status fields | Additive; older readers ignore unknown fields |
| `stage_log_submission_keys` | New lazily created collection, one deterministic document per accepted submission identity/day/stage | No existing document is changed or migrated |
| Index | None required for the new submission claim because lookup is by document ID | Legacy duplicate lookup uses existing fields and paginates |
| Deployment initialization | None | Collection is created on first successful transaction write |
| Rollback | Do not delete claims or status fields; prior code ignores them | A prior version may not enforce the new guarantees for future writes |

No production migration, bulk write, index creation, or initialization has been executed. Before deployment, the CloudBase transaction behavior and function permissions must be revalidated in the isolated test environment only.
