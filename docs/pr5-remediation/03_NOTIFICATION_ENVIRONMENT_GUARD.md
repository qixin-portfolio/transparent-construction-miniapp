# Notification Environment Guard

The client event cannot select notification state. The server reads only these runtime environment variables:

| Variable | Safe behavior |
| --- | --- |
| `ENABLE_EXTERNAL_NOTIFICATIONS` absent or not exactly `true` | Do not send; record `not_requested/external_notifications_disabled` |
| `WECHAT_MINIPROGRAM_STATE` absent or not in `developer`, `trial`, `formal` | Do not send; record `not_requested/invalid_miniprogram_state` |
| Both valid | Send using the server state only |

The default is therefore closed. A project with no owner still records `not_requested/no_owner`. Notice failure does not roll back a completed review or auto-approved submission.
