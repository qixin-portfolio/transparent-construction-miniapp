# Production Gaps

Production is intentionally unsupported. Required future gates are: approved image provider and test key, real provider quality review, production threat review, production environment configuration, explicit Human Gate, separate deployment evidence, and an approved user-facing entry decision.

The current real-provider gap is deliberate: choose an approved provider, supply only test-environment variables for its API endpoint/key/model, document image input and async polling semantics, cost limits and content safety constraints, then authorize one isolated quality test. No provider or credential is selected in this branch.
