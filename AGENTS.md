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

- Keep the quick page navigation in the root layout with a horizontally scrolling link strip and fixed arrow controls so it remains available across pages.
- Only the shared top navigation links between application pages; preserve its order and do not add body links or automatic route transitions. The removed /ingresar and /vendedores/pedidos routes must not be recreated. Home profile cards are informational, not navigation.
- Use the shared RequestPhotos control for buyer and seller photos so upload limits, enlargement and object URL cleanup stay consistent.
- Store garage listings separately from supplier products with owner-scoped, registered-account RLS; personal sellers must not require or create a supplier record.
- Persist request cancellation with a hashed, request-specific capability after buyer sign-out; database triggers close all seller quotes and prevent reopening, and seller screens poll the persisted status.

- Real quote negotiation uses shared RegateoPanel and persisted regateo_mensajes; signed-out buyer operations verify the hashed request capability, sellers use owner-scoped authenticated access, and only explicit buyer acceptance closes the deal; it must not automatically navigate to checkout.
- An email already registered as a buyer can add a comercio via the agregar_comercio_propio RPC after signing in with the same alias; one account, both roles, avoids duplicate-email signup failures.
- Keep account email/password changes in the shared MisDatos control through the authenticated Auth updateUser API, separate from profile updates; authentication owns credentials and email confirmation.
- Render the shared account editor only on /mi-cuenta and load/update existing owner-scoped profile rows; registration forms remain solely for new registrations.
- Gate account-editor reads and saves with a page-local identity set only after successful email/password verification; existing sessions must not bypass this check.
