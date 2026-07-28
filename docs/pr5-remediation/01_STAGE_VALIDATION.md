# Stage Validation

The single shared stage configuration remains the source of truth. `resolveSubmissionStage` distinguishes:

| Input | Result |
| --- | --- |
| Empty `stageCode`, legal project current stage | Use project current stage |
| Empty `stageCode`, no legal project current stage | `STAGE_REQUIRED` |
| Non-empty unknown, deprecated, case-changed, or whitespace-altered code | `INVALID_STAGE_CODE` |
| Exact legal code | Use that stage |

Validation occurs before the submission-key claim, stage-log creation, project patch, photo creation, or notice call. The upload page preserves a malformed saved selection as an explicit error instead of treating it as an empty selection.
