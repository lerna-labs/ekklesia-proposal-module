# F-028 Resolution

**Status:** Resolved

**Commits:** Pending (landed with this change)

**How:** Authenticated redirect and `showLogin.set(true)` moved from `login/+page.svelte` `onMount` into `login/+page.js` `load`: `await parent()` (root session probe), then `redirect(302, '/dashboard')` if `loggedIn`, else open the login dialog. The page component is static UI only.

**Remaining:** None for F-028.
