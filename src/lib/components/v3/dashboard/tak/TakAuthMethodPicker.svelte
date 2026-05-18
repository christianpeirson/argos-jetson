<script lang="ts">
	import RadioButton from '$lib/components/chassis/forms/RadioButton.svelte';
	import RadioButtonGroup from '$lib/components/chassis/forms/RadioButtonGroup.svelte';
	import type { TakServerConfig } from '$lib/types/tak';

	let { config = $bindable() }: { config: TakServerConfig } = $props();
</script>

<div class="rounded-lg border border-border/60 bg-card/40 p-3">
	<span class="mb-2 block text-xs font-semibold tracking-widest text-muted-foreground">
		AUTHENTICATION
	</span>
	<RadioButtonGroup
		bind:selected={config.authMethod}
		legendText="Authentication method"
		hideLegend
		orientation="vertical"
		class="auth-method-group"
	>
		<RadioButton labelText="Import Certificate (.p12)" value="import" class="auth-chip" />
		<RadioButton labelText="Enroll for Certificate" value="enroll" class="auth-chip" />
	</RadioButtonGroup>
</div>

<style>
	/* Chip-pill skin around Carbon's RadioButton wrapper.
	   Selectors are :global because Carbon ships its own DOM that Svelte's
	   scoped-CSS hashing cannot reach. */
	:global(.auth-method-group .bx--radio-button-wrapper.auth-chip) {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.5rem 0.75rem;
		border: 1px solid hsl(var(--border) / 0.4);
		border-radius: 0.375rem;
		background: hsl(var(--muted) / 0.1);
		color: hsl(var(--muted-foreground));
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
	}

	:global(.auth-method-group .bx--radio-button-wrapper.auth-chip:hover) {
		background: hsl(var(--muted) / 0.3);
	}

	:global(
		.auth-method-group .bx--radio-button-wrapper.auth-chip:has(input[type='radio']:checked)
	) {
		border-color: hsl(var(--primary) / 0.6);
		background: hsl(var(--primary) / 0.1);
		color: hsl(var(--foreground));
	}

	/* Vertical stack spacing — Carbon's default vertical group spacing */
	:global(.auth-method-group.bx--radio-button-group--vertical) {
		gap: 0.5rem;
	}
</style>
