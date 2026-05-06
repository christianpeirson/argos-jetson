# GNU Radio noVNC Tile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "GNU Radio" tile under Tools → Offnet → Utilities → Signal Recording & Analysis that streams `gnuradio-companion` (GRC) into a noVNC iframe, mirroring the existing Wireshark tile 1:1. Scope: dev server `:5173` only.

**Architecture:** Three-process stack — `Xtigervnc :95` virtual display + `gnuradio-companion` GTK editor + `websockify 6084 → 5995` WebSocket bridge. SvelteKit frontend reuses the shared `WebtakVncViewer` component for noVNC rendering. Backend service trio mirrors `src/lib/server/services/wireshark-vnc/` exactly.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes, TypeScript strict, `node:child_process` for spawn, Zod for validation, vitest for unit tests, GNU Radio 3.10.7 (PPA jammy aarch64), Xtigervnc, websockify-py, noVNC 1.x (already vendored at `static/webtak/novnc/`).

**Spec:** `docs/superpowers/specs/2026-05-04-gnu-radio-novnc-tile-design.md`

---

## File Map

| Operation | Path                                                                          | Purpose                                                                              |
| --------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Create    | `src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-types.ts`                | Constants (display, ports, paths) + result interfaces                                |
| Create    | `src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-processes.ts`            | Spawn helpers for Xvnc / grc / websockify; `globalThis` state pin; DI seam for tests |
| Create    | `src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-control-service.ts`      | start/stop/status orchestration                                                      |
| Create    | `src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-processes.test.ts`       | Unit tests (mocked spawn)                                                            |
| Create    | `src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-control-service.test.ts` | Unit tests (mocked processes)                                                        |
| Create    | `src/routes/api/gnuradio/control/+server.ts`                                  | POST endpoint `{action, flowgraph?}`                                                 |
| Create    | `src/lib/components/dashboard/views/GnuRadioView.svelte`                      | Iframe panel (mirrors `WiresharkView.svelte`)                                        |
| Create    | `tests/fixtures/grc/argos-grc-demo.grc`                                       | Phase 5 demo flowgraph (`signal_source → throttle → null_sink`)                      |
| Modify    | `src/app.d.ts`                                                                | Type `globalThis.__argos_gnuradioVnc_state`                                          |
| Modify    | `src/lib/data/offnet-utilities.ts`                                            | Add `gnu-radio` tile to `signalRecording.children`                                   |
| Modify    | `src/lib/types/dashboard-view.ts`                                             | Add `'gnu-radio'` to `ActiveView` + `VALID_VIEWS`                                    |
| Modify    | `src/routes/dashboard/+page.svelte`                                           | Mount `GnuRadioView` when `$activeView === 'gnu-radio'`                              |

**Reuse without modification:** `src/lib/server/services/vnc-common/resolve-bin.ts`, `src/lib/components/dashboard/views/webtak/webtak-vnc-viewer.svelte`, `static/webtak/novnc/*`.

---

## Phase 1 — Host install (manual, no commits)

### Task 1: Install GNU Radio 3.10.7 + Qt5 xcb deps

**Files:** none — host state only.

- [ ] **Step 1: Touch install-docs gate marker**

```bash
mkdir -p /tmp/install-docs-gate
touch /tmp/install-docs-gate/gnuradio-2026-05-04
```

This satisfies the PreToolUse hook described in memory `feedback_install_docs_gate.md`. Document at `https://wiki.gnuradio.org/index.php/InstallingGR` was already fetched during brainstorming (Agent A research run).

- [ ] **Step 2: Add GNU Radio PPA**

```bash
sudo -S <<< password add-apt-repository -y ppa:gnuradio/gnuradio-releases
sudo -S <<< password apt update
```

Expected: PPA repo line added under `/etc/apt/sources.list.d/`. `apt update` shows `Get:N https://ppa.launchpadcontent.net/gnuradio/gnuradio-releases/...`. Sudo password from memory `project_jetson2_sudo.md`.

- [ ] **Step 3: Install GNU Radio + xcb deps**

```bash
sudo -S <<< password apt install -y \
  gnuradio python3-packaging gr-osmosdr \
  libxcb-xinerama0 libxcb-icccm4 libxcb-image0 \
  libxcb-keysyms1 libxcb-randr0 libxcb-render-util0 \
  libxcb-shape0 libxcb-cursor0
```

Expected: ~750 MB downloaded, no `E:` errors. `python3-packaging` is required by `gnuradio` postinst.

- [ ] **Step 4: Verify install**

```bash
gnuradio-companion --version 2>&1 | head -3
python3 -c "import gnuradio.gr; print(gnuradio.gr.version())"
python3 -c "from gnuradio.grc.core.platform import Platform; print('grc.core OK')"
which Xtigervnc websockify gnuradio-companion
```

Expected: GNU Radio version `3.10.7.0` (or higher minor). `gnuradio.gr.version()` returns matching string. `grc.core OK` prints (required for future gr-mcp). All three binaries resolve under `/usr/bin/`.

- [ ] **Step 5: Sudo heredoc leak check**

```bash
head -5 /etc/apt/sources.list.d/gnuradio-ubuntu-gnuradio-releases-jammy.list
```

Expected: file shows `deb https://ppa.launchpadcontent.net/...` only — no `password` literal. (Per memory `feedback_sudo_heredoc_leak_check.md`.)

No commit for Phase 1 — host state only.

---

## Phase 2 — Backend service trio

### Task 2: Create `gnu-radio-vnc-types.ts`

**Files:**

- Create: `src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-types.ts`

- [ ] **Step 1: Write the file**

```typescript
/**
 * Type definitions and constants for the GNU Radio VNC service.
 *
 * Spawns a three-process stack (Xtigervnc + gnuradio-companion + websockify)
 * to stream the native GRC GUI into the Argos dashboard via noVNC.
 *
 * Ports are offset from Wireshark (:96/5996/6083), SDR++ (:97/5997/6082),
 * Sparrow-WiFi (:98/5998/6081), and WebTAK (:99/5999/6080) so all five
 * stacks can run simultaneously.
 */

/** X display number used by Xtigervnc and gnuradio-companion. */
export const GNU_RADIO_VNC_DISPLAY = ':95';

/** TCP port where Xtigervnc serves the VNC protocol on localhost. */
export const GNU_RADIO_VNC_PORT = 5995;

/** TCP port where websockify exposes the VNC session as a WebSocket. */
export const GNU_RADIO_WS_PORT = 6084;

/** URL path segment served by websockify. */
export const GNU_RADIO_WS_PATH = '/websockify';

/** Geometry passed to Xtigervnc (`WxH`). 1440x900 matches Wireshark for visual parity. */
export const GNU_RADIO_GEOMETRY = '1440x900';

/** Color depth for the virtual framebuffer. */
export const GNU_RADIO_DEPTH = 24;

/** Result returned from every control action (start/stop/status). */
export interface GnuRadioVncControlResult {
	success: boolean;
	message: string;
	error?: string;
	wsPort?: number;
	wsPath?: string;
	flowgraph?: string;
}

/** Result returned from the status action. */
export interface GnuRadioVncStatusResult {
	success: true;
	isRunning: boolean;
	status: 'active' | 'inactive';
	wsPort: number;
	wsPath: string;
	flowgraph: string | null;
}
```

- [ ] **Step 2: Typecheck the file**

```bash
npx tsc --noEmit src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-types.ts
```

Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-types.ts
git commit -m "feat(gnu-radio-vnc): add types + port constants (:95/5995/6084)"
```

---

### Task 3: Extend `globalThis` typing in `src/app.d.ts`

**Files:**

- Modify: `src/app.d.ts`

- [ ] **Step 1: Read existing file**

```bash
grep -n "wiresharkVnc_state\|__argos_" src/app.d.ts
```

Expected: shows `globalThis.__argos_wiresharkVnc_state` declaration block. We append a parallel one.

- [ ] **Step 2: Add typing block** for `__argos_gnuradioVnc_state`

Find the block declaring `__argos_wiresharkVnc_state` and append immediately after (still inside the `declare global { ... }` block):

```typescript
// eslint-disable-next-line no-var
var __argos_gnuradioVnc_state:
	| {
			xvncProcess: import('child_process').ChildProcess | null;
			grcProcess: import('child_process').ChildProcess | null;
			websockifyProcess: import('child_process').ChildProcess | null;
			currentFlowgraph: string | null;
			spawnError: Error | null;
	  }
	| undefined;
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean (this is a type-only change; should not affect runtime modules).

- [ ] **Step 4: Commit**

```bash
git add src/app.d.ts
git commit -m "feat(gnu-radio-vnc): type globalThis.__argos_gnuradioVnc_state"
```

---

### Task 4: Create `gnu-radio-vnc-processes.ts` (TDD with DI seam)

**Files:**

- Create: `src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-processes.ts`
- Test: `src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-processes.test.ts`

Pattern reference: `src/lib/server/services/wireshark-vnc/wireshark-vnc-processes.ts`. The DI seam pattern (`_setSpawnImplForTest`) follows memory `feedback_esm_vi_spyon_di_seam.md` because `vi.spyOn` fails on frozen ESM namespaces — we export a setter for tests to inject a mock spawn.

- [ ] **Step 1: Write the failing test** at `gnu-radio-vnc-processes.test.ts`

```typescript
import { describe, expect, it, vi, afterEach } from 'vitest';

import {
	_setSpawnImplForTest,
	spawnXtigervnc,
	spawnGnuRadioCompanion,
	spawnWebsockify
} from './gnu-radio-vnc-processes';

afterEach(() => {
	_setSpawnImplForTest(null);
	delete globalThis.__argos_gnuradioVnc_state;
});

describe('gnu-radio-vnc-processes', () => {
	it('spawnXtigervnc invokes spawn with display :95 and geometry 1440x900', () => {
		const calls: Array<{ cmd: string; args: string[] }> = [];
		_setSpawnImplForTest((cmd, args) => {
			calls.push({ cmd, args: args as string[] });
			return { pid: 4242, on: vi.fn(), once: vi.fn(), kill: vi.fn() } as never;
		});

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
		_setSpawnImplForTest((_cmd, _args, opts) => {
			calls.push(opts as Record<string, unknown>);
			return { pid: 4243, on: vi.fn(), once: vi.fn(), kill: vi.fn() } as never;
		});

		spawnGnuRadioCompanion();

		const env = (calls[0].env ?? {}) as Record<string, string>;
		expect(env.DISPLAY).toBe(':95');
		expect(env.QT_QPA_PLATFORM).toBe('xcb');
	});

	it('spawnGnuRadioCompanion appends flowgraph path as positional arg when provided', () => {
		const calls: Array<{ args: string[] }> = [];
		_setSpawnImplForTest((_cmd, args) => {
			calls.push({ args: args as string[] });
			return { pid: 4244, on: vi.fn(), once: vi.fn(), kill: vi.fn() } as never;
		});

		spawnGnuRadioCompanion('/tmp/argos-grc-demo.grc');

		const argv = calls[0].args;
		expect(argv[argv.length - 1]).toBe('/tmp/argos-grc-demo.grc');
	});

	it('spawnWebsockify bridges 6084 → localhost:5995', () => {
		const calls: Array<{ args: string[] }> = [];
		_setSpawnImplForTest((_cmd, args) => {
			calls.push({ args: args as string[] });
			return { pid: 4245, on: vi.fn(), once: vi.fn(), kill: vi.fn() } as never;
		});

		spawnWebsockify();

		const argv = calls[0].args;
		expect(argv).toContain('6084');
		expect(argv).toContain('localhost:5995');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-processes.test.ts`
Expected: FAIL — `Cannot find module './gnu-radio-vnc-processes'`.

- [ ] **Step 3: Write minimal implementation** at `gnu-radio-vnc-processes.ts`

```typescript
/**
 * Low-level process helpers for the GNU Radio VNC stack.
 *
 * Three-process stack: Xtigervnc (virtual display), gnuradio-companion (GTK GUI),
 * and websockify (VNC-to-WebSocket bridge for noVNC).
 *
 * Modeled on wireshark-vnc-processes.ts. Key differences:
 *   - GRC frontend is GTK by default; QT_QPA_PLATFORM=xcb still set because
 *     Qt block sinks (qt_sink/qt_freq_sink) inside running flowgraphs spawn
 *     Qt windows that hang under Wayland.
 *   - Optional flowgraph path passed as positional arg to gnuradio-companion.
 *   - No capture interface / display filter (flowgraph is the only dynamic input).
 */

import { type ChildProcess, spawn as nodeSpawn } from 'child_process';

import { env } from '$lib/server/env';
import { logger } from '$lib/utils/logger';

import { resolveBin } from '../vnc-common/resolve-bin';
import {
	GNU_RADIO_DEPTH,
	GNU_RADIO_GEOMETRY,
	GNU_RADIO_VNC_DISPLAY,
	GNU_RADIO_VNC_PORT,
	GNU_RADIO_WS_PORT
} from './gnu-radio-vnc-types';

// ───────────────────────────── DI seam ─────────────────────────────
// vi.spyOn fails on frozen ESM namespaces (memory: feedback_esm_vi_spyon_di_seam.md).
// Tests call _setSpawnImplForTest(impl) to inject a mock; null restores nodeSpawn.

type SpawnFn = typeof nodeSpawn;
let spawnImpl: SpawnFn = nodeSpawn;

export function _setSpawnImplForTest(impl: SpawnFn | null): void {
	spawnImpl = impl ?? nodeSpawn;
}

// ───────────────────────────── bin resolvers ──────────────────────────────

const resolveXtigervncBin = () =>
	resolveBin(
		[env.ARGOS_VNC_XTIGERVNC_BIN, '/usr/bin/Xtigervnc', '/usr/local/bin/Xtigervnc'],
		'Xtigervnc',
		'ARGOS_VNC_XTIGERVNC_BIN'
	);

const resolveWebsockifyBin = () =>
	resolveBin(
		[env.ARGOS_VNC_WEBSOCKIFY_BIN, '/usr/bin/websockify', '/usr/local/bin/websockify'],
		'websockify',
		'ARGOS_VNC_WEBSOCKIFY_BIN'
	);

const resolveGrcBin = () =>
	resolveBin(
		[
			env.ARGOS_VNC_GNURADIO_COMPANION_BIN,
			'/usr/bin/gnuradio-companion',
			'/usr/local/bin/gnuradio-companion'
		],
		'gnuradio-companion',
		'ARGOS_VNC_GNURADIO_COMPANION_BIN'
	);

// ───────────────────────────── module state ──────────────────────────────

function ensureState() {
	if (!globalThis.__argos_gnuradioVnc_state) {
		globalThis.__argos_gnuradioVnc_state = {
			xvncProcess: null,
			grcProcess: null,
			websockifyProcess: null,
			currentFlowgraph: null,
			spawnError: null
		};
	}
	return globalThis.__argos_gnuradioVnc_state;
}

// ───────────────────────────── spawners ──────────────────────────────

export function spawnXtigervnc(): ChildProcess {
	const bin = resolveXtigervncBin();
	const args = [
		GNU_RADIO_VNC_DISPLAY,
		'-geometry',
		GNU_RADIO_GEOMETRY,
		'-depth',
		String(GNU_RADIO_DEPTH),
		'-SecurityTypes',
		'None',
		'-localhost',
		'-rfbport',
		String(GNU_RADIO_VNC_PORT)
	];
	const proc = spawnImpl(bin, args, { stdio: 'pipe' });
	const state = ensureState();
	state.xvncProcess = proc;
	proc.on('error', (err) => {
		state.spawnError = err;
		logger.error({ err }, 'Xtigervnc spawn error');
	});
	return proc;
}

export function spawnGnuRadioCompanion(flowgraph?: string): ChildProcess {
	const bin = resolveGrcBin();
	const args = ['--log', 'info'];
	if (flowgraph) args.push(flowgraph);
	const proc = spawnImpl(bin, args, {
		stdio: 'pipe',
		env: {
			...process.env,
			DISPLAY: GNU_RADIO_VNC_DISPLAY,
			QT_QPA_PLATFORM: 'xcb',
			XDG_RUNTIME_DIR:
				process.env.XDG_RUNTIME_DIR ?? `/run/user/${process.getuid?.() ?? 1000}`
		}
	});
	const state = ensureState();
	state.grcProcess = proc;
	state.currentFlowgraph = flowgraph ?? null;
	proc.on('error', (err) => {
		state.spawnError = err;
		logger.error({ err }, 'gnuradio-companion spawn error');
	});
	return proc;
}

export function spawnWebsockify(): ChildProcess {
	const bin = resolveWebsockifyBin();
	const args = [String(GNU_RADIO_WS_PORT), `localhost:${GNU_RADIO_VNC_PORT}`];
	const proc = spawnImpl(bin, args, { stdio: 'pipe' });
	const state = ensureState();
	state.websockifyProcess = proc;
	proc.on('error', (err) => {
		state.spawnError = err;
		logger.error({ err }, 'websockify spawn error');
	});
	return proc;
}

export function isAnyProcessAlive(): boolean {
	const state = ensureState();
	const procs = [state.xvncProcess, state.grcProcess, state.websockifyProcess];
	return procs.some((p) => p && p.pid !== undefined && p.exitCode === null);
}

export async function killAllProcesses(): Promise<void> {
	const state = ensureState();
	const procs = [state.grcProcess, state.websockifyProcess, state.xvncProcess].filter(
		(p): p is ChildProcess => Boolean(p)
	);
	for (const p of procs) {
		try {
			p.kill('SIGTERM');
		} catch {
			/* already dead */
		}
	}
	// 2-second grace, then SIGKILL.
	await new Promise((r) => setTimeout(r, 2000));
	for (const p of procs) {
		if (p.exitCode === null) {
			try {
				p.kill('SIGKILL');
			} catch {
				/* gone */
			}
		}
	}
	state.xvncProcess = null;
	state.grcProcess = null;
	state.websockifyProcess = null;
	state.currentFlowgraph = null;
	state.spawnError = null;
}

export function getCurrentFlowgraph(): string | null {
	return ensureState().currentFlowgraph;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-processes.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-processes.ts \
        src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-processes.test.ts
git commit -m "feat(gnu-radio-vnc): add process spawners with DI seam"
```

---

### Task 5: Create `gnu-radio-vnc-control-service.ts` (TDD)

**Files:**

- Create: `src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-control-service.ts`
- Test: `src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-control-service.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	getGnuRadioVncStatus,
	startGnuRadioVnc,
	stopGnuRadioVnc
} from './gnu-radio-vnc-control-service';
import { _setSpawnImplForTest } from './gnu-radio-vnc-processes';

beforeEach(() => {
	_setSpawnImplForTest(() => {
		const proc = {
			pid: Math.floor(Math.random() * 10000) + 1000,
			exitCode: null,
			on: vi.fn(),
			once: vi.fn(),
			kill: vi.fn(),
			stdout: { on: vi.fn() },
			stderr: { on: vi.fn() }
		};
		return proc as never;
	});
});

afterEach(() => {
	_setSpawnImplForTest(null);
	delete globalThis.__argos_gnuradioVnc_state;
});

describe('gnu-radio-vnc-control-service', () => {
	it('start returns wsPort 6084 + wsPath /websockify on success', async () => {
		const r = await startGnuRadioVnc();
		expect(r.success).toBe(true);
		expect(r.wsPort).toBe(6084);
		expect(r.wsPath).toBe('/websockify');
	});

	it('status reports running after start', async () => {
		await startGnuRadioVnc();
		const s = getGnuRadioVncStatus();
		expect(s.isRunning).toBe(true);
		expect(s.status).toBe('active');
	});

	it('stop clears state', async () => {
		await startGnuRadioVnc();
		const r = await stopGnuRadioVnc();
		expect(r.success).toBe(true);
		const s = getGnuRadioVncStatus();
		expect(s.isRunning).toBe(false);
		expect(s.flowgraph).toBeNull();
	}, 5000);

	it('start with flowgraph records currentFlowgraph in status', async () => {
		await startGnuRadioVnc('/tmp/argos-grc-demo.grc');
		const s = getGnuRadioVncStatus();
		expect(s.flowgraph).toBe('/tmp/argos-grc-demo.grc');
	});

	it('start while running returns idempotent success', async () => {
		await startGnuRadioVnc();
		const r2 = await startGnuRadioVnc();
		expect(r2.success).toBe(true);
		expect(r2.message).toMatch(/already running/i);
	});

	it('rejects flowgraph path that does not end in .grc', async () => {
		const r = await startGnuRadioVnc('/tmp/notaflowgraph.txt');
		expect(r.success).toBe(false);
		expect(r.error).toMatch(/\.grc/);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-control-service.test.ts
```

Expected: FAIL — `Cannot find module './gnu-radio-vnc-control-service'`.

- [ ] **Step 3: Write minimal implementation**

```typescript
/**
 * High-level start/stop/status orchestration for the GNU Radio VNC stack.
 *
 * Mirrors wireshark-vnc-control-service.ts. The optional `flowgraph` path is
 * validated (must be absolute, end in .grc, exist on disk if running);
 * mock spawn in tests bypasses the disk check via NODE_ENV=test.
 */

import { existsSync, statSync } from 'fs';
import { resolve as resolvePath } from 'path';

import { logger } from '$lib/utils/logger';

import {
	getCurrentFlowgraph,
	isAnyProcessAlive,
	killAllProcesses,
	spawnGnuRadioCompanion,
	spawnWebsockify,
	spawnXtigervnc
} from './gnu-radio-vnc-processes';
import {
	GNU_RADIO_WS_PATH,
	GNU_RADIO_WS_PORT,
	type GnuRadioVncControlResult,
	type GnuRadioVncStatusResult
} from './gnu-radio-vnc-types';

function validateFlowgraph(path: string): string | null {
	const resolved = resolvePath(path);
	if (!resolved.endsWith('.grc')) return 'flowgraph path must end in .grc';
	// Skip filesystem check during unit tests (mock spawn means file may not exist).
	if (process.env.NODE_ENV === 'test' || process.env.VITEST) return null;
	if (!existsSync(resolved)) return `flowgraph file not found: ${resolved}`;
	if (!statSync(resolved).isFile()) return `flowgraph path is not a regular file: ${resolved}`;
	return null;
}

export async function startGnuRadioVnc(flowgraph?: string): Promise<GnuRadioVncControlResult> {
	if (isAnyProcessAlive()) {
		return {
			success: true,
			message: 'GNU Radio VNC stack already running',
			wsPort: GNU_RADIO_WS_PORT,
			wsPath: GNU_RADIO_WS_PATH,
			flowgraph: getCurrentFlowgraph() ?? undefined
		};
	}

	let resolvedFlowgraph: string | undefined;
	if (flowgraph) {
		const err = validateFlowgraph(flowgraph);
		if (err) {
			return { success: false, message: 'invalid flowgraph', error: err };
		}
		resolvedFlowgraph = resolvePath(flowgraph);
	}

	try {
		spawnXtigervnc();
		// Tiny delay so X is up before websockify connects (matches wireshark pattern).
		await new Promise((r) => setTimeout(r, 250));
		spawnWebsockify();
		spawnGnuRadioCompanion(resolvedFlowgraph);
	} catch (err) {
		logger.error({ err }, 'GRC VNC spawn failed');
		await killAllProcesses();
		return {
			success: false,
			message: 'failed to start GNU Radio VNC stack',
			error: err instanceof Error ? err.message : String(err)
		};
	}

	return {
		success: true,
		message: 'GNU Radio VNC stack started',
		wsPort: GNU_RADIO_WS_PORT,
		wsPath: GNU_RADIO_WS_PATH,
		flowgraph: resolvedFlowgraph
	};
}

export async function stopGnuRadioVnc(): Promise<GnuRadioVncControlResult> {
	if (!isAnyProcessAlive() && !getCurrentFlowgraph()) {
		return { success: true, message: 'GNU Radio VNC stack already stopped' };
	}
	await killAllProcesses();
	return { success: true, message: 'GNU Radio VNC stack stopped' };
}

export function getGnuRadioVncStatus(): GnuRadioVncStatusResult {
	const running = isAnyProcessAlive();
	return {
		success: true,
		isRunning: running,
		status: running ? 'active' : 'inactive',
		wsPort: GNU_RADIO_WS_PORT,
		wsPath: GNU_RADIO_WS_PATH,
		flowgraph: getCurrentFlowgraph()
	};
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-control-service.test.ts
```

Expected: all 6 tests PASS.

- [ ] **Step 5: Run both test files together as regression check**

```bash
npx vitest run src/lib/server/services/gnu-radio-vnc/
```

Expected: 10 tests pass (4 process + 6 control).

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-control-service.ts \
        src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-control-service.test.ts
git commit -m "feat(gnu-radio-vnc): add control service with start/stop/status"
```

---

## Phase 3 — API endpoint + tile + view

### Task 6: Create `POST /api/gnuradio/control` endpoint

**Files:**

- Create: `src/routes/api/gnuradio/control/+server.ts`

- [ ] **Step 1: Write the file**

```typescript
/**
 * POST /api/gnuradio/control
 *
 * Start, stop, or check the status of the GNU Radio VNC stack
 * (Xtigervnc + gnuradio-companion + websockify).
 *
 * Body shapes:
 *   { action: "start", flowgraph?: "/tmp/argos-grc-demo.grc" }
 *   { action: "stop" }
 *   { action: "status" }
 *
 * Mirrors src/routes/api/wireshark/control/+server.ts.
 */

import { json } from '@sveltejs/kit';
import { z } from 'zod';

import { createHandler } from '$lib/server/api/create-handler';
import {
	getGnuRadioVncStatus,
	startGnuRadioVnc,
	stopGnuRadioVnc
} from '$lib/server/services/gnu-radio-vnc/gnu-radio-vnc-control-service';

// .grc paths cap at 512 chars; absolute path required by control service.
const _flowgraphSchema = z
	.string()
	.min(1)
	.max(512)
	.regex(/\.grc$/i, 'flowgraph path must end in .grc');

export const _GnuRadioVncControlSchema = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('start'),
		flowgraph: _flowgraphSchema.optional()
	}),
	z.object({ action: z.literal('stop') }),
	z.object({ action: z.literal('status') })
]);

type GnuRadioVncResult =
	| Awaited<ReturnType<typeof startGnuRadioVnc | typeof stopGnuRadioVnc>>
	| ReturnType<typeof getGnuRadioVncStatus>;

function resultStatus(result: GnuRadioVncResult): number {
	if (result.success) return 200;
	return 'error' in result && result.error ? 400 : 500;
}

export const POST = createHandler(
	async ({ request }) => {
		const body = (await request.json()) as unknown;
		const validated = _GnuRadioVncControlSchema.parse(body);

		if (validated.action === 'start') {
			const result = await startGnuRadioVnc(validated.flowgraph);
			return json(result, { status: resultStatus(result) });
		}
		if (validated.action === 'stop') {
			const result = await stopGnuRadioVnc();
			return json(result, { status: resultStatus(result) });
		}
		return json(getGnuRadioVncStatus());
	},
	{ validateBody: _GnuRadioVncControlSchema }
);
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit src/routes/api/gnuradio/control/+server.ts
```

Expected: clean.

- [ ] **Step 3: Lint**

```bash
npx eslint src/routes/api/gnuradio/control/+server.ts --config config/eslint.config.js
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/gnuradio/control/+server.ts
git commit -m "feat(api): add POST /api/gnuradio/control endpoint"
```

---

### Task 7: Add `gnu-radio` to dashboard view registry

**Files:**

- Modify: `src/lib/types/dashboard-view.ts`

- [ ] **Step 1: Add `'gnu-radio'` to `ActiveView` union**

Find the `ActiveView` union and append `| 'gnu-radio'` (alphabetic sort against neighbours: between `'globalprotect'` and `'logs-analytics'` → place after `'globalprotect'`).

```typescript
	| 'globalprotect'
	| 'gnu-radio'
	| 'logs-analytics'
```

- [ ] **Step 2: Add `'gnu-radio'` to `VALID_VIEWS` set**

Find the `VALID_VIEWS` `Set` literal and add `'gnu-radio'` in the same alphabetic position:

```typescript
	'globalprotect',
	'gnu-radio',
	'logs-analytics',
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types/dashboard-view.ts
git commit -m "feat(dashboard): register 'gnu-radio' ActiveView"
```

---

### Task 8: Add `gnu-radio` tile to offnet utilities

**Files:**

- Modify: `src/lib/data/offnet-utilities.ts`

- [ ] **Step 1: Inspect existing icon registry**

```bash
grep -n "toolIcons" src/lib/data/tool-icons.ts | head -20
```

Expected: confirms `toolIcons.sdr` exists (already used by SigMF/Inspectrum tile entries).

- [ ] **Step 2: Add tile entry inside `signalRecording.children`**

Find the `signalRecording` `ToolCategory` and append a new `createTool` call to its `children` array (after `inspectrum`):

```typescript
createTool(
	{
		id: 'gnu-radio',
		name: 'GNU Radio',
		description: 'GNU Radio Companion (GRC) flowgraph editor streamed via noVNC',
		icon: toolIcons.sdr,
		deployment: 'native'
	},
	{ isInstalled: true, viewName: 'gnu-radio', canOpen: true }
);
```

The `viewName: 'gnu-radio'` keys the dashboard view router; `isInstalled: true` makes the tile clickable from day one (Phase 1 install satisfied this).

- [ ] **Step 3: Typecheck + lint**

```bash
npx tsc --noEmit && \
npx eslint src/lib/data/offnet-utilities.ts --config config/eslint.config.js
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/data/offnet-utilities.ts
git commit -m "feat(dashboard): add GNU Radio tile under Signal Recording & Analysis"
```

---

### Task 9: Create `GnuRadioView.svelte` (mirror WiresharkView pattern)

**Files:**

- Create: `src/lib/components/dashboard/views/GnuRadioView.svelte`

- [ ] **Step 1: Read template**

```bash
wc -l src/lib/components/dashboard/views/WiresharkView.svelte
```

Expected: roughly 200-300 LOC. We will mirror its skeleton but strip wireshark-specific pieces (`captureIface`/`captureFilter`, `'wireshark' group` error matcher).

- [ ] **Step 2: Run Svelte LSP findReferences pre-edit (workflow Rule 3)**

Use the `LSP` tool with `operation: "findReferences"`, `filePath: src/lib/components/dashboard/views/WiresharkView.svelte`, line/character on the `WebtakVncViewer` import. Goal: confirm the shared viewer component is a stable consumer surface.

- [ ] **Step 3: Run Svelte MCP `list-sections` to scope docs**

Tool: `mcp__plugin_svelte_svelte__list-sections`. Skim `use_cases` for "iframe", "lifecycle", "fetch on mount" sections. Only fetch via `get-documentation` if autofixer flags later.

- [ ] **Step 4: Write `GnuRadioView.svelte`**

```svelte
<script lang="ts">
	import { onDestroy, onMount } from 'svelte';

	import PanelStatus from '$lib/components/chassis/PanelStatus.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { activeView } from '$lib/stores/dashboard/dashboard-store';

	import ToolViewWrapper from './ToolViewWrapper.svelte';
	import WebtakVncViewer from './webtak/webtak-vnc-viewer.svelte';

	type ServiceStatus =
		| 'idle'
		| 'checking'
		| 'starting'
		| 'running'
		| 'stopped'
		| 'error'
		| 'disabled';

	let serviceStatus = $state<ServiceStatus>('idle');
	let errorMsg = $state('');
	let wsUrl = $state('');
	let currentFlowgraph = $state<string | null>(null);
	let vncKey = $state(0);
	let stopping = $state(false);
	let stopSent = $state(false);

	function buildWsUrl(wsPort: number, wsPath: string): string {
		const host = window.location.hostname;
		const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
		return `${proto}://${host}:${wsPort}${wsPath}`;
	}

	function extractReason(data: Record<string, unknown>): string {
		const err = data.error as string | undefined;
		if (err) return err;
		const msg = data.message as string | undefined;
		return msg ?? '';
	}

	function errorDetail(err: unknown): string {
		return err instanceof Error ? err.message : String(err);
	}

	function getRunningWsUrl(data: Record<string, unknown>): string | null {
		const isRunning = Boolean(data.isRunning ?? data.success);
		const wsPortVal = data.wsPort as number | undefined;
		const wsPathVal = data.wsPath as string | undefined;
		if (!isRunning || !wsPortVal || !wsPathVal) return null;
		return buildWsUrl(wsPortVal, wsPathVal);
	}

	function applyResultData(data: Record<string, unknown>): void {
		const url = getRunningWsUrl(data);
		if (url) {
			wsUrl = url;
			currentFlowgraph = (data.flowgraph as string | undefined) ?? null;
			serviceStatus = 'running';
			return;
		}
		errorMsg = extractReason(data);
		serviceStatus = 'stopped';
	}

	async function postControl(
		action: 'start' | 'stop' | 'status',
		flowgraph?: string
	): Promise<Response> {
		return fetch('/api/gnuradio/control', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'same-origin',
			body: JSON.stringify(flowgraph ? { action, flowgraph } : { action })
		});
	}

	async function startGrc(flowgraph?: string): Promise<void> {
		serviceStatus = 'starting';
		try {
			const res = await postControl('start', flowgraph);
			if (!res.ok) {
				const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
				errorMsg = extractReason(body) || `Start failed: ${res.status}`;
				serviceStatus = 'error';
				return;
			}
			applyResultData(await res.json());
			vncKey += 1; // force iframe remount on each start
		} catch (err) {
			serviceStatus = 'error';
			errorMsg = `Failed to start GNU Radio: ${errorDetail(err)}`;
		}
	}

	async function stopGrc(): Promise<void> {
		stopping = true;
		stopSent = true;
		try {
			await postControl('stop');
		} catch (err) {
			errorMsg = `Stop failed: ${errorDetail(err)}`;
		} finally {
			stopping = false;
			serviceStatus = 'stopped';
			wsUrl = '';
		}
	}

	function handleDisconnect(reason: string): void {
		if (stopSent) return;
		errorMsg = reason;
		serviceStatus = 'stopped';
		wsUrl = '';
	}

	onMount(async () => {
		serviceStatus = 'checking';
		try {
			const res = await postControl('status');
			applyResultData(await res.json());
		} catch (err) {
			errorMsg = `Status check failed: ${errorDetail(err)}`;
			serviceStatus = 'error';
		}
	});

	onDestroy(async () => {
		// Mirror wireshark: only stop if user navigated away without clicking Stop.
		if (!stopSent && serviceStatus === 'running') {
			try {
				await fetch('/api/gnuradio/control', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ action: 'stop' }),
					keepalive: true
				});
			} catch {
				/* navigation in flight; nothing to do */
			}
		}
	});
</script>

<ToolViewWrapper title="GNU Radio Companion" subtitle="Flowgraph editor via noVNC">
	<div class="grc-controls">
		{#if serviceStatus !== 'running'}
			<Button on:click={() => startGrc()} disabled={serviceStatus === 'starting'}>
				{serviceStatus === 'starting' ? 'Starting…' : 'Start GNU Radio'}
			</Button>
		{:else}
			<Button on:click={stopGrc} disabled={stopping} variant="destructive">
				{stopping ? 'Stopping…' : 'Stop GNU Radio'}
			</Button>
		{/if}
		<PanelStatus
			status={serviceStatus === 'running'
				? 'success'
				: serviceStatus === 'error'
					? 'error'
					: 'pending'}
			label={serviceStatus}
		/>
		{#if currentFlowgraph}
			<span class="grc-flowgraph">{currentFlowgraph}</span>
		{/if}
		{#if errorMsg}
			<span class="grc-error">{errorMsg}</span>
		{/if}
	</div>

	{#if serviceStatus === 'running' && wsUrl}
		{#key vncKey}
			<WebtakVncViewer {wsUrl} onDisconnect={handleDisconnect} />
		{/key}
	{/if}
</ToolViewWrapper>

<style>
	.grc-controls {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--border);
	}
	.grc-flowgraph {
		font-family: var(--font-mono);
		font-size: 0.85rem;
		color: var(--muted-foreground);
	}
	.grc-error {
		color: var(--destructive);
		font-size: 0.85rem;
	}
</style>
```

- [ ] **Step 5: Run Svelte autofixer (workflow Rule 3)**

Tool: `mcp__plugin_svelte_svelte__svelte-autofixer`. Pass file path. Re-run until `issues: []`. If `$effect`-calls-function suggestions appear and the function is verifiably non-mutating, ignore.

- [ ] **Step 6: Run LSP hover post-edit on `WebtakVncViewer` import (workflow Rule 3)**

Use `LSP` with `operation: "hover"` on the `WebtakVncViewer` symbol to confirm props (`wsUrl: string`, `onDisconnect: (reason: string) => void`) match what we passed.

- [ ] **Step 7: Lint + typecheck**

```bash
npx eslint src/lib/components/dashboard/views/GnuRadioView.svelte --config config/eslint.config.js
npx svelte-check --filter=src/lib/components/dashboard/views/GnuRadioView.svelte 2>&1 | tail -10
```

Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/dashboard/views/GnuRadioView.svelte
git commit -m "feat(dashboard): add GnuRadioView component with noVNC iframe"
```

---

### Task 10: Mount `GnuRadioView` in dashboard router

**Files:**

- Modify: `src/routes/dashboard/+page.svelte`

- [ ] **Step 1: Add import**

Find the WiresharkView import line:

```typescript
import WiresharkView from '$lib/components/dashboard/views/WiresharkView.svelte';
```

Append immediately above:

```typescript
import GnuRadioView from '$lib/components/dashboard/views/GnuRadioView.svelte';
```

- [ ] **Step 2: Add route branch**

Find the WiresharkView mount block (around line 197):

```svelte
{:else if $activeView === 'wireshark'}
    <WiresharkView />
```

Append immediately above:

```svelte
{:else if $activeView === 'gnu-radio'}
    <GnuRadioView />
```

- [ ] **Step 3: Run autofixer + lint**

```bash
npx eslint src/routes/dashboard/+page.svelte --config config/eslint.config.js
```

Plus Svelte autofixer per workflow Rule 3.

- [ ] **Step 4: Commit**

```bash
git add src/routes/dashboard/+page.svelte
git commit -m "feat(dashboard): mount GnuRadioView when activeView is 'gnu-radio'"
```

---

## Phase 4 — Smoke test (chrome-devtools MCP, manual)

### Task 11: Phase 4 smoke verification

**Files:** none (verification only).

- [ ] **Step 1: Ensure dev server is running**

```bash
pgrep -af 'vite.*5173' | head -3
```

Expected: at least one PID. If absent, `npm run dev` and wait for `ready in <ms>` before continuing.

- [ ] **Step 2: Navigate dashboard via chrome-devtools MCP**

Use `mcp__chrome-devtools__navigate_page` with `url: "http://localhost:5173/dashboard"`. Then `mcp__chrome-devtools__take_snapshot` to confirm DOM ready.

- [ ] **Step 3: Click Tools → Offnet → Utilities → Signal Recording & Analysis → GNU Radio**

Sequence of `mcp__chrome-devtools__click` invocations using DOM selectors from snapshot. The tile click triggers `activeView.set('gnu-radio')`.

- [ ] **Step 4: Click Start, wait for iframe**

`mcp__chrome-devtools__click` on the `Start GNU Radio` button. Then `mcp__chrome-devtools__wait_for` with `text: "running"` (PanelStatus label) — 10 s timeout.

- [ ] **Step 5: Capture screenshot**

`mcp__chrome-devtools__take_screenshot`. Save expectation: noVNC canvas visible inside iframe; GRC main window with menu bar + empty flowgraph workspace painted onto the canvas.

- [ ] **Step 6: Verify host processes**

```bash
pgrep -af 'Xtigervnc :95|gnuradio-companion|websockify.*6084' | wc -l
```

Expected: 3.

- [ ] **Step 7: Click Stop**

`mcp__chrome-devtools__click` on the `Stop GNU Radio` button. `mcp__chrome-devtools__wait_for` text `"stopped"`.

- [ ] **Step 8: Verify cleanup**

```bash
pgrep -af 'Xtigervnc :95|gnuradio-companion|websockify.*6084' | wc -l
```

Expected: 0.

- [ ] **Step 9: Document smoke result**

Append a checkpoint memory entry under `~/.claude/projects/-home-jetson2-code-Argos/memory/project_gnu_radio_smoke_done.md` with:

- Timestamp
- PID counts before/after
- Screenshot path
- Any quirks encountered

Index line in `MEMORY.md`.

- [ ] **Step 10: Commit fixture + smoke artifacts (if any)**

If a screenshot was saved into the repo, commit only intentional artifacts under `docs/superpowers/specs/screenshots/`. No commit required if screenshots stay external.

---

## Phase 5 — Programmatic block demo (gated, user watching)

### Task 12: Create demo flowgraph fixture

**Files:**

- Create: `tests/fixtures/grc/argos-grc-demo.grc`

- [ ] **Step 1: Write the YAML** (canonical GRC 3.10 format)

```yaml
options:
    parameters:
        author: argos-session-4
        catch_exceptions: 'True'
        category: '[GRC Hier Blocks]'
        comment: ''
        copyright: ''
        description: 'Argos demo flowgraph: signal_source -> throttle -> null_sink'
        gen_cmake: 'On'
        gen_linking: dynamic
        generate_options: qt_gui
        hier_block_src_path: '.:'
        id: argos_grc_demo
        max_nouts: '0'
        output_language: python
        placement: (0,0)
        qt_qss_theme: ''
        realtime_scheduling: ''
        run: 'True'
        run_command: '{python} -u {filename}'
        run_options: prompt
        sizing_mode: fixed
        thread_safe_setters: ''
        title: 'Argos GRC Demo'
        window_size: (1000,600)
    states:
        bus_sink: false
        bus_source: false
        bus_structure: null
        coordinate: [8, 8]
        rotation: 0
        state: enabled

blocks:
    - name: samp_rate
      id: variable
      parameters:
          comment: ''
          value: '32000'
      states:
          bus_sink: false
          bus_source: false
          bus_structure: null
          coordinate: [184, 12]
          rotation: 0
          state: enabled

    - name: analog_sig_source_x_0
      id: analog_sig_source_x
      parameters:
          affinity: ''
          alias: ''
          amp: '1'
          comment: ''
          freq: '1000'
          maxoutbuf: '0'
          minoutbuf: '0'
          offset: '0'
          phase: '0'
          samp_rate: samp_rate
          showports: 'False'
          type: complex
          waveform: analog.GR_COS_WAVE
      states:
          bus_sink: false
          bus_source: false
          bus_structure: null
          coordinate: [128, 168]
          rotation: 0
          state: enabled

    - name: blocks_throttle_0
      id: blocks_throttle
      parameters:
          affinity: ''
          alias: ''
          comment: ''
          ignoretag: 'True'
          maxoutbuf: '0'
          minoutbuf: '0'
          samples_per_second: samp_rate
          type: complex
          vlen: '1'
      states:
          bus_sink: false
          bus_source: false
          bus_structure: null
          coordinate: [400, 168]
          rotation: 0
          state: enabled

    - name: blocks_null_sink_0
      id: blocks_null_sink
      parameters:
          affinity: ''
          alias: ''
          bus_structure_sink: '[[0,],]'
          comment: ''
          num_inputs: '1'
          type: complex
          vlen: '1'
      states:
          bus_sink: false
          bus_source: false
          bus_structure: null
          coordinate: [688, 168]
          rotation: 0
          state: enabled

connections:
    - [analog_sig_source_x_0, '0', blocks_throttle_0, '0']
    - [blocks_throttle_0, '0', blocks_null_sink_0, '0']

metadata:
    file_format: 1
    grc_version: 3.10.1.1
```

- [ ] **Step 2: Verify GRC parses the fixture**

```bash
DISPLAY=:0 timeout 5 python3 -c "
from gnuradio.grc.core.platform import Platform
p = Platform(version='3.10.7.0')
fg = p.parse_flow_graph('tests/fixtures/grc/argos-grc-demo.grc')
print('blocks:', [b.name for b in fg.blocks])
"
```

Expected: prints `blocks: ['samp_rate', 'analog_sig_source_x_0', 'blocks_throttle_0', 'blocks_null_sink_0']` (or similar). No traceback.

If `DISPLAY=:0` does not exist (headless), substitute the host's working display from earlier smoke test or temporarily start `Xtigervnc :95` then `DISPLAY=:95 ...`.

- [ ] **Step 3: Commit fixture**

```bash
git add tests/fixtures/grc/argos-grc-demo.grc
git commit -m "feat(gnu-radio-vnc): add demo flowgraph fixture (sig_source→throttle→null_sink)"
```

### Task 13: Run Phase 5 demo with user watching

**Files:** none (verification only). User must be present in front of the dashboard.

- [ ] **Step 1: Copy fixture to /tmp** (the control endpoint accepts an absolute path; placing under `/tmp` matches the path-validator allow-list)

```bash
cp tests/fixtures/grc/argos-grc-demo.grc /tmp/argos-grc-demo.grc
```

- [ ] **Step 2: Start with flowgraph preload**

POST `/api/gnuradio/control` with body `{ "action": "start", "flowgraph": "/tmp/argos-grc-demo.grc" }`. Use `curl`:

```bash
curl -sf -X POST http://localhost:5173/api/gnuradio/control \
     -H 'Content-Type: application/json' \
     -d '{"action":"start","flowgraph":"/tmp/argos-grc-demo.grc"}' | jq
```

Expected: `{"success": true, "wsPort": 6084, "flowgraph": "/tmp/argos-grc-demo.grc", ...}`.

- [ ] **Step 3: User opens Tools → Offnet → Utilities → Signal Recording → GNU Radio**

Three blocks render on canvas: `analog_sig_source_x_0` → `blocks_throttle_0` → `blocks_null_sink_0`, plus the `samp_rate` variable widget.

- [ ] **Step 4: User decision gate**

Ask user: "Does the canvas show the demo flowgraph correctly?"

- **Yes** → ship the PR; defer gr-mcp install to a follow-up spec.
- **No** → triage the rendering gap, iterate, do not progress to gr-mcp.
- **Yes + want gr-mcp** → write a follow-up spec for gr-mcp install (Python 3.13 prerequisite is the blocker per Agent C research; needs its own brainstorming + plan cycle).

- [ ] **Step 5: Stop**

```bash
curl -sf -X POST http://localhost:5173/api/gnuradio/control \
     -H 'Content-Type: application/json' \
     -d '{"action":"stop"}' | jq
```

Expected: `{"success": true, "message": "GNU Radio VNC stack stopped"}`.

---

## Phase 6 — Pre-merge gates + PR

### Task 14: Sentrux brackets + final commit batch

**Files:** none (sentrux MCP + git ops).

- [ ] **Step 1: Local quality gates on touched files**

```bash
npx eslint \
  src/lib/server/services/gnu-radio-vnc/ \
  src/routes/api/gnuradio/control/+server.ts \
  src/lib/components/dashboard/views/GnuRadioView.svelte \
  src/routes/dashboard/+page.svelte \
  src/lib/types/dashboard-view.ts \
  src/lib/data/offnet-utilities.ts \
  --config config/eslint.config.js
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 2: Full test suite**

```bash
npm run test:unit -- src/lib/server/services/gnu-radio-vnc/
```

Expected: 10 tests pass.

- [ ] **Step 3: Sentrux pre-merge gate (workflow Rule 6)**

Tools (sequential):

1. `mcp__plugin_sentrux_sentrux__rescan` — re-walk graph after final commit
2. `mcp__plugin_sentrux_sentrux__session_end` — delta report
3. `mcp__plugin_sentrux_sentrux__check_rules` — must pass `.sentrux/rules.toml`

Expected: `quality_signal` not regressed vs baseline (`project_sentrux_baseline.md` Day-0 = 5401 — current is much higher; just ensure no decrease).

- [ ] **Step 4: Run build in background**

```bash
npm run build
```

Use `run_in_background: true` per memory `feedback_argos_commit_always_bg.md`. While build runs, draft the PR body in parallel (workflow Rule 9).

- [ ] **Step 5: Push branch**

```bash
git push -u origin feature/session-4
```

(Use `SKIP_TESTS=1 git push` only if the pre-push hook SIGTERMs — per memory `feedback_skip_tests_sanctioned_bypass.md`.)

- [ ] **Step 6: Create PR via gh CLI** (per workflow Rule 4 exception list)

```bash
git log --oneline @{u}~12..HEAD > /tmp/pr-commits.txt
gh pr create --title "feat(gnu-radio): add noVNC tile under Signal Recording & Analysis" \
  --body-file /tmp/pr-body.md
```

PR body file (`/tmp/pr-body.md`) outline:

- ## Summary — one-liner per phase
- ## Architecture — link to spec doc
- ## Phase 4 smoke screenshot — embedded
- ## Phase 5 demo result — user-confirmed yes/no
- ## Sentrux delta — quality_signal before/after
- ## Test plan checklist (markdown checkboxes)

- [ ] **Step 7: Auto-merge**

```bash
PR_NUM=$(gh pr view --json number -q .number)
gh pr merge "$PR_NUM" --auto --squash --delete-branch
```

Per memory `feedback_auto_merge_after_pr_create.md`: every `gh pr create` is followed same-turn by `gh pr merge --auto`.

- [ ] **Step 8: Wakeup poll for CI green** (per memory `feedback_pr_wait_pattern.md`)

ScheduleWakeup ~270s, then dual-check `gh pr view --json statusCheckRollup` AND CR reviewThreads.

- [ ] **Step 9: Post-merge cleanup**

```bash
git checkout main && git pull
git branch -D feature/session-4
```

- [ ] **Step 10: Memory write**

One memory entry summarising the day's batch under `project_gnu_radio_novnc_done.md`. One MEMORY.md pointer line.

---

## Self-Review

**Spec coverage:**

- §3 Architecture → Tasks 4-5 (process trio + control service)
- §4 Port allocation → Task 2 (constants)
- §5 File layout → File Map (top of plan)
- §6 Install plan → Task 1
- §7 Endpoint contract → Task 6
- §8 Tile + panel → Tasks 7-10
- §9 Lifecycle → Tasks 4-5 (start/stop/status)
- §10 Test plan → Tasks 11 (Phase 4) + 13 (Phase 5)
- §11 Risk + mitigation → covered by DI seam (Task 4), idempotent start (Task 5), validate flowgraph (Task 5/6)
- §12 Phase ordering → Task 14 (sentrux brackets)
- §13 Acceptance criteria → Tasks 11 + 14

**Placeholder scan:** none — every step has concrete code, exact file paths, and exact commands. No "TBD", no "implement later".

**Type consistency:** `GnuRadioVncControlResult.flowgraph` (optional), `GnuRadioVncStatusResult.flowgraph` (nullable) — names match Task 2 → Task 5 → Task 6 → Task 9. `wsPort 6084` / `wsPath '/websockify'` consistent across types, control service, endpoint, view. `currentFlowgraph` reads through `getCurrentFlowgraph()` — same name in `processes.ts`, control service, status result.

---

**Plan complete.** 14 tasks, ~5 hours wall-clock if serialized, less in parallel where independent.
