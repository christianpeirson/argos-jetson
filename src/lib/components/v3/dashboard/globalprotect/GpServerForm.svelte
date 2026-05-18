<script lang="ts">
	import PasswordInput from '$lib/components/chassis/forms/PasswordInput.svelte';
	import TextInput from '$lib/components/chassis/forms/TextInput.svelte';
	import type { GlobalProtectConfig } from '$lib/types/globalprotect';

	interface Props {
		config: GlobalProtectConfig;
		onchange: (config: GlobalProtectConfig) => void;
		password: string;
		onpassword: (password: string) => void;
	}

	let { config, onchange, password, onpassword }: Props = $props();

	function update(field: keyof GlobalProtectConfig, value: string | boolean) {
		onchange({ ...config, [field]: value });
	}
</script>

<div class="rounded-lg border border-border/60 bg-card/40 p-3">
	<span class="mb-2 block text-base font-semibold tracking-widest text-muted-foreground"
		>SERVER CONFIGURATION</span
	>

	<div class="flex flex-col gap-2">
		<TextInput
			labelText="Portal Address"
			placeholder="vpn.example.mil"
			value={config.portal}
			autocomplete="off"
			onInput={(value: string) => update('portal', value)}
		/>

		<TextInput
			labelText="Username"
			placeholder="operator1"
			value={config.username}
			autocomplete="username"
			onInput={(value: string) => update('username', value)}
		/>

		<PasswordInput
			labelText="Password"
			placeholder="Enter password"
			value={password}
			autocomplete="current-password"
			onInput={(value: string) => onpassword(value)}
		/>
	</div>
</div>
