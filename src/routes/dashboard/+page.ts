import type { PageLoad } from './$types';

// MapLibre GL JS requires browser APIs (WebGL, DOM) - disable SSR.
export const ssr = false;
export const csr = true;

// `/dashboard` serves the legacy Argos shell directly.
//
// History: spec-024 PR11 (T054) flipped the default to Mk II via a
// `redirect(307, '/dashboard/mk2/overview')` here. That flip was reverted
// 2026-05-14 (PR #145 cleanup) — the v1 customer line was unified back
// onto main and the Mk-II default would have forced customers through an
// unfamiliar redirect on `:5173/dashboard`. Mk II remains reachable at
// `/dashboard/mk2/*` if explicitly navigated.
//
// If you want to re-enable Mk II as the default, restore the redirect.
export const load: PageLoad = () => {};
