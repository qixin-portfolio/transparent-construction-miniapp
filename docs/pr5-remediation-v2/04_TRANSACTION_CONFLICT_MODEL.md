# Transaction Conflict Model

`tests/stage-log-behavior/transaction-model.js` is an optimistic, snapshot-based local simulator. It intentionally starts two submit requests at the same key version, lets request A commit, then makes request B detect a version conflict and retry from fresh state.

The asserted result is one new `stage_logs` document, one key, `attemptNo: 1`, one current log ID, and one `ALREADY_SUBMITTED` response. The same model injects missing collections, permission denial, unavailable transactions, write failure, and commit failure; failed transactions leave no log, key, project update, or notification.

This is only an application-level conflict and rollback model. It is not evidence that CloudBase uses identical retries, rollback, collection creation, permission, date, or index behavior.
