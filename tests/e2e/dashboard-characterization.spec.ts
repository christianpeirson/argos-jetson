/**
 * Characterization E2E for the v1 (:5173) dashboard — the behavior baseline the
 * monolith decomposition (view-router / services / shortcuts / bottom-panel
 * extraction) + SSR flip must preserve. Green-to-green: run before each refactor
 * PR and after; any diff = a regression.
 *
 * Locators are user-visible (getByRole) and assertions are web-first (auto-retry)
 * — no `networkidle` (the dashboard polls forever on Jetson) and no waitForTimeout.
 */
import { expect, test } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'http://localhost:5173';

test.describe('Dashboard characterization (:5173)', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto(`${BASE_URL}/dashboard`);
		// Chassis nav is the stable first-paint anchor (no networkidle).
		await expect(page.getByRole('navigation', { name: 'Dashboard navigation' })).toBeVisible();
	});

	test('loads the map view with maplibre controls', async ({ page }) => {
		// Map region + zoom/center controls prove maplibre mounted (the client-only
		// island after the SSR flip — must still render post-hydration).
		await expect(page.getByRole('region', { name: 'Map' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Center on my location' })).toBeVisible();
	});

	test('chassis navigation buttons are present', async ({ page }) => {
		const nav = page.getByRole('navigation', { name: 'Dashboard navigation' });
		// exact:true — "Settings" would otherwise also match "Map Settings".
		for (const name of ['Overview', 'Dashboard', 'Tools', 'Reports', 'WebTAK', 'Settings']) {
			await expect(nav.getByRole('button', { name, exact: true })).toBeVisible();
		}
	});

	test('switches view via the nav rail and back to map', async ({ page }) => {
		await page
			.getByRole('navigation', { name: 'Dashboard navigation' })
			.getByRole('button', { name: 'Overview' })
			.click();
		// Overview panel renders its SYSTEM OVERVIEW header.
		await expect(page.getByText('SYSTEM OVERVIEW')).toBeVisible();

		// Returning to the map view restores the map controls.
		await page
			.getByRole('navigation', { name: 'Dashboard navigation' })
			.getByRole('button', { name: 'Map Settings' })
			.click();
		await expect(page.getByRole('region', { name: 'Map' })).toBeVisible();
	});

	test('bottom-panel tabs switch content', async ({ page }) => {
		// Tabs are always-rendered in the resizable bottom panel.
		await page.getByRole('button', { name: 'Logs', exact: true }).click();
		await page.getByRole('button', { name: 'Bluetooth', exact: true }).click();
		await page.getByRole('button', { name: 'IMSI Captures' }).click();
		// IMSI Captures panel surfaces its title (CapturesPanel).
		// exact:true — "IMSI CAPTURE" title vs the "IMSI Captures" tab button.
		await expect(page.getByText('IMSI CAPTURE', { exact: true })).toBeVisible();
	});

	test('Escape from a non-map view returns to the map', async ({ page }) => {
		await page
			.getByRole('navigation', { name: 'Dashboard navigation' })
			.getByRole('button', { name: 'Overview' })
			.click();
		await expect(page.getByText('SYSTEM OVERVIEW')).toBeVisible();
		await page.keyboard.press('Escape');
		await expect(page.getByRole('region', { name: 'Map' })).toBeVisible();
	});
});
