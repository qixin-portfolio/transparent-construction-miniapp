# Error Handling

State mismatches return `SUBMISSION_STATE_INCONSISTENT`. Submit storage failures return the existing safe submit errors; review storage failures return `REVIEW_STORE_UNAVAILABLE` or `REVIEW_TRANSACTION_FAILED`.

Public errors do not include CloudBase stacks, collection names, permission details, tokens, openids, phone numbers, addresses, or notification content. Internal inconsistency logging contains only a reason class.
