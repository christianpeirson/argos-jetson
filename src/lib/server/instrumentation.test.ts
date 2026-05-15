import type { ExportResult } from '@opentelemetry/core';
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { describe, expect, it, vi } from 'vitest';

import { redactQueryAttr, redactUrl, SanitizingExporter } from './instrumentation';

describe('redactUrl', () => {
	it('redacts known sensitive query params', () => {
		const out = redactUrl('https://argos.local/api?api_key=abc123&page=2');
		expect(out).toContain('api_key=%5BREDACTED%5D');
		expect(out).toContain('page=2');
	});

	it('redacts every sensitive param when multiple are present', () => {
		const out = redactUrl(
			'https://argos.local/api?token=t1&secret=s1&password=p1&apikey=a1&key=k1&foo=bar'
		);
		for (const k of ['token', 'secret', 'password', 'apikey', 'key']) {
			expect(out).toMatch(new RegExp(`${k}=%5BREDACTED%5D`));
		}
		expect(out).toContain('foo=bar');
	});

	it('returns the input unchanged when not a valid URL', () => {
		const raw = 'not a url';
		expect(redactUrl(raw)).toBe(raw);
	});
});

describe('redactQueryAttr', () => {
	it('redacts sensitive params from a leading-? query string', () => {
		const out = redactQueryAttr('?token=xyz&q=hello');
		expect(out).toContain('token=%5BREDACTED%5D');
		expect(out).toContain('q=hello');
	});
});

describe('SanitizingExporter', () => {
	it('mutates spans in place and forwards to delegate', () => {
		const exported: ReadableSpan[] = [];
		const delegate: SpanExporter = {
			export(spans, cb) {
				exported.push(...spans);
				cb({ code: 0 } as ExportResult);
			},
			shutdown: vi.fn().mockResolvedValue(undefined)
		};
		const exporter = new SanitizingExporter(delegate);
		const span = {
			attributes: {
				'url.full': 'https://x.test/api?api_key=secret',
				'url.query': '?token=xyz',
				'http.url': 'https://x.test/v1?password=p',
				'http.status_code': 200
			}
		} as unknown as ReadableSpan;

		const cb = vi.fn();
		exporter.export([span], cb);

		expect(exported).toHaveLength(1);
		expect(span.attributes['url.full']).toContain('api_key=%5BREDACTED%5D');
		expect(span.attributes['url.query']).toContain('token=%5BREDACTED%5D');
		expect(span.attributes['http.url']).toContain('password=%5BREDACTED%5D');
		expect(span.attributes['http.status_code']).toBe(200);
		expect(cb).toHaveBeenCalledOnce();
	});

	it('delegates shutdown', async () => {
		const shutdown = vi.fn().mockResolvedValue(undefined);
		const exporter = new SanitizingExporter({
			export: vi.fn(),
			shutdown
		} as unknown as SpanExporter);
		await exporter.shutdown();
		expect(shutdown).toHaveBeenCalledOnce();
	});

	it('forceFlush resolves when delegate has no forceFlush', async () => {
		const exporter = new SanitizingExporter({
			export: vi.fn(),
			shutdown: vi.fn().mockResolvedValue(undefined)
		} as unknown as SpanExporter);
		await expect(exporter.forceFlush?.()).resolves.toBeUndefined();
	});
});
