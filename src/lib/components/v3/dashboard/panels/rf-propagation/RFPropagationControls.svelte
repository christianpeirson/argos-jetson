<!-- RF Propagation parameter controls — compact form for CloudRF computation settings -->
<script lang="ts">
	import { SelectItem } from 'carbon-components-svelte';

	import NumberInput from '$lib/components/chassis/forms/NumberInput.svelte';
	import Select from '$lib/components/chassis/forms/Select.svelte';
	import { rfParams, updateRFParam } from '$lib/stores/dashboard/rf-propagation-store';

	function setRfNumber(
		key: 'frequency' | 'txHeight' | 'rxHeight' | 'radius' | 'resolution',
		v: number | null
	): void {
		if (v != null) updateRFParam(key, v);
	}

	function handlePolarization(v: string | number | undefined): void {
		if (v !== undefined) updateRFParam('polarization', Number(v));
	}
</script>

<section class="rf-controls">
	<h3 class="section-label">RF PARAMETERS</h3>

	<div class="field-grid">
		<NumberInput
			labelText="FREQUENCY (MHz)"
			value={$rfParams.frequency}
			min={1}
			max={100000}
			step={1}
			size="sm"
			hideSteppers
			disableWheel
			onChange={(v) => setRfNumber('frequency', v)}
		/>

		<Select
			labelText="POLARIZATION"
			value={$rfParams.polarization}
			onChange={handlePolarization}
			size="sm"
		>
			<SelectItem value={0} text="Horizontal" />
			<SelectItem value={1} text="Vertical" />
		</Select>
	</div>

	<div class="field-grid">
		<NumberInput
			labelText="TX HEIGHT (m)"
			value={$rfParams.txHeight}
			min={0.5}
			max={500}
			step={0.5}
			size="sm"
			hideSteppers
			disableWheel
			onChange={(v) => setRfNumber('txHeight', v)}
		/>

		<NumberInput
			labelText="RX HEIGHT (m)"
			value={$rfParams.rxHeight}
			min={0.5}
			max={500}
			step={0.5}
			size="sm"
			hideSteppers
			disableWheel
			onChange={(v) => setRfNumber('rxHeight', v)}
		/>
	</div>

	<div class="field-grid">
		<NumberInput
			labelText="RADIUS (km)"
			value={$rfParams.radius}
			min={0.1}
			max={100}
			step={0.5}
			size="sm"
			hideSteppers
			disableWheel
			onChange={(v) => setRfNumber('radius', v)}
		/>

		<NumberInput
			labelText="RESOLUTION (m/px)"
			value={$rfParams.resolution}
			min={5}
			max={300}
			step={5}
			size="sm"
			hideSteppers
			disableWheel
			onChange={(v) => setRfNumber('resolution', v)}
		/>
	</div>
</section>

<style>
	.rf-controls {
		padding: 10px 14px;
		border-bottom: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.section-label {
		font-family: var(--font-mono, 'Fira Code', monospace);
		font-size: 9px;
		font-weight: 600;
		letter-spacing: 1.2px;
		text-transform: uppercase;
		color: var(--foreground-secondary, #888888);
		margin: 0;
	}

	.field-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
</style>
