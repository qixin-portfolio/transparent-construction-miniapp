# Submit Transaction Rollback

The submit transaction contains log creation, slot-key create/update, photo writes, and reviewer self-approval project updates. Notifications remain after a successful commit only.

Local transaction-model tests cover key read/write failures, log writes, auto-approval project writes, commit failure, and optimistic retry. These tests show no local orphan log, key, photo, project patch, or notification on failure; they do not prove CloudBase transaction behavior.
