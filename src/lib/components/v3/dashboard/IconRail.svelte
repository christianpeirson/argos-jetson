<!-- @constitutional-exemption Article-IV-4.3 issue:#11 — Component state handling (loading/error/empty UI) deferred to UX improvement phase -->
<!-- @constitutional-exemption Article-IV-4.2 issue:#12 — Button pattern extraction deferred to component library refactor -->
<script lang="ts">
	import {
		FileText,
		House,
		List,
		Map,
		Radar,
		RadioTower,
		Settings,
		Waypoints,
		Zap
	} from '@lucide/svelte';

	import {
		activeBottomTab,
		activePanel,
		activeView,
		toggleBottomTab,
		togglePanel
	} from '$lib/stores/dashboard/dashboard-store';
	import { themeStore } from '$lib/stores/theme-store.svelte';

	const VIEW_TOGGLE_IDS = new Set(['webtak', 'uas-scan']);

	function handleClick(id: string) {
		if (id === 'dashboard') toggleBottomTab('dashboard');
		else if (VIEW_TOGGLE_IDS.has(id)) toggleView(id);
		else togglePanel(id);
	}

	function toggleView(id: string) {
		activeView.set($activeView === id ? 'map' : (id as never));
		activePanel.set(null);
	}
</script>

<nav class="icon-rail" data-position={themeStore.railPosition} aria-label="Dashboard navigation">
	<div class="rail-top">
		<!-- Overview (house) -->
		<button
			class="rail-btn"
			class:active={$activePanel === 'overview'}
			title="Overview"
			aria-label="Overview"
			aria-pressed={$activePanel === 'overview'}
			onclick={() => handleClick('overview')}
		>
			<House size={18} />
		</button>
		<!-- Dashboard (list) -->
		<button
			class="rail-btn"
			class:active={$activeBottomTab === 'dashboard'}
			title="Dashboard"
			aria-label="Dashboard"
			aria-pressed={$activeBottomTab === 'dashboard'}
			onclick={() => handleClick('dashboard')}
		>
			<List size={18} />
		</button>
		<!-- Tools (zap) -->
		<button
			class="rail-btn"
			class:active={$activePanel === 'tools'}
			title="Tools"
			aria-label="Tools"
			aria-pressed={$activePanel === 'tools'}
			onclick={() => handleClick('tools')}
		>
			<Zap size={18} />
		</button>
		<!-- Reports -->
		<button
			class="rail-btn"
			class:active={$activePanel === 'reports'}
			title="Reports"
			aria-label="Reports"
			aria-pressed={$activePanel === 'reports'}
			onclick={() => handleClick('reports')}
		>
			<FileText size={18} />
		</button>
	</div>

	<div class="rail-spacer"></div>

	<div class="rail-bottom">
		<!-- WebTAK -->
		<button
			class="rail-btn"
			class:active={$activeView === 'webtak'}
			title="WebTAK"
			aria-label="WebTAK"
			aria-pressed={$activeView === 'webtak'}
			onclick={() => handleClick('webtak')}
		>
			<Radar size={18} />
		</button>
		<!-- UAS Scan (live log terminal view) -->
		<button
			class="rail-btn"
			class:active={$activeView === 'uas-scan'}
			title="UAS Scan — Live Log"
			aria-label="UAS Scan"
			aria-pressed={$activeView === 'uas-scan'}
			onclick={() => handleClick('uas-scan')}
		>
			<RadioTower size={18} />
		</button>
		<!-- Logo (waypoints) — brand mark, always white -->
		<button
			class="rail-btn rail-logo"
			title="Argos"
			aria-label="Argos"
			onclick={() => handleClick('overview')}
		>
			<Waypoints size={20} />
		</button>
		<!-- Map Settings -->
		<button
			class="rail-btn"
			class:active={$activePanel === 'map-settings'}
			title="Map Settings"
			aria-label="Map Settings"
			aria-pressed={$activePanel === 'map-settings'}
			onclick={() => handleClick('map-settings')}
		>
			<Map size={18} />
		</button>
		<!-- Separator -->
		<div class="rail-separator"></div>
		<!-- Settings -->
		<button
			class="rail-btn"
			class:active={$activePanel === 'settings'}
			title="Settings"
			aria-label="Settings"
			aria-pressed={$activePanel === 'settings'}
			onclick={() => handleClick('settings')}
		>
			<Settings size={18} />
		</button>
	</div>
</nav>

<style>
	@import './icon-rail.css';

	.icon-rail {
		width: var(--icon-rail-width);
		min-width: var(--icon-rail-width);
		flex-shrink: 0;
		background: var(--sidebar);
		border-right: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 10px 0;
		position: relative;
		z-index: 10;
	}

	.rail-top {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.rail-spacer {
		flex: 1;
	}

	.rail-bottom {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.rail-btn {
		width: 48px;
		/* WCAG 2.5.5 minimum tap target — 44×44. Width already 48, height was 32; bumped to 44. */
		height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: transparent;
		color: var(--foreground-secondary);
		cursor: pointer;
		border-radius: 4px;
		position: relative;
		padding: 0;
		margin: 0;
		outline: none;
		transition:
			color 0.15s ease,
			background-color 0.15s ease;
	}

	.rail-btn:hover {
		background-color: var(--surface-hover);
		color: var(--foreground-muted);
	}

	.rail-btn.active {
		color: var(--primary);
		background-color: color-mix(in srgb, var(--foreground) 8%, transparent);
	}

	/* Logo icon — always foreground, no active state */
	.rail-logo {
		color: var(--foreground);
	}

	.rail-logo:hover {
		color: var(--foreground);
	}

	/* Separator line between Layers and Settings */
	.rail-separator {
		width: 24px;
		height: 1px;
		background: color-mix(in srgb, var(--foreground) 10%, transparent);
		margin: 2px 0;
	}
</style>
