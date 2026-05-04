<!-- @constitutional-exemption Article-IV-4.3 issue:#11 — Component state handling (loading/error/empty UI) deferred to UX improvement phase -->
<script lang="ts">
	import { SelectItem } from 'carbon-components-svelte';

	import Select from '$lib/components/chassis/forms/Select.svelte';
	import { activePanel, activeView } from '$lib/stores/dashboard/dashboard-store';
	import type { RailPosition, ThemePalette } from '$lib/stores/theme-store.svelte';
	import { themeStore } from '$lib/stores/theme-store.svelte';
	import { palettes } from '$lib/themes/palettes';

	const paletteOptions = palettes.map((p) => ({ value: p.label, label: p.name }));

	const railOptions = [
		{ value: 'left', label: 'Left' },
		{ value: 'right', label: 'Right' },
		{ value: 'top', label: 'Top' },
		{ value: 'bottom', label: 'Bottom' }
	];

	function handlePaletteChange(value: string | number | undefined) {
		if (typeof value === 'string') {
			themeStore.setPalette(value as ThemePalette);
		}
	}

	function handleRailChange(value: string | number | undefined) {
		if (typeof value === 'string') {
			themeStore.setRailPosition(value as RailPosition);
		}
	}

	function openView(view: 'tak-config' | 'globalprotect' | 'logs-analytics') {
		activeView.set(view);
		activePanel.set(null);
	}

	function openHardwarePanel() {
		activePanel.set('hardware');
	}
</script>

<div class="settings-panel">
	<header class="panel-header">
		<span class="panel-title">SETTINGS</span>
	</header>

	<div class="cards-container">
		<!-- Appearance Card -->
		<div class="settings-card">
			<div class="card-header">
				<svg
					class="card-icon"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="12" cy="12" r="10" /><path d="M12 2a7 7 0 0 0 0 14h7" />
				</svg>
				<span class="card-title">Appearance</span>
			</div>
			<p class="card-description">Customize colors and layout</p>
			<div class="card-body">
				<div class="setting-row">
					<span class="setting-label">Color Palette</span>
					<Select
						labelText="Color palette"
						noLabel
						size="sm"
						value={themeStore.palette}
						onChange={handlePaletteChange}
						class="palette-select"
					>
						{#each paletteOptions as option (option.value)}
							<SelectItem value={option.value} text={option.label} />
						{/each}
					</Select>
				</div>
				<div class="setting-row">
					<span class="setting-label">Navigation Rail</span>
					<Select
						labelText="Navigation rail"
						noLabel
						size="sm"
						value={themeStore.railPosition}
						onChange={handleRailChange}
						class="rail-select"
					>
						{#each railOptions as option (option.value)}
							<SelectItem value={option.value} text={option.label} />
						{/each}
					</Select>
				</div>
			</div>
		</div>

		<!-- Connectivity Card -->
		<div class="settings-card">
			<div class="card-header">
				<svg
					class="card-icon"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
					<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
				</svg>
				<span class="card-title">Connectivity</span>
			</div>
			<p class="card-description">External service connections</p>
			<div class="card-body">
				<div class="setting-row">
					<span class="setting-label">TAK Server</span>
					<button class="open-btn" onclick={() => openView('tak-config')}>
						Open
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="9 18 15 12 9 6" />
						</svg>
					</button>
				</div>
				<div class="setting-row">
					<span class="setting-label">GlobalProtect VPN</span>
					<button class="open-btn" onclick={() => openView('globalprotect')}>
						Open
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="9 18 15 12 9 6" />
						</svg>
					</button>
				</div>
			</div>
		</div>

		<!-- Hardware Card -->
		<button class="settings-card clickable-card" onclick={openHardwarePanel}>
			<div class="card-header">
				<svg
					class="card-icon"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
					<rect x="9" y="9" width="6" height="6" />
					<line x1="9" y1="1" x2="9" y2="4" />
					<line x1="15" y1="1" x2="15" y2="4" />
					<line x1="9" y1="20" x2="9" y2="23" />
					<line x1="15" y1="20" x2="15" y2="23" />
					<line x1="20" y1="9" x2="23" y2="9" />
					<line x1="20" y1="14" x2="23" y2="14" />
					<line x1="1" y1="9" x2="4" y2="9" />
					<line x1="1" y1="14" x2="4" y2="14" />
				</svg>
				<span class="card-title">Hardware</span>
				<svg
					class="card-chevron"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polyline points="9 18 15 12 9 6" />
				</svg>
			</div>
			<p class="card-description">GPS, SDR, and WiFi device settings</p>
		</button>

		<!-- Logs & Analytics Card -->
		<div class="settings-card">
			<div class="card-header">
				<svg
					class="card-icon"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<line x1="18" y1="20" x2="18" y2="10" />
					<line x1="12" y1="20" x2="12" y2="4" />
					<line x1="6" y1="20" x2="6" y2="14" />
				</svg>
				<span class="card-title">Logs & Analytics</span>
			</div>
			<p class="card-description">System logs and diagnostics</p>
			<div class="card-body">
				<div class="setting-row">
					<span class="setting-label">System Logs</span>
					<button class="open-btn" onclick={() => openView('logs-analytics')}>
						Open
						<svg
							width="14"
							height="14"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="9 18 15 12 9 6" />
						</svg>
					</button>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	@import './settings-panel.css';
</style>
