// V3 (NVIDIA UI, :5175) theme store. Owns the <body> data-attributes that
// drive the [data-ui='v3'] token scope in src/app.css. Kept fully separate
// from the Mk II theme state (src/lib/state/ui.svelte.ts) and its
// `argos-theme` localStorage key — V3 persists to `argos-v3-theme` — so the
// two UIs never collide.
//
// C0 (port plumbing): minimal — hydrate / apply / persist. C2 (NVIDIA polish)
// builds the dark/light toggle + accent picker UI on top of the setMode /
// setPalette mutators.

const STORAGE_KEY = 'argos-v3-theme';

export type V3Mode = 'dark' | 'light';

export interface V3ThemeState {
	mode: V3Mode;
	palette: string;
}

const DEFAULTS: V3ThemeState = {
	mode: 'dark',
	palette: 'blue'
};

/** Coerce an untrusted parsed object into a valid V3ThemeState. */
function coerceTheme(parsed: Partial<V3ThemeState>): V3ThemeState {
	return {
		mode: parsed.mode === 'light' ? 'light' : 'dark',
		palette: typeof parsed.palette === 'string' ? parsed.palette : DEFAULTS.palette
	};
}

/** Read persisted V3 theme prefs from localStorage; defaults on any failure. */
function readPersisted(): V3ThemeState {
	if (typeof localStorage === 'undefined') return { ...DEFAULTS };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...DEFAULTS };
		return coerceTheme(JSON.parse(raw) as Partial<V3ThemeState>);
	} catch {
		return { ...DEFAULTS };
	}
}

/**
 * Reactive V3 theme store. A single shared instance is exported below; the
 * V3 route layout calls `hydrate()` on mount.
 */
class V3ThemeStore {
	mode = $state<V3Mode>(DEFAULTS.mode);
	palette = $state<string>(DEFAULTS.palette);

	/** Load persisted prefs and stamp the <body> attributes. Call once on mount. */
	hydrate(): void {
		const persisted = readPersisted();
		this.mode = persisted.mode;
		this.palette = persisted.palette;
		this.apply();
	}

	/** Stamp data-ui / data-mode / data-palette onto <body>. */
	apply(): void {
		if (typeof document === 'undefined') return;
		document.body.dataset.ui = 'v3';
		document.body.dataset.mode = this.mode;
		document.body.dataset.palette = this.palette;
	}

	/** Persist the current prefs to localStorage. */
	persist(): void {
		if (typeof localStorage === 'undefined') return;
		const state: V3ThemeState = { mode: this.mode, palette: this.palette };
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		} catch {
			/* localStorage unavailable (private mode / quota) — non-fatal */
		}
	}

	/** Switch dark/light, then apply + persist. C2 wires this to the toggle UI. */
	setMode(mode: V3Mode): void {
		this.mode = mode;
		this.apply();
		this.persist();
	}

	/** Set the accent palette, then apply + persist. C2 wires this to the picker. */
	setPalette(palette: string): void {
		this.palette = palette;
		this.apply();
		this.persist();
	}
}

export const v3ThemeStore = new V3ThemeStore();
