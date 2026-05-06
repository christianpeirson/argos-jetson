import { afterEach,describe, expect, it, vi } from 'vitest';

import {
	_setSpawnImplForTest,
	spawnGnuRadioCompanion,
	spawnWebsockify,
	spawnXtigervnc} from './gnu-radio-vnc-processes';

afterEach(() => {
	_setSpawnImplForTest(null);
	delete globalThis.__argos_gnuradioVnc_state;
});

describe('gnu-radio-vnc-processes', () => {
	it('spawnXtigervnc invokes spawn with display :95 and geometry 1440x900', () => {
		const calls: Array<{ cmd: string; args: string[] }> = [];
		const mockSpawn: unknown = (cmd: string, args: string[]) => {
			calls.push({ cmd, args: args as string[] });
			return { pid: 4242, on: vi.fn(), once: vi.fn(), kill: vi.fn() };
		};
		_setSpawnImplForTest(mockSpawn as Parameters<typeof _setSpawnImplForTest>[0]);

		spawnXtigervnc();

		expect(calls).toHaveLength(1);
		const argv = calls[0].args;
		expect(argv).toContain(':95');
		expect(argv).toContain('-geometry');
		expect(argv).toContain('1440x900');
		expect(argv).toContain('-SecurityTypes');
		expect(argv).toContain('None');
		expect(argv).toContain('-localhost');
	});

	it('spawnGnuRadioCompanion sets DISPLAY=:95 and QT_QPA_PLATFORM=xcb env', () => {
		const calls: Array<Record<string, unknown>> = [];
		const mockSpawn: unknown = (_cmd: string, _args: string[], opts: Record<string, unknown>) => {
			calls.push(opts as Record<string, unknown>);
			return { pid: 4243, on: vi.fn(), once: vi.fn(), kill: vi.fn() };
		};
		_setSpawnImplForTest(mockSpawn as Parameters<typeof _setSpawnImplForTest>[0]);

		spawnGnuRadioCompanion();

		const env = (calls[0].env ?? {}) as Record<string, string>;
		expect(env.DISPLAY).toBe(':95');
		expect(env.QT_QPA_PLATFORM).toBe('xcb');
	});

	it('spawnGnuRadioCompanion appends flowgraph path as positional arg when provided', () => {
		const calls: Array<{ args: string[] }> = [];
		const mockSpawn: unknown = (_cmd: string, args: string[]) => {
			calls.push({ args: args as string[] });
			return { pid: 4244, on: vi.fn(), once: vi.fn(), kill: vi.fn() };
		};
		_setSpawnImplForTest(mockSpawn as Parameters<typeof _setSpawnImplForTest>[0]);

		spawnGnuRadioCompanion('/tmp/argos-grc-demo.grc');

		const argv = calls[0].args;
		expect(argv[argv.length - 1]).toBe('/tmp/argos-grc-demo.grc');
	});

	it('spawnWebsockify bridges 6084 → localhost:5995', () => {
		const calls: Array<{ args: string[] }> = [];
		const mockSpawn: unknown = (_cmd: string, args: string[]) => {
			calls.push({ args: args as string[] });
			return { pid: 4245, on: vi.fn(), once: vi.fn(), kill: vi.fn() };
		};
		_setSpawnImplForTest(mockSpawn as Parameters<typeof _setSpawnImplForTest>[0]);

		spawnWebsockify();

		const argv = calls[0].args;
		expect(argv).toContain('6084');
		expect(argv).toContain('localhost:5995');
	});
});
