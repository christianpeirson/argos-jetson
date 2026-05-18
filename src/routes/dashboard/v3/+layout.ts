// V3 (NVIDIA UI, :5175) route subtree — client-rendered only.
//
// The V1 console copied into this subtree in C1 relies on browser-only APIs
// (WebGL for MapLibre GL, etc.), so the whole /dashboard/v3 tree disables SSR
// — mirroring `export const ssr = false` on src/routes/dashboard/+page.ts.
export const ssr = false;
export const csr = true;
