/**
 * SPD-5: startGnuRadioVnc must NOT block on the ~2s sequential spawn sequence.
 * It should return connection info immediately (like the other tool controls)
 * and run performStartup (5 spawns + inter-spawn delays) in the background.
 */

import { afterEach, describe, expect, test, vi } from 'vitest';

// Mock the spawn layer: spawnXtigervnc/spawnWindowManager are no-ops, and the
// control service inserts 250ms delays between them — so if startGnuRadioVnc
// awaited performStartup it would take >500ms. We assert it returns far faster.
vi.mock('../../../src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-processes', () => ({
	getCurrentFlowgraph: () => null,
	isAnyProcessAlive: () => false,
	killAllProcesses: vi.fn(async () => {}),
	spawnGnuRadioCompanion: vi.fn(),
	spawnGrcMaximizer: vi.fn(),
	spawnWebsockify: vi.fn(),
	spawnWindowManager: vi.fn(),
	spawnXtigervnc: vi.fn()
}));

import { startGnuRadioVnc } from '../../../src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-control-service';
import { spawnXtigervnc } from '../../../src/lib/server/services/gnu-radio-vnc/gnu-radio-vnc-processes';

afterEach(() => vi.clearAllMocks());

describe('startGnuRadioVnc — non-blocking (SPD-5)', () => {
	test('returns success connection info without awaiting the spawn sequence', async () => {
		const start = Date.now();
		const result = await startGnuRadioVnc();
		const elapsed = Date.now() - start;

		expect(result.success).toBe(true);
		expect(result.wsPort).toBeTypeOf('number');
		// performStartup has two 250ms inter-spawn delays; a blocking impl would
		// take >500ms. Non-blocking returns near-instantly.
		expect(elapsed).toBeLessThan(200);
	});

	test('still kicks off the stack spawn in the background', async () => {
		await startGnuRadioVnc();
		// The first spawn fires synchronously inside performStartup before any await.
		expect(spawnXtigervnc).toHaveBeenCalledTimes(1);
	});
});
