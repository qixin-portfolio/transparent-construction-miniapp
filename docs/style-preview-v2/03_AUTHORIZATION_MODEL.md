# Authorization Model

The server derives OpenID, user, role and tenant from `users`. Only `admin`, `boss_qi`, `boss_hu`, `designer`, and `sales` can enter. Non-admin roles are constrained to customers and preview records they created. Customer ownership uses `ownerUserId` where available and falls back to legacy `ownerOpenid`; neither value is accepted from the client. Client tenant, role and identity fields are ignored.
