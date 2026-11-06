# Daily briefs

Run the full SQL in `docs/briefs.sql` in your Supabase SQL editor before using Briefs. It grants owner-only reads and column-only updates for `pinned`; users cannot insert, delete, or change generated fields. The server inserts or regenerates today's UTC brief without overwriting pins.

Existing server secrets: `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`; optional `LLM_HTTP_REFERER` and `LLM_APP_TITLE`. The existing `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_PUBLISHABLE_KEY` are also required. No new search provider or browser secret is used.

The Briefs page reads the last 60 UTC calendar days. Select a day, pin or unpin, or generate/regenerate today. Generation uses only the user's saved news (7 days, 12 rows), prices (30 days, 30 rows), activity (14 days, 20 rows) and latest competitor notes. Price changes compare the latest two numeric observations in the same currency and plan; unknown amounts remain unknown. Collected source links are stored with highlights and shown with the AI-estimate label. No input data is fabricated.

## Daily cron

Send POST `https://snitchv1.lovable.app/api/briefs/generate` with `Content-Type: application/json`, body `{"reason":"daily"}` and `Authorization: Bearer <NEWS_CRON_SECRET or PEER_MONTHLY_CRON_SECRET>`.

Run after your research collection jobs finish. The API processes onboarded profiles in batches of ten with 250 ms between users, continuing on individual failures and returning HTTP 200 with `ok`, `results`, and `failures`. Check `failures` even on HTTP 200. Very large accounts may exceed a caller's request timeout; this first implementation is synchronous. No GitHub schedule is created. Published-site access settings must permit the external cron request to reach this endpoint; its handler independently verifies the secret.

Manual and onboarding bodies use the corresponding reason and a verified user's JWT, never a body user ID. The optional onboarding trigger was deliberately skipped because upstream collection may not be complete; rely on manual generation or the daily job.

For best results, populate `niche_news`, `peer_prices`, and `competitor_activity` first. Empty tables still allow an honest no-updates brief; database errors surface as errors, not empty data. A missing optional summaries table is allowed.

External Supabase prevents managed authenticated browser checks here. Run SQL and test generation, reload, history, and pinning while signed in to verify your deployed data and permissions.
