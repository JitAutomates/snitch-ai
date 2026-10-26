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
