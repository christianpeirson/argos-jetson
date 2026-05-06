import { lsState } from './ui.svelte';

export type SystemsTab = 'host' | 'hw' | 'proc' | 'svc' | 'net';

const KNOWN: ReadonlySet<SystemsTab> = new Set(['host', 'hw', 'proc', 'svc', 'net']);

function isSystemsTab(v: unknown): v is SystemsTab {
	return typeof v === 'string' && (KNOWN as ReadonlySet<string>).has(v);
}

export const systemsTabStore = lsState<SystemsTab>('argos.mk2.systems.tab', 'host', isSystemsTab);
