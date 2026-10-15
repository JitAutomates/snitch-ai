# Plan: Monitors page (/monitors)

A new protected page in the app shell, matching the dashboard exactly, with
placeholder monitor data and a working client-side "Add monitor" flow.

## Files

- **Create `src/routes/_authenticated/monitors.tsx`** (the only source change needed)
- **Edit `src/routes/__root.tsx`** (one line): mount `<Toaster />` from
  `@/components/ui/sonner` next to `<Outlet />`. It is not mounted anywhere
  today, so sonner toasts (including the free-plan limit error) would never
  appear without it.

No database tables, no API routes, no dashboard changes, no other files.

## Page shell (identical to dashboard)

- Sticky top bar: "Snitch" link to `/` left, "Sign out" button right with the
  same ordered sign-out (cancel queries → clear query cache →
  `supabase.auth.signOut({ scope: "global" })` → `navigate({ to: "/auth", replace: true })`).
- Left sidebar with the same NAV items and lucide icons
  (Dashboard, Monitors, Briefs, Billing, Settings); Monitors highlighted active.
- Dark background, Times New Roman tokens, `rounded-2xl` cards,
  `text-muted-foreground` secondary text, same spacing.

## Main content (`max-w-3xl`)

1. **Header row** — "Monitors" title, subtitle "Track competitors, prices, and
   niche news.", primary "Add monitor" button (`size="pill"`).
2. **Free-plan note** under the header: "Free plan: 1 active monitor."
3. **Monitor list** from local state, seeded with 3 placeholder items. Each
   card: name, type badge (competitor | price | news), target, active/paused
   status, "Last checked" relative time, and Pause/Resume + Delete text
   buttons that only update local state.
4. **Empty state** when the list is empty: short message + "Add your first
   monitor" button (same dialog).
5. **Add monitor dialog** (shadcn Dialog) with:
   - Name (text)
   - Type (Select: Competitor / Price / News)
   - Target (text, placeholder changes with type: company name / product or URL /
     topic or keyword)
   - Submit adds to local state only. Free-plan rule: if an active monitor
     already exists, show a sonner error toast and do not add (new monitor is
     added as active; the list always has at most 1 active).

Existing `/monitors` links on the dashboard sidebar will resolve once this
route file exists.

## Verification

- Confirm the build log is clean after the edits.
- Playwright check against the preview: sign in, open `/monitors`, verify the
  shell matches the dashboard, cards render, add-dialog enforces the 1-active
  limit with a visible toast, and pause/delete update the list.
