<script lang="ts">
	// C0 placeholder for the V3 (NVIDIA UI, :5175) workspace. C1 replaces this
	// file with the working copy of V1's dashboard (src/routes/dashboard/
	// +page.svelte). For now it confirms the :5175 port plumbing end-to-end —
	// the hooks.server.ts redirect, the V3 layout, the theme store, and the
	// [data-ui='v3'] CSS scope are all exercised by rendering this page.
</script>

<svelte:head>
	<title>Argos V3 — NVIDIA UI</title>
</svelte:head>

<div class="v3-placeholder">
	<section class="v3-card">
		<p class="v3-eyebrow">Argos · Port 5175</p>
		<h1 class="v3-title">V3 — NVIDIA UI</h1>
		<p class="v3-lede">
			Port plumbing is active. The full working copy of the V1 console lands in
			phase C1; the NVIDIA design polish follows in C2.
		</p>
		<p class="v3-status">C0 · port plumbing complete</p>
	</section>
</div>

<style>
	.v3-placeholder {
		display: flex;
		min-height: 100vh;
		align-items: center;
		justify-content: center;
		padding: var(--space-8, 2rem);
		background: var(--background, #111111);
		color: var(--foreground, #ffffff);
		font-family: 'Geist', system-ui, sans-serif;
	}

	.v3-card {
		max-width: 32rem;
		padding: var(--space-10, 2.5rem);
		border: 1px solid var(--border, #2e2e2e);
		border-radius: var(--radius, 0.65rem);
		background: var(--card, #1a1a1a);
		text-align: center;
	}

	.v3-eyebrow {
		margin: 0 0 var(--space-3, 0.75rem);
		font-size: var(--text-section, 0.5625rem);
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--primary, #a8b8e0);
	}

	.v3-title {
		margin: 0 0 var(--space-4, 1rem);
		font-size: var(--text-hero, 1.5rem);
		font-weight: 600;
		color: var(--foreground, #ffffff);
	}

	.v3-lede {
		margin: 0 0 var(--space-6, 1.5rem);
		font-size: var(--text-base, 0.875rem);
		line-height: 1.6;
		color: var(--text-secondary, #bbbbbb);
	}

	.v3-status {
		margin: 0;
		font-size: var(--text-status, 0.625rem);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--success, #8bbfa0);
	}
</style>
