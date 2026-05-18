<!-- RF Advanced parameter controls — collapsible section for CloudRF power/model/environment -->
<script lang="ts">
	import Dropdown from '$lib/components/chassis/forms/Dropdown.svelte';
	import NumberInput from '$lib/components/chassis/forms/NumberInput.svelte';
	import { rfParams, updateRFParam } from '$lib/stores/dashboard/rf-propagation-store';
	import type {
		ClutterProfile,
		PropagationModelId,
		ReliabilityPercent
	} from '$lib/types/rf-propagation';
	import {
		autoSelectPropModel,
		CLUTTER_PROFILES,
		PROPAGATION_MODELS,
		RELIABILITY_OPTIONS
	} from '$lib/types/rf-propagation';

	let expanded = $state(false);

	/** Label for the auto-selected propagation model based on current frequency */
	const autoModelLabel = $derived.by(() => {
		const autoId = autoSelectPropModel($rfParams.frequency);
		const model = PROPAGATION_MODELS.find((m) => m.id === autoId);
		return model ? model.label : 'Auto';
	});

	const clutterItems = $derived(CLUTTER_PROFILES.map((p) => ({ id: p.id, label: p.label })));

	const reliabilityItems = $derived(
		RELIABILITY_OPTIONS.map((o) => ({ id: o.value, label: o.label }))
	);

	const propModelItems = $derived([
		{ id: 'auto', label: `Auto (${autoModelLabel})` },
		...PROPAGATION_MODELS.map((m) => ({ id: m.id, label: `${m.label} (${m.band})` }))
	]);

	const propModelSelectedId = $derived<string | number>(
		$rfParams.propagationModel === null ? 'auto' : $rfParams.propagationModel
	);

	function setRfNumber(key: 'txPower' | 'rxSensitivity', v: number | null): void {
		if (v != null) updateRFParam(key, v);
	}

	function handleClutter(id: string | number): void {
		updateRFParam('clutterProfile', String(id) as ClutterProfile);
	}

	function handlePropModel(id: string | number): void {
		updateRFParam(
			'propagationModel',
			id === 'auto' ? null : (Number(id) as PropagationModelId)
		);
	}

	function handleReliability(id: string | number): void {
		updateRFParam('reliability', Number(id) as ReliabilityPercent);
	}
</script>

<section class="rf-advanced">
	<button class="section-toggle" onclick={() => (expanded = !expanded)}>
		<span class="section-label">ADVANCED</span>
		<span class="chevron" class:expanded>&#9662;</span>
	</button>

	{#if expanded}
		<div class="advanced-body">
			<div class="field-grid">
				<NumberInput
					labelText="TX POWER (W)"
					value={$rfParams.txPower}
					min={0.001}
					max={100}
					step={0.5}
					size="sm"
					hideSteppers
					disableWheel
					onChange={(v) => setRfNumber('txPower', v)}
				/>

				<NumberInput
					labelText="RX SENSITIVITY (dBm)"
					value={$rfParams.rxSensitivity}
					min={-150}
					max={0}
					step={1}
					size="sm"
					hideSteppers
					disableWheel
					onChange={(v) => setRfNumber('rxSensitivity', v)}
				/>
			</div>

			<div class="field-grid">
				<Dropdown
					labelText="ENVIRONMENT"
					items={clutterItems}
					selectedId={$rfParams.clutterProfile}
					onSelect={(id) => handleClutter(id)}
					size="sm"
				/>

				<Dropdown
					labelText="RELIABILITY"
					items={reliabilityItems}
					selectedId={$rfParams.reliability}
					onSelect={(id) => handleReliability(id)}
					size="sm"
				/>
			</div>

			<div class="field-grid field-grid--full">
				<Dropdown
					labelText="PROP MODEL"
					items={propModelItems}
					selectedId={propModelSelectedId}
					onSelect={(id) => handlePropModel(id)}
					size="sm"
				/>
			</div>
		</div>
	{/if}
</section>

<style>
	.rf-advanced {
		padding: 10px 14px;
		border-bottom: 1px solid var(--border);
	}

	.section-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	.section-label {
		font-family: var(--font-mono, 'Fira Code', monospace);
		font-size: 9px;
		font-weight: 600;
		letter-spacing: 1.2px;
		text-transform: uppercase;
		color: var(--foreground-secondary, #888888);
	}

	.chevron {
		font-size: 10px;
		color: var(--foreground-secondary, #888888);
		transition: transform 0.15s;
		transform: rotate(-90deg);
	}

	.chevron.expanded {
		transform: rotate(0deg);
	}

	.advanced-body {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-top: 8px;
	}

	.field-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}

	.field-grid--full {
		grid-template-columns: 1fr;
	}
</style>
