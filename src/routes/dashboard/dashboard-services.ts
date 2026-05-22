/**
 * Dashboard background-service lifecycle. Extracted from +page.svelte so the
 * page orchestrator no longer owns GPS/Kismet/TAK construction + start/stop.
 *
 * Plain factory (no runes needed) — constructs the three client tactical-map
 * services once and groups their start/stop. +page.svelte calls start() in
 * onMount (browser only) and stop() in onDestroy.
 */
import { startGpPolling, stopGpPolling } from '$lib/stores/globalprotect-store';
import { GPSService } from '$lib/tactical-map/gps-service';
import { KismetService } from '$lib/tactical-map/kismet-service';
import { TakService } from '$lib/tactical-map/tak-service';

export function createDashboardServices() {
	const gps = new GPSService();
	const kismet = new KismetService();
	const tak = new TakService();

	return {
		start(): void {
			gps.startPositionUpdates();
			kismet.startPeriodicStatusCheck();
			kismet.startPeriodicDeviceFetch();
			void kismet.fetchKismetDevices();
			tak.startPeriodicStatusCheck();
			startGpPolling();
		},
		stop(): void {
			gps.stopPositionUpdates();
			kismet.stopPeriodicChecks();
			tak.stopPeriodicChecks();
			stopGpPolling();
		}
	};
}
