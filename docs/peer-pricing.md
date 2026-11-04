# Peer pricing setup

Run `docs/peer-prices.sql` in your Supabase SQL editor before collecting prices. It has not been applied automatically.

Pricing uses the existing server-only `TAVILY_API_KEY`, `LLM_API_KEY`, `LLM_BASE_URL` and `LLM_MODEL` settings. No Exa calls or open web searches are made. Each run reads up to ten ranked competitor URLs for the authorized user, extracts only those pages, and appends one observation per valid competitor. Missing or unclear prices remain null. No additional pricing paths are requested in this version.

Onboarding queues collection only after peer resolution succeeds. `/monitors` reads the last twelve weeks of saved prices and never starts collection. Different currencies have separate charts. A single observation displays as a point; trends require subsequent observations.

Optional daily scheduling: POST `/api/pricing/refresh`, JSON body `{"reason":"daily"}`, with `Authorization: Bearer <NEWS_CRON_SECRET>` or `PEER_MONTHLY_CRON_SECRET`. Existing platform cron authorization is also accepted. Use the published origin when configuring your scheduler. Collection is sequential for onboarded profiles and stops on provider errors. No scheduler has been installed by this task. Scheduled advanced collection is Pro only.

Manual collection: POST the same path with `{"reason":"manual"}` and the signed-in user's JWT. User IDs are never accepted from request bodies. A manual button is not added.