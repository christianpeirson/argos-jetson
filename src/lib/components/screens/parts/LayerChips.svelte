<script lang="ts">
	// spec-024 PR6 T038 — Mk II MAP-screen layer chip group.
	//
	// Five toggle chips, each bound to one lsState'd boolean in
	// map-overlay.svelte.ts. Active chip fills in the active accent;
	// inactive is outline. Lucide icons inline for instant scanability.
	// Wraps onto two rows on narrow viewports via flex-wrap.

	import { Crosshair, Disc, Flame, MapPinned, Navigation } from '@lucide/svelte';

	import {
		overlayCentroids,
		overlayDetections,
		overlayHeatmap,
		overlayOwnPosition,
		overlayPath
	} from '$lib/state/map-overlay.svelte';

	interface ChipDef {
		id: string;
		label: string;
		icon: typeof Flame;
		store: { value: boolean };
	}

	const CHIPS: readonly ChipDef[] = [
		{ id: 'heatmap', label: 'HEAT', icon: Flame, store: overlayHeatmap },
		{ id: 'centroids', label: 'AP', icon: Disc, store: overlayCentroids },
		{ id: 'path', label: 'PATH', icon: MapPinned, store: overlayPath },
		{ id: 'detections', label: 'DET', icon: Crosshair, store: overlayDetections },
		{ id: 'own', label: 'GPS', icon: Navigation, store: overlayOwnPosition }
	];

	function toggle(c: ChipDef): void {
		c.store.value = !c.store.value;
	}
</script>

<div class="layer-chips" role="group" aria-label="Map layer toggles">
	{#each CHIPS as chip (chip.id)}
		<button
			type="button"
			class="chip"
			class:on={chip.store.value}
			aria-pressed={chip.store.value}
			title="{chip.label} layer"
			onclick={() => toggle(chip)}
		>
			<chip.icon size={12} />
			<span>{chip.label}</span>
		</button>
	{/each}
</div>

<style>
	.layer-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		height: 22px;
		padding: 0 8px;
		background: transparent;
		border: 1px solid var(--mk2-line, var(--border));
		color: var(--mk2-ink-3, var(--muted-foreground));
		font: 500 var(--mk2-fs-1, 9px) / 1 var(--mk2-f-mono, 'Fira Code', monospace);
		text-transform: uppercase;
		letter-spacing: 0.08em;
		cursor: pointer;
		transition:
			color var(--mk2-mo-1, 120ms),
			background var(--mk2-mo-1, 120ms),
			border-color var(--mk2-mo-1, 120ms);
	}

	.chip:hover {
		color: var(--mk2-ink, var(--foreground));
		border-color: var(--mk2-line-hi, var(--border));
	}

	.chip.on {
		color: var(--mk2-accent, var(--primary));
		border-color: var(--mk2-accent, var(--primary));
		background: color-mix(in srgb, var(--mk2-accent, currentColor) 10%, transparent);
	}

	.chip:focus-visible {
		outline: 1px solid var(--mk2-accent, var(--primary));
		outline-offset: 1px;
	}
</style>
