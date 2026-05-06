<script lang="ts">
	import Modal from '$lib/components/chassis/forms/Modal.svelte';
	import StructuredList from '$lib/components/chassis/forms/StructuredList.svelte';
	import Tag from '$lib/components/chassis/forms/Tag.svelte';
	import type { AppEvent, AppEventLevel } from '$lib/types/event';

	interface Props {
		open: boolean;
		event: AppEvent | null;
		onClose: () => void;
	}

	let { open = $bindable(), event, onClose }: Props = $props();

	const LEVEL_KIND: Record<AppEventLevel, 'cool-gray' | 'magenta' | 'red'> = {
		info: 'cool-gray',
		warn: 'magenta',
		error: 'red'
	};

	const LEVEL_LABEL: Record<AppEventLevel, string> = {
		info: 'INF',
		warn: 'WRN',
		error: 'ALM'
	};

	const columns = [
		{ key: 'field', header: 'FIELD' },
		{ key: 'value', header: 'VALUE' }
	];

	const detailRows = $derived(
		event
			? Object.entries(event.payload ?? {}).map(([key, value], idx) => ({
					id: `${event.id}-${idx}`,
					field: key.toUpperCase(),
					value: typeof value === 'object' ? JSON.stringify(value) : String(value)
				}))
			: []
	);

	function handleClose(): void {
		open = false;
		onClose();
	}
</script>

<Modal
	bind:open
	size="md"
	passiveModal
	hasScrollingContent
	modalHeading={event ? `Event ${event.id}` : 'Event detail'}
	onClose={handleClose}
>
	{#if event}
		<div class="evt-detail">
			<div class="evt-meta">
				<Tag type={LEVEL_KIND[event.level]} size="sm">{LEVEL_LABEL[event.level]}</Tag>
				<span class="evt-source">{event.source}</span>
				<span class="evt-time">
					{new Date(event.timestamp).toISOString()}
				</span>
			</div>

			{#if detailRows.length > 0}
				<StructuredList {columns} rows={detailRows} flush condensed />
			{:else}
				<div class="evt-empty">No additional payload.</div>
			{/if}
		</div>
	{/if}
</Modal>

<style>
	.evt-detail {
		font-family: var(--mk2-f-mono);
		color: var(--mk2-ink);
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.evt-meta {
		display: flex;
		gap: 10px;
		align-items: center;
		font-size: var(--mk2-fs-2);
	}

	.evt-source {
		color: var(--mk2-ink-3);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.evt-time {
		color: var(--mk2-ink-4);
		font-size: var(--mk2-fs-1);
		letter-spacing: 0.04em;
	}

	.evt-empty {
		color: var(--mk2-ink-4);
		font-size: var(--mk2-fs-2);
		padding: 8px 0;
	}
</style>
