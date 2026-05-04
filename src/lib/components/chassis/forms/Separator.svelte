<script lang="ts">
	interface Props {
		orientation?: 'horizontal' | 'vertical';
		class?: string;
	}

	let { orientation = 'horizontal', class: extraClass = '' }: Props = $props();
</script>

<div
	role="separator"
	aria-orientation={orientation}
	class="separator separator--{orientation} {extraClass}"
></div>

<style>
	.separator {
		background: var(--border);
		flex-shrink: 0;
	}

	.separator--horizontal {
		height: 1px;
		width: 100%;
	}

	.separator--vertical {
		width: 1px;
		height: 100%;
	}
</style>
