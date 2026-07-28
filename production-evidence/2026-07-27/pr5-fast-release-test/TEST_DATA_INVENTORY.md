# Test Data Inventory

All records used the `pr5t-` prefix and synthetic project content. No customer name, phone number, address, image, or OpenID was written to the test fixtures.

| Collection | Document ID | Final state |
| --- | --- | --- |
| `projects` | `pr5t-project-worker-20260727` | Deleted |
| `project_members` | `pr5t-member-worker-20260727` | Deleted |
| `stage_logs` | None created | Empty |
| `photos` | None created | Empty |
| `notifications` | None created | Empty |
| `stage_log_submission_keys` | None created | Empty; collection retained |

The isolated default test user was temporarily changed from `admin` to `worker` and restored to `admin` after each of the two failed test rounds.
