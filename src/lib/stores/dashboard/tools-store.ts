/**
 * Tools navigation store for hierarchical tool organization
 * Manages navigation state, expanded categories, and tool runtime status
 */

import { derived } from 'svelte/store';

import { findByPath, toolHierarchy } from '$lib/data/tool-hierarchy';
import { persistedWritable } from '$lib/stores/persisted-writable';
// Navigation state: stack of category IDs representing the path
// Example: [] = root (TOOLS), ['offnet'] = OFFNET, ['offnet', 'recon'] = RECON
export const toolNavigationPath = persistedWritable<string[]>('toolNavigationPath', [], {
	validate: (stored) => {
		if (stored.length === 0) return stored;
		const result = findByPath(stored, toolHierarchy.root);
		return result && 'children' in result ? stored : null;
	}
});

// Derived: current category being viewed
export const currentCategory = derived(toolNavigationPath, ($path) => {
	if ($path.length === 0) return toolHierarchy.root;
	const result = findByPath($path, toolHierarchy.root);
	if (result && 'children' in result) return result;
	// Invalid path — return root (navigateToCategory prevents this case)
	return toolHierarchy.root;
});

// Derived: breadcrumb trail for navigation header
// src/lib/components/dashboard/panels/ToolsPanelHeader.svelte:6
// fallow-ignore-next-line unused-export
export const breadcrumbs = derived(toolNavigationPath, ($path) => {
	const crumbs: string[] = ['TOOLS'];
	let current = toolHierarchy.root;

	for (const id of $path) {
		const found = current.children.find((child) => child.id === id);
		if (found && 'children' in found) {
			crumbs.push(found.name);
			current = found;
		}
	}

	return crumbs;
});

/**
 * Navigate to a specific category by ID.
 * Validates that the target path exists before committing.
 */
export function navigateToCategory(categoryId: string) {
	toolNavigationPath.update((path) => {
		const newPath = [...path, categoryId];
		const result = findByPath(newPath, toolHierarchy.root);
		// Only navigate if the target is a valid category with children
		if (result && 'children' in result) {
			return newPath;
		}
		// Invalid target — stay where we are
		return path;
	});
}

/**
 * Navigate back one level in the hierarchy
 */
export function navigateBack() {
	toolNavigationPath.update((path) => path.slice(0, -1));
}
