<script lang="ts">
	import ServiceIframeView from './ServiceIframeView.svelte';
</script>

<ServiceIframeView
	title="WigleToTAK"
	iframeTitle="WigleToTAK"
	statusEndpoint="/api/wigletotak/status"
	offlineLabel="WIGLETOTAK OFFLINE"
	offlineDetail="Start the service from the navigation panel first."
/>
