<script lang="ts">
	import Modal from '$lib/components/chassis/forms/Modal.svelte';

	let { open = $bindable(false), message = '' }: { open: boolean; message: string } = $props();
</script>

<Modal
	bind:open
	modalLabel="GSM Evil"
	modalHeading="Error"
	primaryButtonText="OK"
	size="sm"
	danger
	onSubmit={() => (open = false)}
	onClose={() => (open = false)}
>
	{message}
</Modal>
