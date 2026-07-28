# Immutable Request Time

`createSubmissionRequestContext(requestNow)` captures one server-side time at the submit function entry. It freezes `requestNow`, China (`Asia/Shanghai`) `businessDate`, `businessDayStart`, and `businessDayEnd`.

The deterministic key, new `stage_logs.businessDate`, compatibility lookup range, and transaction retries reuse that context. Event-supplied dates are ignored. China has no daylight-saving time; the calculated business day remains exactly 24 hours.
