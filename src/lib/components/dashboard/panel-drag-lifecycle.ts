/**
 * Shared resize-drag lifecycle for dashboard panels (`PanelContainer`,
 * `ResizableBottomPanel`).
 *
 * Each panel registers identical global `mousemove`/`mouseup`/`touchmove`/
 * `touchend` listeners on mount and clears the body cursor on destroy. This
 * helper centralises that boilerplate so the panel components only own
 * their own pointer-state and drag-target logic.
 *
 * @module
 */

import { onDestroy, onMount } from 'svelte';

import { browser } from '$app/environment';

export interface PanelDragHandlers {
	onMouseMove: (e: MouseEvent) => void;
	onTouchMove: (e: TouchEvent) => void;
	/** Single handler used for both `mouseup` and `touchend`. */
	onPointerEnd: () => void;
}

/**
 * Wire global pointer event listeners + body-cursor cleanup into the calling
 * component's mount/destroy lifecycle. Must be invoked synchronously from a
 * Svelte component's `<script>` block so `onMount`/`onDestroy` resolve to the
 * right component instance.
 */
export function bindPanelDragListeners(handlers: PanelDragHandlers): void {
	onMount(() => {
		if (!browser) return;
		window.addEventListener('mousemove', handlers.onMouseMove);
		window.addEventListener('mouseup', handlers.onPointerEnd);
		window.addEventListener('touchmove', handlers.onTouchMove);
		window.addEventListener('touchend', handlers.onPointerEnd);

		return () => {
			window.removeEventListener('mousemove', handlers.onMouseMove);
			window.removeEventListener('mouseup', handlers.onPointerEnd);
			window.removeEventListener('touchmove', handlers.onTouchMove);
			window.removeEventListener('touchend', handlers.onPointerEnd);
		};
	});

	onDestroy(() => {
		if (browser) {
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		}
	});
}
