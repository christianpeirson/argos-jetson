<script lang="ts">
	import NumberInput from '$lib/components/chassis/forms/NumberInput.svelte';
	import Toggle from '$lib/components/chassis/forms/Toggle.svelte';
	import Input from '$lib/components/v3/ui/input/input.svelte';
	import type { TakServerConfig } from '$lib/types/tak';

	let { config = $bindable() }: { config: TakServerConfig } = $props();
</script>

<div class="rounded-lg border border-border/60 bg-card/40 p-3">
	<span class="mb-2 block text-xs font-semibold tracking-widest text-muted-foreground"
		>SERVER</span
	>
	<div class="flex flex-col gap-2">
		<label class="flex flex-col gap-1 text-[11px] font-medium text-muted-foreground">
			Description
			<Input
				type="text"
				bind:value={config.name}
				placeholder="Unit TAK Server"
				class="h-8 text-xs"
			/>
		</label>
		<div class="flex gap-2">
			<label
				class="flex flex-[2] flex-col gap-1 text-[11px] font-medium text-muted-foreground"
			>
				Hostname / IP
				<Input
					type="text"
					bind:value={config.hostname}
					placeholder="192.168.1.100"
					class="h-8 text-xs"
				/>
			</label>
			<div class="flex-1">
				<NumberInput
					labelText="Port"
					bind:value={config.port}
					placeholder="8089"
					min={1}
					max={65535}
					step={1}
					size="sm"
					hideSteppers
					disableWheel
				/>
			</div>
		</div>
		<div
			class="flex flex-row items-center gap-2 rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/40"
		>
			<Toggle
				bind:toggled={config.shouldConnectOnStartup}
				labelText="Connect on startup"
				size="sm"
			/>
		</div>
	</div>
</div>
