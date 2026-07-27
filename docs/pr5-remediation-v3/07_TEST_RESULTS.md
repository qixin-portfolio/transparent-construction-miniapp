# Local Test Results

| Group | Result |
| --- | --- |
| Original baseline | 48/48 |
| First remediation | 27/27 |
| Second remediation | 14/14 |
| Third remediation | 34/34 |
| Total behavior tests | 123/123 |

Third-remediation coverage includes China-midnight and UTC-different timestamps, retry stability, forged event dates, key absence, partial records, all linkage fields, legacy compatibility, submit auto-approval rollback, review rollback, and no-notification failure paths.

Local tests are not proof of real CloudBase transactions. No test collection was created and no test environment was deployed.
