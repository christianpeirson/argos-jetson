/**
 * Shared binary-path resolver for the VNC stack services
 * (webtak-vnc, sdrpp, sparrow).
 *
 * On Kali RPi 5 the stack binaries live in `/usr/bin/`, on Ubuntu-based
 * Jetson images Chromium ships as a snap under `/snap/bin/`. Historically
 * each service hard-coded `/usr/bin/<bin>` and broke on snap systems.
 * This module centralises the candidate-list resolution so each service
 * declares its own env-override name and default fallback chain.
 *
 * @module
 */

import { existsSync } from 'fs';

import { env } from '$lib/server/env';

export class BinaryNotFoundError extends Error {
	readonly binary: string;
	readonly tried: readonly string[];
	readonly envVar: string | undefined;

	constructor(binary: string, tried: readonly string[], envVar?: string) {
		const hint = envVar
			? ` Install it (apt/snap) or set ${envVar} to the absolute path.`
			: ' Install it (apt/snap).';
		super(`${binary} binary not found; tried ${tried.join(', ')}.${hint}`);
		this.name = 'BinaryNotFoundError';
		this.binary = binary;
		this.tried = tried;
		this.envVar = envVar;
	}
}

/**
 * Resolve an executable path from a candidate list.
 *
 * `candidates` is checked left-to-right; the first entry that exists on
 * disk wins. `undefined`/empty entries are skipped, so callers can pass
 * `process.env.FOO` at the head of the list unconditionally.
 *
 * Throws `BinaryNotFoundError` with an actionable message if none match.
 */
// fallow-ignore-next-line complexity
export function resolveBin(
	candidates: readonly (string | undefined)[],
	binaryName: string,
	envVar?: string
): string {
	const tried: string[] = [];
	for (const candidate of candidates) {
		if (typeof candidate !== 'string' || candidate.length === 0) continue;
		tried.push(candidate);
		if (existsSync(candidate)) return candidate;
	}
	throw new BinaryNotFoundError(binaryName, tried, envVar);
}

/** Resolve the Xtigervnc binary, common to every VNC stack service. */
export const resolveXtigervncBin = (): string =>
	resolveBin(
		[env.ARGOS_VNC_XTIGERVNC_BIN, '/usr/bin/Xtigervnc', '/usr/local/bin/Xtigervnc'],
		'Xtigervnc',
		'ARGOS_VNC_XTIGERVNC_BIN'
	);

/** Resolve the websockify binary, common to every VNC stack service. */
export const resolveWebsockifyBin = (): string =>
	resolveBin(
		[env.ARGOS_VNC_WEBSOCKIFY_BIN, '/usr/bin/websockify', '/usr/local/bin/websockify'],
		'websockify',
		'ARGOS_VNC_WEBSOCKIFY_BIN'
	);
