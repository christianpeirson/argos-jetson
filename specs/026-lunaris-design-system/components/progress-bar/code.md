# ProgressBar — Code

**Status:** Phase 9.1 — chassis implementation in flight
**Last updated:** 2026-05-04
**Implementation file (target):** `src/lib/components/chassis/feedback/ProgressBar.svelte`
**Carbon component:** `<ProgressBar>` from `carbon-components-svelte` v0.107.0+
**Carbon source:** <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/ProgressBar/ProgressBar.svelte>

---

## Argos `ProgressBar` adapter API

The Argos `ProgressBar` is a Svelte 5 (runes) wrapper that delegates to Carbon's `<ProgressBar>`. It exists to (1) keep call-sites idiomatic, (2) provide the standard validation-prop layer (`labelText`, `helperText`, `invalid`, `invalidText`, `warn`, `warnText`) consistent with TextInput / NumberInput, (3) expose a clean `status` enum.

```ts
type ProgressStatus = 'active' | 'finished' | 'error';
type ProgressKind = 'inline' | 'indented' | 'big';
type ProgressSize = 'sm' | 'md';

interface Props {
	value?: number; // undefined → indeterminate
	max?: number; // default: 100
	status?: ProgressStatus; // default: 'active'
	kind?: ProgressKind; // default: 'indented'
	size?: ProgressSize; // default: 'md'

	// Validation layer (Argos-added; Carbon ProgressBar does not have these)
	labelText?: string; // visible label
	helperText?: string; // helper text below bar
	invalid?: boolean;
	invalidText?: string;
	warn?: boolean;
	warnText?: string;

	hideLabel?: boolean; // visually hidden but still in AT

	id?: string;
	class?: string;
}
```

**Rationale**:

- `value === undefined` triggers indeterminate mode automatically (Carbon's default behavior).
- Status enum is typed; consumers cannot pass arbitrary strings.
- The validation-prop layer is Argos-added because Carbon's `<ProgressBar>` doesn't support form-style feedback; the chassis renders `invalidText` / `warnText` below the helper text region in `var(--mk2-red)` / `var(--mk2-amber)`.
- No callbacks — `<ProgressBar>` is a pure presentational widget; the parent owns the value state.
- No `bind:` — no two-way binding; value is one-way from parent.

---

## Consumer pattern

### Before (raw `<div>`, Mission Control CPU TOTAL)

```svelte
<div class="cpu-progress">
	<div class="bar-track">
		<div class="bar-fill" style="inline-size: {cpuPct}%"></div>
	</div>
</div>
```

### After (Carbon-wrapped)

```svelte
<ProgressBar value={cpuPct} max={100} kind="indented" size="sm" labelText="CPU TOTAL" />
```

The bespoke `<div class="bar-track">` + `<div class="bar-fill">` pair collapses to one component. Carbon handles the `value/max` math, the inline-size transition, and the (currently unused) status-icon rendering.

### Determinate task progress (future report generation)

```svelte
<script lang="ts">
	import ProgressBar from '$lib/components/chassis/feedback/ProgressBar.svelte';

	let bytesUploaded = $state(0);
	let totalBytes = $state(1024 * 1024 * 6.8); // 6.8 MB
	let status = $derived<'active' | 'finished' | 'error'>(
		uploadError ? 'error' : bytesUploaded >= totalBytes ? 'finished' : 'active'
	);
</script>

<ProgressBar
	value={bytesUploaded}
	max={totalBytes}
	{status}
	kind="indented"
	size="md"
	labelText="Upload report.tar.gz"
	helperText="{(bytesUploaded / 1e6).toFixed(1)} of {(totalBytes / 1e6).toFixed(1)} MB"
	invalid={!!uploadError}
	invalidText={uploadError}
/>
```

The chassis renders:

- Label "Upload report.tar.gz" above the bar.
- Bar filled to `bytesUploaded / totalBytes %`.
- Helper text below the bar showing live numbers.
- If `uploadError` is set, status flips to error (red bar + icon) AND the chassis renders the invalidText below the helper region in red.

### Indeterminate (future startup task)

```svelte
<ProgressBar kind="indented" size="md" labelText="Initializing GPSD..." />
```

`value={undefined}` triggers Carbon's indeterminate sweep animation.

---

## Direct Carbon `<ProgressBar>` use

For surfaces that need Carbon-specific composition (inline kind with custom slot for label, integration with `<ProgressIndicator>` multi-step):

```svelte
<script>
	import { ProgressBar } from 'carbon-components-svelte';
</script>

<ProgressBar value={42} max={100} kind="inline" size="sm" labelText="Sync" />
```

Lunaris tokens flow through automatically.

---

## State + interaction semantics

- **Determinate** — `value` ∈ [0, max]; bar fills proportionally; transition 300 ms ease-out on `value` change (Carbon default).
- **Indeterminate** — `value === undefined`; bar animates indefinitely.
- **`status="active"`** — accent-colored fill.
- **`status="finished"`** — green fill + checkmark icon next to label.
- **`status="error"`** — red fill + error icon next to label; chassis also renders `invalidText` if set.
- **`prefers-reduced-motion`** — Carbon disables the indeterminate sweep animation; bar shows a static 30% fill instead. Honored automatically.
- **No interaction** — ProgressBar is non-focusable; not a tab-stop.

---

## Migration consumer call-sites (Phase 9.1 scope)

### Phase 9.1 chassis introduction — no migrations yet

Phase 9.1 introduces the chassis only. Call-site migration lands in 9.1l:

| Phase | File | Sites |
| --- | --- | --- |
| 9.1l | `src/lib/components/dashboard/views/MissionControlView.svelte` | CPU TOTAL bar + MEM TOTAL bar (2 sites) |

A single small sub-phase for ProgressBar; the chassis is also stocked for future report-progress / file-upload surfaces.

---

## What we don't migrate yet

- **`<ProgressIndicator>`** — multi-step process indicator (different Carbon component); deferred until a multi-step workflow surface needs it.
- **Animated value transitions** beyond Carbon's 300 ms default — opt-in via `class` chain if needed.

---

## Authority citations

- Carbon Svelte component reference: <https://svelte.carbondesignsystem.com/?path=/docs/components-progressbar--default>
- Carbon Svelte source: <https://github.com/carbon-design-system/carbon-components-svelte/blob/v0.107.0/src/ProgressBar/ProgressBar.svelte>
- Carbon Svelte type defs: `node_modules/carbon-components-svelte/types/ProgressBar/ProgressBar.svelte.d.ts`
- Carbon SCSS source: `docs/carbon-design-system/packages/styles/scss/components/progress-bar/_progress-bar.scss`
- Argos current bespoke (canary): `src/lib/components/dashboard/views/MissionControlView.svelte`
- Adapter pattern reference: Phase 6 `Loading` + spec `loading/code.md`
