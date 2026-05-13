/**
 * Debug test: Verify tools navigation works correctly
 */
import { describe, expect, it, vi } from 'vitest';

// Mock $app/environment before importing the store
vi.mock('$app/environment', () => ({
	browser: false
}));

import { countTools, findByPath, toolHierarchy } from '$lib/data/tool-hierarchy';
import type { ToolCategory } from '$lib/types/tools';

describe('Tool Navigation Debug', () => {
	it('toolHierarchy.root exists and has children', () => {
		expect(toolHierarchy.root).toBeDefined();
		expect(toolHierarchy.root.children).toBeDefined();
		expect(toolHierarchy.root.children.length).toBeGreaterThan(0);
		console.warn(
			'Root children:',
			toolHierarchy.root.children.map((c) => c.id)
		);
	});

	it('offnet node exists in root children', () => {
		const offnet = toolHierarchy.root.children.find((c) => c.id === 'offnet');
		expect(offnet).toBeDefined();
		if (!offnet) throw new Error('Offnet not found');
		expect('children' in offnet).toBe(true);
		console.warn('Offnet found:', offnet.id, offnet.name);
	});

	it('onnet node exists in root children', () => {
		const onnet = toolHierarchy.root.children.find((c) => c.id === 'onnet');
		expect(onnet).toBeDefined();
		if (!onnet) throw new Error('Onnet not found');
		expect('children' in onnet).toBe(true);
		console.warn('Onnet found:', onnet.id, onnet.name);
	});

	it('offnet node has 4 workflow children (RECON, ATTACK, DEFENSE, UTILITIES)', () => {
		// Safe: Test: Type assertion for test data construction
		const offnet = toolHierarchy.root.children.find((c) => c.id === 'offnet') as ToolCategory;
		expect(offnet.children).toBeDefined();
		expect(offnet.children.length).toBe(4);
		const ids = offnet.children.map((c) => c.id);
		expect(ids).toEqual(['recon', 'attack', 'defense', 'utilities']);
	});

	it('findByPath(["offnet"], root) returns offnet category', () => {
		const result = findByPath(['offnet'], toolHierarchy.root);
		expect(result).not.toBeNull();
		if (!result) throw new Error('Result not found');
		expect(result).toHaveProperty('id', 'offnet');
		expect('children' in result).toBe(true);
		// Safe: Test: Type assertion for test data construction
		const cat = result as ToolCategory;
		console.warn('findByPath result:', cat.id, 'with', cat.children.length, 'children');
		console.warn(
			'Children IDs:',
			cat.children.map((c) => c.id)
		);
	});

	it('findByPath(["offnet", "recon"], root) returns recon', () => {
		const result = findByPath(['offnet', 'recon'], toolHierarchy.root);
		expect(result).not.toBeNull();
		if (!result) throw new Error('Result not found');
		expect(result).toHaveProperty('id', 'recon');
		expect('children' in result).toBe(true);
	});

	it('findByPath(["offnet", "offnet"], root) returns null', () => {
		const result = findByPath(['offnet', 'offnet'], toolHierarchy.root);
		expect(result).toBeNull();
	});

	it('all offnet children are categories (have children property)', () => {
		// Safe: Test: Type assertion for test data construction
		const offnet = findByPath(['offnet'], toolHierarchy.root) as ToolCategory;
		for (const child of offnet.children) {
			const hasChildren = 'children' in child;
			console.warn(`  ${child.id}: hasChildren=${hasChildren}`);
			expect(hasChildren).toBe(true);
		}
	});

	it('navigateToCategory simulation works', () => {
		function simulateNavigate(categoryId: string, currentPath: string[]): string[] {
			const newPath = [...currentPath, categoryId];
			const result = findByPath(newPath, toolHierarchy.root);
			if (result && 'children' in result) {
				return newPath;
			}
			return currentPath;
		}

		let path: string[] = [];

		// Click OFFNET
		path = simulateNavigate('offnet', path);
		expect(path).toEqual(['offnet']);

		// Click RECON
		path = simulateNavigate('recon', path);
		expect(path).toEqual(['offnet', 'recon']);

		// Click Spectrum Analysis
		path = simulateNavigate('spectrum-analysis', path);
		expect(path).toEqual(['offnet', 'recon', 'spectrum-analysis']);
	});

	// ──────────────── Tool Count Validation ────────────────
	//
	// NOTE: these exact-count assertions are brittle — every new tool addition
	// invalidates them and drops a PR into broken-trunk territory until the
	// count is updated. If this file triggers false positives more than once
	// or twice, convert to range checks (e.g. `toBeGreaterThanOrEqual(90)`) or
	// delete the category counts in favor of the structural assertions above.
	// Counts are synced with the toolHierarchy data — bump when tools are added
	// under ONNET/OFFNET/etc. See git history for the most recent adjustment.

	it('total tools across all categories is 98', () => {
		expect(countTools(toolHierarchy.root).total).toBe(98);
	});

	it('OFFNET has exactly 87 tools', () => {
		// Safe: Test: Type assertion for test data construction
		const offnet = findByPath(['offnet'], toolHierarchy.root) as ToolCategory;
		expect(countTools(offnet).total).toBe(87);
	});

	it('ONNET has exactly 9 tools', () => {
		// Safe: Test: Type assertion for test data construction
		const onnet = findByPath(['onnet'], toolHierarchy.root) as ToolCategory;
		expect(countTools(onnet).total).toBe(9);
	});

	it('RECON has 39 tools', () => {
		// Safe: Test: Type assertion for test data construction
		const recon = findByPath(['offnet', 'recon'], toolHierarchy.root) as ToolCategory;
		expect(countTools(recon).total).toBe(39);
	});

	it('ATTACK has 28 tools', () => {
		// Safe: Test: Type assertion for test data construction
		const attack = findByPath(['offnet', 'attack'], toolHierarchy.root) as ToolCategory;
		expect(countTools(attack).total).toBe(28);
	});

	it('DEFENSE has 1 tool', () => {
		// Safe: Test: Type assertion for test data construction
		const defense = findByPath(['offnet', 'defense'], toolHierarchy.root) as ToolCategory;
		expect(countTools(defense).total).toBe(1);
	});

	it('UTILITIES has 19 tools', () => {
		// Safe: Test: Type assertion for test data construction
		const utils = findByPath(['offnet', 'utilities'], toolHierarchy.root) as ToolCategory;
		expect(countTools(utils).total).toBe(19);
	});
});
