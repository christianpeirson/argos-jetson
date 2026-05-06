<script lang="ts">
	import type { IconProps } from '@lucide/svelte';
	import { Bot, LayoutDashboard, Map as MapIcon, Plus, Wrench } from '@lucide/svelte';
	import type { Component } from 'svelte';
	import { onMount } from 'svelte';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	// spec-024 PR1 T009 — Mk II left rail.
	// Phase 9 follow-up — slots now drag-reorderable via PointerEvents
	// (per Argos memory project_spec024_wave1_spikes_done.md: PointerEvents
	// posted 6.5× P95 win over HTML5 DnD). Order persists to localStorage
	// at key `argos.leftrail.order`. Reordering renumbers slots 01/02/03/…
	// so the digit hotkey (1-9) always maps to the visually-displayed slot.

	type View = string;

	interface PinnedTool {
		id: View;
		label: string;
		icon: Component<IconProps>;
		/**
		 * Optional href override for tools that don't live at the canonical
		 * `/dashboard/mk2/${id}` path (e.g., external tools embedded at
		 * `/dashboard/mk2/embed/${id}`). Defaults to `/dashboard/mk2/${id}`.
		 */
		href?: string;
	}

	interface Props {
		pinned?: PinnedTool[];
		toolsOpen?: boolean;
		onOpenTools?: () => void;
		/**
		 * Callback fired when the user requests to remove a pinned tool from
		 * the rail (right-click context-menu). The 3 fixed slots are never
		 * passed here — only consumer-pinned tools.
		 */
		onUnpin?: (id: string) => void;
	}

	const FIXED: PinnedTool[] = [
		{ id: 'agents', label: 'AGENTS', icon: Bot },
		{ id: 'overview', label: 'OVERVIEW', icon: LayoutDashboard },
		{ id: 'map', label: 'MAP', icon: MapIcon }
	];

	const SYSTEMS: PinnedTool = { id: 'systems', label: 'SYSTEMS', icon: Wrench };
	const STORAGE_KEY = 'argos.leftrail.order';
	const DRAG_THRESHOLD_PX = 5;

	let { pinned = [], toolsOpen = false, onOpenTools, onUnpin }: Props = $props();
	const FIXED_IDS = new Set(FIXED.map((s) => s.id));

	const allSlots = $derived([...FIXED, ...pinned]);

	let storedOrder = $state<string[]>([]);
	let dragId = $state<string | null>(null);
	let overId = $state<string | null>(null);
	let dragStartY = 0;
	let isDragging = $state(false);

	const slots = $derived.by(() => {
		const known = new Map<string, PinnedTool>(
			allSlots.map((s): [string, PinnedTool] => [s.id, s])
		);
		const ordered: PinnedTool[] = [];
		for (const id of storedOrder) {
			const s = known.get(id);
			if (s) {
				ordered.push(s);
				known.delete(id);
			}
		}
		// Append any new slots that weren't in stored order
		for (const s of known.values()) ordered.push(s);
		return ordered;
	});

	function loadOrder(): void {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return;
			const v = JSON.parse(raw);
			if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
				storedOrder = v as string[];
			}
		} catch {
			/* corrupt JSON / disabled — keep default order */
		}
	}

	function persistOrder(): void {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(slots.map((s) => s.id)));
		} catch {
			/* quota / disabled — ignore */
		}
	}

	onMount(() => {
		loadOrder();
	});

	function onPointerDown(e: PointerEvent, id: string): void {
		// Only left button + only on direct slot button (not anchor's child elements
		// where browser would prefer click navigation).
		if (e.button !== 0) return;
		dragId = id;
		dragStartY = e.clientY;
		isDragging = false;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}

	function pastDragThreshold(e: PointerEvent): boolean {
		return Math.abs(e.clientY - dragStartY) > DRAG_THRESHOLD_PX;
	}

	function anchorFromPoint(x: number, y: number): Element | null {
		const el = document.elementFromPoint(x, y);
		if (!(el instanceof Element)) return null;
		return el.closest('.rail-slot')?.querySelector('a.rail-btn') ?? null;
	}

	function slotLabelFromPoint(x: number, y: number): string | null {
		const anchor = anchorFromPoint(x, y);
		const label = anchor?.getAttribute('aria-label');
		return label ? label.toLowerCase() : null;
	}

	function slotIdUnderPoint(x: number, y: number): string | null {
		const label = slotLabelFromPoint(x, y);
		if (!label) return null;
		// aria-label is the SCREEN-READER name (AGENTS / OVERVIEW / MAP) — map back to id.
		const match = slots.find((s) => s.label.toLowerCase() === label);
		return match?.id ?? null;
	}

	function shouldEnterDrag(e: PointerEvent): boolean {
		return isDragging || pastDragThreshold(e);
	}

	function onPointerMove(e: PointerEvent): void {
		if (dragId === null || !shouldEnterDrag(e)) return;
		isDragging = true;
		// `setPointerCapture` keeps events bound to the originating anchor, so
		// hover detection can't rely on which element fires pointermove. Look
		// up the slot under the cursor manually.
		const hovered = slotIdUnderPoint(e.clientX, e.clientY);
		overId = hovered === dragId ? null : hovered;
	}

	function commitReorder(toId: string): void {
		if (dragId === null || dragId === toId) return;
		const next = slots.map((s) => s.id);
		const fromIdx = next.indexOf(dragId);
		const toIdx = next.indexOf(toId);
		if (fromIdx < 0 || toIdx < 0) return;
		next.splice(fromIdx, 1);
		next.splice(toIdx, 0, dragId);
		storedOrder = next;
		persistOrder();
	}

	function releasePointer(target: HTMLElement, pointerId: number): void {
		try {
			target.releasePointerCapture(pointerId);
		} catch {
			/* pointer already released by browser */
		}
	}

	function onPointerUp(e: PointerEvent): void {
		if (dragId === null) return;
		const wasDragging = isDragging;
		if (wasDragging) {
			const target = slotIdUnderPoint(e.clientX, e.clientY);
			if (target) commitReorder(target);
			e.preventDefault();
		}
		dragId = null;
		overId = null;
		releasePointer(e.currentTarget as HTMLElement, e.pointerId);
		// Reset isDragging on next tick so the click handler can read it
		// to suppress navigation on drag-end.
		setTimeout(() => {
			isDragging = false;
		}, 0);
	}

	function onAnchorClick(e: MouseEvent): void {
		if (isDragging) {
			e.preventDefault();
			e.stopPropagation();
		}
	}

	// Derive active screen from URL: /dashboard/mk2/<id> → <id>.
	// Pathnames outside the mk2 namespace produce null, which means no
	// rail slot is highlighted.
	const ROUTE_RE = /^\/dashboard\/mk2\/([^/?#]+)/;

	function activeIdFrom(pathname: string): string | null {
		const m = pathname.match(ROUTE_RE);
		return m ? m[1] : null;
	}

	const active = $derived(activeIdFrom(page.url.pathname));

	function pad2(n: number): string {
		return String(n).padStart(2, '0');
	}

	function hrefFor(item: PinnedTool): string {
		return item.href ?? `/dashboard/mk2/${item.id}`;
	}

	function onContextMenu(e: MouseEvent, id: string): void {
		// Right-click on a non-fixed (pinned) slot removes it from the rail.
		if (FIXED_IDS.has(id) || !onUnpin) return;
		e.preventDefault();
		onUnpin(id);
	}

	const INTERACTIVE_SELECTOR =
		'[role="dialog"], [role="menu"], [role="menuitem"], [role="listbox"], [role="combobox"], dialog, select, [contenteditable="true"]';

	function isFormField(target: EventTarget | null): boolean {
		if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)
			return true;
		return target instanceof HTMLElement && target.isContentEditable;
	}

	function isInsideInteractive(target: EventTarget | null): boolean {
		return target instanceof HTMLElement && target.closest(INTERACTIVE_SELECTOR) !== null;
	}

	function shouldSkipHotkey(e: KeyboardEvent): boolean {
		if (e.defaultPrevented) return true;
		if (isFormField(e.target)) return true;
		return isInsideInteractive(e.target);
	}

	function digitKeyToIndex(key: string): number | null {
		if (key < '1' || key > '9') return null;
		return Number(key) - 1;
	}

	function handleHotkey(e: KeyboardEvent): void {
		if (shouldSkipHotkey(e)) return;
		const idx = digitKeyToIndex(e.key);
		if (idx === null) return;
		const slot = slots[idx];
		if (!slot) return;
		e.preventDefault();
		void goto(hrefFor(slot));
	}

	$effect(() => {
		window.addEventListener('keydown', handleHotkey);
		return () => window.removeEventListener('keydown', handleHotkey);
	});

	const systemsActive = $derived(active === SYSTEMS.id);
</script>

<nav class="rail-inner" aria-label="Primary navigation">
	{#each slots as item, i (item.id)}
		{@const isActive = active === item.id && !toolsOpen}
		<div
			class="rail-slot"
			class:rail-slot--drag={dragId === item.id}
			class:rail-slot--over={overId === item.id}
		>
			<a
				class="rail-btn"
				class:active={isActive}
				href={hrefFor(item)}
				title="{pad2(i + 1)} {item.label}{FIXED_IDS.has(item.id)
					? ' — drag to reorder'
					: ' — drag to reorder · right-click to unpin'}"
				aria-label={item.label}
				aria-current={isActive ? 'page' : undefined}
				draggable="false"
				ondragstart={(e) => e.preventDefault()}
				onpointerdown={(e) => onPointerDown(e, item.id)}
				onpointermove={(e) => onPointerMove(e)}
				onpointerup={(e) => onPointerUp(e)}
				onclick={onAnchorClick}
				oncontextmenu={(e) => onContextMenu(e, item.id)}
			>
				<span class="rail-num">{pad2(i + 1)}</span>
				<item.icon size={16} />
				{#if isActive}<span class="rail-tick"></span>{/if}
			</a>
		</div>
	{/each}

	<button
		type="button"
		class="rail-btn tools-launcher"
		class:active={toolsOpen}
		title="TOOLS · open library"
		aria-label="Open tools library"
		onclick={() => onOpenTools?.()}
	>
		<span class="rail-num">+</span>
		<Plus size={16} />
		{#if toolsOpen}<span class="rail-tick"></span>{/if}
	</button>

	<div class="rail-spacer"></div>

	<a
		class="rail-btn rail-bottom"
		class:active={systemsActive}
		href={hrefFor(SYSTEMS)}
		title="SYSTEMS · host metrics, hardware, processes"
		aria-label="Systems"
		aria-current={systemsActive ? 'page' : undefined}
	>
		<Wrench size={16} />
		{#if systemsActive}<span class="rail-tick"></span>{/if}
	</a>
</nav>

<style>
	.rail-inner {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		height: 100%;
		padding: 0;
	}

	.rail-slot {
		position: relative;
		touch-action: none;
		user-select: none;
		-webkit-user-drag: none;
	}

	.rail-slot--drag {
		opacity: 0.4;
	}

	.rail-slot--over {
		box-shadow: inset 0 2px 0 var(--mk2-accent);
	}

	.rail-btn {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 44px;
		background: transparent;
		border: 0;
		border-bottom: 1px solid var(--mk2-line);
		color: var(--mk2-ink-3);
		cursor: pointer;
		text-decoration: none;
		transition:
			background var(--mk2-mo-1),
			color var(--mk2-mo-1);
	}

	.rail-btn:hover {
		background: var(--mk2-bg-2);
		color: var(--mk2-ink-2);
	}

	.rail-btn.active {
		background: var(--mk2-bg-2);
		color: var(--mk2-accent);
	}

	.rail-btn:focus-visible {
		outline: 1px solid var(--mk2-accent);
		outline-offset: -2px;
	}

	.rail-num {
		position: absolute;
		top: 4px;
		left: 4px;
		font: 500 var(--mk2-fs-1) / 1 var(--mk2-f-mono);
		color: var(--mk2-ink-4);
		letter-spacing: 0.05em;
	}

	.rail-tick {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 2px;
		background: var(--mk2-accent);
	}

	.rail-spacer {
		flex: 1;
	}

	.rail-bottom {
		border-top: 1px solid var(--mk2-line);
		border-bottom: 0;
	}
</style>
