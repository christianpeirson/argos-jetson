/**
 * CSS Loading Utilities
 * Helps prevent FOUC (Flash of Unstyled Content) and optimize CSS loading
 */

/**
 * Dynamically loads CSS with preloading support
 * @param href - Path to CSS file
 * @param options - Loading options
 * @returns Promise that resolves when CSS is loaded
 */
/**
 * Adds css-loaded class to body when all stylesheets are ready
 * Should be called from the main layout component's onMount — CSS is already
 * applied at that point, so no polling loop is needed.
 */
export function markCSSLoaded(): void {
	if (typeof window === 'undefined') return;
	// onMount guarantees styles are applied — schedule the class add one rAF
	// later to ensure the class is set after the first paint, not before.
	requestAnimationFrame(() => {
		document.body.classList.add('css-loaded');
	});
}
