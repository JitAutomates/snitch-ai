<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Landing animation media is served through a Lovable Assets JSON pointer, not a committed video binary, to keep deployment assets lightweight.
- Settings business-field comparisons and appearance persistence live in a browser-safe utility; the root applies saved preferences after hydration so navigation retains them without a theme-provider refactor.
- Only `resolvePeersWithExa` in `src/server/peers/resolve-peers.ts` may contact Exa; only POST `/api/peers/resolve` may import it, dynamically inside its server handler, to keep secrets out of client bundles.
- Peer resolution accepts only onboarding/profile_change with a verified user JWT or monthly with a verified cron bearer; user IDs always come from verified auth or cron-authorized due profiles, never request bodies.
- Keep the Exa call-path guard in CI and security regression tests to prevent new client or alternate resolver paths.
