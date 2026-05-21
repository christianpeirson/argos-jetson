/**
 * E2E smoke test for the Phase-B RF layer component stack.
 *
 * Verifies that the four Rf*Layer.svelte components (heatmap, centroid,
 * path, highlight) mount under <MapLibre> without `Layer X already exists`
 * or `Source X is in use` console errors — the failure mode you get when
 * a declarative-layer refactor accidentally double-adds a layer (e.g. on
 * style.load re-fire). Also exercises the RF overlay toggle path in the
 * Map Settings panel.
 *
 * Network fixtures: /api/rf/* endpoints intercepted with canned GeoJSON
 * so the test doesn't require a live HackRF / Kismet session.
 *
 * Patterns: web-first assertions (toBeVisible), user-visible locators
 * (button[aria-label]), page.route() for network interception.
 * Ref: tessl-labs/playwright-testing skill.
 */

import { type ConsoleMessage, expect, test } from '@playwright/test';

const EMPTY_FC = { type: 'FeatureCollection', features: [] };

/** Layer-id substrings that indicate the Rf*Layer component stack is mounted twice or stale. */
const LAYER_DOUBLE_MOUNT_PATTERNS = [
	/Layer\s+["']?rf-heatmap/i,
	/Layer\s+["']?rf-path/i,
	/Layer\s+["']?rf-centroid/i,
	/Layer\s+["']?rf-highlight/i,
	/Source\s+["']?rf-heatmap/i,
	/Source\s+["']?rf-path/i,
	/Source\s+["']?rf-centroid/i,
	/Source\s+["']?rf-highlight/i
];

function isLayerError(msg: ConsoleMessage): boolean {
	if (msg.type() !== 'error' && msg.type() !== 'warning') return false;
	const text = msg.text();
	return LAYER_DOUBLE_MOUNT_PATTERNS.some((re) => re.test(text));
}

test.describe('Phase B RF layer components', () => {
	test('dashboard mounts RF layers without double-mount errors + survives RF toggle', async ({
		page
	}) => {
		const layerErrors: string[] = [];
		page.on('console', (msg) => {
			if (isLayerError(msg)) layerErrors.push(`[${msg.type()}] ${msg.text()}`);
		});

		await page.route('**/api/rf/aggregate**', (route) => route.fulfill({ json: EMPTY_FC }));
		await page.route('**/api/rf/sessions**', (route) => route.fulfill({ json: [] }));
		await page.route('**/api/rf/observations**', (route) => route.fulfill({ json: EMPTY_FC }));
		await page.route('**/api/rf/stream**', (route) =>
			route.fulfill({
				contentType: 'text/event-stream',
				body: ': stream-start\n\n'
			})
		);

		// NOTE: do NOT use waitForLoadState('networkidle') — the Argos dashboard
		// polls /api/gps/position + hardware status + an SSE stream continuously,
		// so the network never goes idle and the wait would hang to timeout.
		// Web-first element assertion is the correct readiness signal here.
		await page.goto('/dashboard', { waitUntil: 'load' });
		await expect(page.locator('.map-container, [data-screen="map"]').first()).toBeVisible({
			timeout: 20_000
		});

		// Toggle into Map Settings → Map Layers, flip the RF heatmap chip, flip it back.
		const mapSettingsBtn = page.locator('button.rail-btn[aria-label="Map Settings"]');
		await expect(mapSettingsBtn).toBeVisible({ timeout: 10_000 });
		await mapSettingsBtn.click();
		const layersCard = page.locator('button.hub-card:has-text("Map Layers")');
		if (await layersCard.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await layersCard.click();
			const rfChip = page
				.locator('button:has-text("RF Heatmap"), button:has-text("Heatmap")')
				.first();
			if (await rfChip.isVisible({ timeout: 3_000 }).catch(() => false)) {
				await rfChip.click();
				await page.waitForTimeout(250);
				await rfChip.click();
			}
		}

		expect(
			layerErrors,
			`Unexpected RF-layer console errors:\n${layerErrors.join('\n')}`
		).toEqual([]);
	});
});
