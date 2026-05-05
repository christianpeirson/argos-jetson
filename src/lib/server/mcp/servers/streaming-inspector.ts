#!/usr/bin/env node
/**
 * Streaming Inspector MCP Server
 * Provides tools for debugging Server-Sent Events (SSE) endpoints
 */

import { env } from '$lib/server/env';
import { logger } from '$lib/utils/logger';

import { apiFetch } from '../shared/api-client';
import { BaseMCPServer, type ToolDefinition } from '../shared/base-server';
import {
	calculateLatencyStats,
	generateStreamRecommendations,
	HACKRF_EVENT_TYPES,
	SSE_ENDPOINTS,
	validateHeartbeats,
	validateSweepData
} from './streaming-inspector-tools';

// $lib/server/env loads dotenv + Zod-validates on import.

/**
 * Construct an EventSource against `url` with the `X-API-Key` header
 * injected via the custom `fetch` option. Centralises the dynamic
 * `eventsource` import + header-merge boilerplate that every SSE
 * inspector tool in this module repeats.
 */
async function createAuthedEventSource(url: string, apiKey: string): Promise<EventSource> {
	const { EventSource } = await import('eventsource');
	return new EventSource(url, {
		fetch: (input, init) =>
			fetch(input, {
				...init,
				headers: { ...init?.headers, 'X-API-Key': apiKey }
			})
	});
}

/** Parse SSE frame payload; on failure record an error and return null.
 *  Exported for unit-test access — the StreamingInspector class itself is
 *  private (instantiated + started inline at module load) so the `tools[]`
 *  array can't be inspected directly. Testing the two pure helpers covers
 *  the only new behavior worth asserting; the tool entries themselves are
 *  schema declarations + thin apiFetch / EventSource wrappers. */
export function parseFrameOrRecord(
	rawData: string,
	errors: Array<{ message: string; timestamp: number }>,
	timestamp: number
): unknown | null {
	try {
		return JSON.parse(rawData);
	} catch (err) {
		errors.push({
			message: `frame parse error: ${err instanceof Error ? err.message : String(err)}`,
			timestamp
		});
		return null;
	}
}

/** Record an error if a parsed SpectrumFrame is missing required fields.
 *  Exported for unit-test access — see parseFrameOrRecord JSDoc above. */
export function recordIfShapeInvalid(
	parsed: unknown,
	errors: Array<{ message: string; timestamp: number }>,
	timestamp: number
): void {
	const frame = parsed as Record<string, unknown>;
	const shapeOk =
		typeof frame.startFreq === 'number' &&
		typeof frame.endFreq === 'number' &&
		Array.isArray(frame.power) &&
		typeof frame.timestamp === 'number';
	if (!shapeOk) {
		errors.push({
			message: 'SpectrumFrame missing required fields (startFreq/endFreq/power/timestamp)',
			timestamp
		});
	}
}

class StreamingInspector extends BaseMCPServer {
	protected tools: ToolDefinition[] = [
		{
			name: 'inspect_sse_stream',
			description:
				'Monitor a live SSE stream for specified duration. Captures events, validates data, measures throughput. Use when debugging HackRF spectrum data or GSM scan streams.',
			inputSchema: {
				type: 'object' as const,
				properties: {
					stream_url: {
						type: 'string',
						description: 'SSE endpoint to monitor',
						enum: [
							'/api/hackrf/data-stream',
							'/api/gsm-evil/intelligent-scan-stream',
							'/api/rf/data-stream'
						]
					},
					duration_seconds: {
						type: 'number',
						description: 'How long to monitor (default: 10, max: 60)'
					},
					validate_data: {
						type: 'boolean',
						description: 'Validate data structure (default: true)'
					}
				},
				required: ['stream_url']
			},
			execute: async (args: Record<string, unknown>) => {
				const streamUrl = args.stream_url as string;
				const duration = Math.min((args.duration_seconds as number) || 10, 60);
				const validateData = args.validate_data !== false;

				const apiUrl = env.ARGOS_API_URL;
				const apiKey = env.ARGOS_API_KEY;

				if (!apiKey) {
					return { status: 'ERROR', error: 'ARGOS_API_KEY not set in environment' };
				}

				const fullUrl = `${apiUrl}${streamUrl}`;
				const eventSource = await createAuthedEventSource(fullUrl, apiKey);

				return new Promise((resolve) => {
					const events: Array<{ type: string; data: unknown; timestamp: number }> = [];
					const errors: Array<{ message: string; timestamp: number }> = [];
					const startTime = Date.now();
					let eventCount = 0;
					let byteCount = 0;
					const eventTypes = new Set<string>();

					const handleEvent = (type: string, data: string) => {
						const now = Date.now();
						eventCount++;
						byteCount += data.length;
						try {
							events.push({ type, data: JSON.parse(data), timestamp: now });
							eventTypes.add(type);
						} catch (parseError) {
							errors.push({
								message: `Failed to parse ${type}: ${(parseError as Error).message}`,
								timestamp: now
							});
						}
					};

					eventSource.onmessage = (event: { type: string; data: string }) => {
						handleEvent(event.type || 'message', event.data);
					};

					eventSource.onerror = (error: unknown) => {
						errors.push({ message: String(error), timestamp: Date.now() });
					};

					for (const eventType of HACKRF_EVENT_TYPES) {
						eventSource.addEventListener(eventType, (event: { data: string }) => {
							handleEvent(eventType, event.data);
						});
					}

					setTimeout(() => {
						eventSource.close();
						const endTime = Date.now();
						const totalDuration = (endTime - startTime) / 1000;
						const eventsPerSec = eventCount / totalDuration;

						const { avgLatency, maxLatency } = calculateLatencyStats(events);

						const validationIssues = validateData
							? [
									...validateSweepData(events),
									...validateHeartbeats(events, duration)
								]
							: [];

						const recommendations = generateStreamRecommendations(
							eventCount,
							eventsPerSec,
							streamUrl,
							errors.length,
							validationIssues.length,
							maxLatency
						);

						resolve({
							status: 'SUCCESS',
							stream_url: streamUrl,
							duration_monitored_seconds: totalDuration,
							summary: {
								total_events: eventCount,
								unique_event_types: Array.from(eventTypes),
								bytes_received: byteCount,
								errors: errors.length
							},
							performance: {
								events_per_second: parseFloat(eventsPerSec.toFixed(2)),
								throughput_bytes_per_sec: parseFloat(
									(byteCount / totalDuration).toFixed(0)
								),
								avg_latency_ms: parseFloat(avgLatency.toFixed(2)),
								max_latency_ms: maxLatency
							},
							validation_issues: validationIssues,
							recommendations,
							sample_events: events.slice(0, 5).map((e) => ({
								type: e.type,
								data_keys: Object.keys((e.data as object) || {}),
								timestamp: new Date(e.timestamp).toISOString()
							})),
							errors: errors.slice(0, 10)
						});
					}, duration * 1000);
				});
			}
		},
		{
			name: 'test_sse_connection',
			description:
				'Quick connectivity test for SSE endpoint. Connects, waits for first event, then disconnects.',
			inputSchema: {
				type: 'object' as const,
				properties: {
					stream_url: {
						type: 'string',
						description: 'SSE endpoint to test',
						enum: [
							'/api/hackrf/data-stream',
							'/api/gsm-evil/intelligent-scan-stream',
							'/api/rf/data-stream'
						]
					},
					timeout_seconds: {
						type: 'number',
						description: 'Max wait for first event (default: 5)'
					}
				},
				required: ['stream_url']
			},
			execute: async (args: Record<string, unknown>) => {
				const streamUrl = args.stream_url as string;
				const timeout = (args.timeout_seconds as number) || 5;
				const apiUrl = env.ARGOS_API_URL;
				const apiKey = env.ARGOS_API_KEY;

				if (!apiKey) {
					return { status: 'ERROR', error: 'ARGOS_API_KEY not set in environment' };
				}

				const fullUrl = `${apiUrl}${streamUrl}`;
				const eventSource = await createAuthedEventSource(fullUrl, apiKey);

				return new Promise((resolve) => {
					const startTime = Date.now();
					let resolved = false;

					const onFirstEvent = (type: string, dataSize: number) => {
						if (resolved) return;
						resolved = true;
						eventSource.close();
						resolve({
							status: 'SUCCESS',
							stream_url: streamUrl,
							first_event_latency_ms: Date.now() - startTime,
							event_type: type,
							event_data_size_bytes: dataSize,
							recommendation: 'SSE connection successful'
						});
					};

					eventSource.onmessage = (event: { type: string; data: string }) => {
						onFirstEvent(event.type || 'message', event.data.length);
					};

					eventSource.addEventListener('connected', (event: { data: string }) => {
						onFirstEvent('connected', event.data.length);
					});

					eventSource.onerror = (error: unknown) => {
						if (resolved) return;
						resolved = true;
						eventSource.close();
						resolve({
							status: 'ERROR',
							stream_url: streamUrl,
							error: String(error),
							recommendation: 'Connection failed - check if service is running'
						});
					};

					setTimeout(() => {
						if (resolved) return;
						resolved = true;
						eventSource.close();
						resolve({
							status: 'TIMEOUT',
							stream_url: streamUrl,
							timeout_seconds: timeout,
							recommendation:
								'No events received within timeout - service may be idle'
						});
					}, timeout * 1000);
				});
			}
		},
		{
			name: 'list_sse_endpoints',
			description: 'List all available SSE streaming endpoints in Argos.',
			inputSchema: { type: 'object' as const, properties: {} },
			execute: async () => {
				const resp = await apiFetch('/api/streaming/status');
				const data = await resp.json();

				if (!data.success) {
					return { status: 'ERROR', error: data.error };
				}

				return {
					status: 'SUCCESS',
					total_endpoints: SSE_ENDPOINTS.length,
					endpoints: SSE_ENDPOINTS,
					recommendations: [
						'Use test_sse_connection for quick connectivity checks',
						'Use inspect_sse_stream for detailed performance analysis',
						'HackRF stream should maintain ~20 events/sec when sweep is active'
					]
				};
			}
		},
		// ── spec-024 PR9c (T053) — multi-SDR spectrum diagnostics ─────────────
		// Three tools surface the new /api/spectrum/* multi-SDR-aware routes
		// (PR 9a-1) so MCP clients can debug spectrum streams without poking
		// at the legacy /api/hackrf/data-stream surface. All three follow the
		// existing snake_case ToolDefinition pattern (lines 25-287 above);
		// schema per https://modelcontextprotocol.io/docs/concepts/tools.
		{
			name: 'inspect_spectrum_stream',
			description:
				'Monitor the multi-SDR /api/spectrum/stream SSE for the specified duration. Captures frame events, validates SpectrumFrame shape, measures throughput. Use when debugging the new HackRF/B205-aware spectrum pipeline (PR 9a-1) — distinct from inspect_sse_stream which targets the legacy /api/hackrf/data-stream + /api/rf/data-stream routes.',
			inputSchema: {
				type: 'object' as const,
				properties: {
					duration_seconds: {
						type: 'number',
						description: 'How long to monitor (default: 10, max: 60)'
					},
					validate_data: {
						type: 'boolean',
						description:
							'Validate SpectrumFrame structure on every event (default: true)'
					}
				},
				required: []
			},
			execute: async (args: Record<string, unknown>) => {
				const duration = Math.min((args.duration_seconds as number) || 10, 60);
				const validateData = args.validate_data !== false;
				const apiUrl = env.ARGOS_API_URL;
				const apiKey = env.ARGOS_API_KEY;
				if (!apiKey) {
					return { status: 'ERROR', error: 'ARGOS_API_KEY not set in environment' };
				}
				const fullUrl = `${apiUrl}/api/spectrum/stream`;
				const eventSource = await createAuthedEventSource(fullUrl, apiKey);

				return new Promise((resolve) => {
					const events: Array<{ type: string; data: unknown; timestamp: number }> = [];
					const errors: Array<{ message: string; timestamp: number }> = [];
					const startTime = Date.now();
					let eventCount = 0;
					let byteCount = 0;

					eventSource.addEventListener('frame', (event: { data: string }) => {
						eventCount++;
						byteCount += event.data.length;
						const parsed = parseFrameOrRecord(
							event.data,
							errors,
							Date.now() - startTime
						);
						if (parsed === null) return;
						if (validateData) {
							recordIfShapeInvalid(parsed, errors, Date.now() - startTime);
						}
						events.push({
							type: 'frame',
							data: parsed,
							timestamp: Date.now() - startTime
						});
					});

					eventSource.addEventListener('error', (event: { data?: string }) => {
						errors.push({
							message: event.data ?? 'EventSource error (no detail)',
							timestamp: Date.now() - startTime
						});
					});

					setTimeout(() => {
						eventSource.close();
						const elapsed = (Date.now() - startTime) / 1000;
						resolve({
							status: errors.length === 0 ? 'SUCCESS' : 'PARTIAL',
							stream_url: '/api/spectrum/stream',
							duration_seconds: elapsed,
							frame_count: eventCount,
							frames_per_sec: eventCount / Math.max(elapsed, 0.001),
							bytes_received: byteCount,
							error_count: errors.length,
							errors: errors.slice(0, 5),
							sample_frame: events[0]?.data ?? null
						});
					}, duration * 1000);
				});
			}
		},
		{
			name: 'get_spectrum_status',
			description:
				'Fetch the active SpectrumSource SourceStatus from /api/spectrum/status (device, state, current config, last frame timestamp). Returns { state: "idle" } when no source is active. Use to verify a spectrum sweep is actually running before launching inspect_spectrum_stream.',
			inputSchema: { type: 'object' as const, properties: {} },
			execute: async () => {
				try {
					const resp = await apiFetch('/api/spectrum/status');
					const data = await resp.json();
					return { status: 'SUCCESS', source_status: data };
				} catch (error) {
					return {
						status: 'ERROR',
						error: error instanceof Error ? error.message : String(error)
					};
				}
			}
		},
		{
			name: 'list_available_sdrs',
			description:
				'List the SDR device types the spectrum factory can instantiate. Reflects the current Zod DeviceTypeSchema enum (src/lib/schemas/rf.ts:16); state is "available" when the factory has a registered SpectrumSource implementation, "pending" when the schema declares the device but the source is not yet wired.',
			inputSchema: { type: 'object' as const, properties: {} },
			execute: async () => {
				return {
					status: 'SUCCESS',
					devices: [
						{
							name: 'hackrf',
							state: 'available',
							source_class: 'HackRFSpectrumSource',
							notes: 'Shipped in PR 9a-1 (#41). Subscribes to sweepManager spectrum_data events.'
						},
						{
							name: 'b205',
							state: 'available',
							source_class: 'B205SpectrumSource',
							notes: 'Shipped in spec-024 PR 9b (T050). Spawns scripts/spectrum/b205_spectrum.py (UHD MultiUSRP, num_recv_frames=512+recv_frame_size=8192) and emits NDJSON spectrum frames. Hardware-gated — requires python3-uhd + a wired B205mini.'
						},
						{
							name: 'auto',
							state: 'meta',
							source_class: null,
							notes: 'Schema-level meta value — factory resolves to the first available device.'
						}
					],
					recommendations: [
						'Use get_spectrum_status to see which device is currently active',
						'Use inspect_spectrum_stream to monitor the active source live'
					]
				};
			}
		}
	];
}

// Start server when run directly
const server = new StreamingInspector('argos-streaming-inspector');
server.start().catch((error) => {
	logger.error('Streaming Inspector fatal error', {
		error: error instanceof Error ? error.message : String(error)
	});
	process.exit(1);
});
