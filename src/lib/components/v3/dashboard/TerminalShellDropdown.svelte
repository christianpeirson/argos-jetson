<script lang="ts">
	import type { ShellInfo } from '$lib/types/terminal';

	interface Props {
		availableShells: ShellInfo[];
		showShellDropdown: boolean;
		onCreateSession: (shell?: string) => void;
		onToggleShellDropdown: () => void;
	}

	let { availableShells, showShellDropdown, onCreateSession, onToggleShellDropdown }: Props =
		$props();
</script>

<div class="shell-dropdown-wrapper">
	<button
		class="toolbar-btn add-btn"
		aria-label="New terminal"
		title="New terminal"
		onclick={onToggleShellDropdown}
	>
		<svg
			width="14"
			height="14"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<line x1="12" y1="5" x2="12" y2="19" />
			<line x1="5" y1="12" x2="19" y2="12" />
		</svg>
	</button>
	{#if showShellDropdown}
		<div class="dropdown-menu">
			{#each availableShells as shell (shell.path)}
				<button
					type="button"
					class="dropdown-item"
					onclick={() => onCreateSession(shell.path)}
				>
					<span class="dropdown-item__name">{shell.name}</span>
					{#if shell.isDefault}
						<span class="default-badge">default</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.shell-dropdown-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		margin-left: var(--space-1);
		padding-left: var(--space-2);
		border-left: 1px solid var(--border);
	}

	.toolbar-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		padding: 0;
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--foreground-muted);
		cursor: pointer;
		transition:
			background 0.1s ease,
			color 0.1s ease;
	}

	.toolbar-btn:hover {
		background: var(--surface-elevated);
		color: var(--foreground);
	}

	.dropdown-menu {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: var(--space-2);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
		z-index: 1000;
		min-width: 140px;
	}

	.dropdown-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		width: 100%;
		padding: var(--space-2) var(--space-3);
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--foreground-muted);
		font-size: var(--text-sm);
		text-align: left;
		cursor: pointer;
		transition: background 0.1s ease;
		white-space: nowrap;
	}

	.dropdown-item:hover {
		background: var(--surface-elevated);
		color: var(--foreground);
	}

	.dropdown-item__name {
		flex: 1;
	}

	.default-badge {
		font-size: var(--text-status);
		padding: 1px 4px;
		background: var(--surface-elevated);
		border-radius: var(--radius-sm);
		color: var(--foreground-secondary);
	}
</style>
