<script lang="ts">
	import Tabs, { type TabDef } from '$lib/components/chassis/forms/Tabs.svelte';

	interface InputTab {
		id: string;
		label: string;
	}

	interface Props {
		activeTab: string;
		counts: Record<string, number>;
		tabs: InputTab[];
		onTabChange: (tab: string) => void;
	}

	let { activeTab, counts, tabs, onTabChange }: Props = $props();

	function badgeFor(id: string): string | number | undefined {
		if (id === 'whitelist') return undefined;
		return counts[id] ?? 0;
	}

	function hasItemsFor(id: string): boolean {
		if (id === 'all' || id === 'whitelist') return false;
		return (counts[id] ?? 0) > 0;
	}

	function toChassisTab(t: InputTab): TabDef {
		return {
			id: t.id,
			label: t.label,
			badge: badgeFor(t.id),
			hasItems: hasItemsFor(t.id)
		};
	}

	const chassisTabs = $derived<TabDef[]>(tabs.map(toChassisTab));
</script>

<Tabs tabs={chassisTabs} selectedId={activeTab} onChange={onTabChange} />
