<script lang="ts">
	import ServiceIframeView from './ServiceIframeView.svelte';
</script>

<ServiceIframeView
	title="BlueHood Bluetooth Scanner"
	iframeTitle="BlueHood Bluetooth Scanner"
	statusEndpoint="/api/bluehood/status"
	offlineLabel="BLUEHOOD UNAVAILABLE"
	offlineDetail="Dashboard not responding. Start the service first."
/>
