<script>
	import * as Select from '$lib/components/ui/select/index.js';
	import { voter } from '$stores/sessionManager';
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
	let { value = undefined, disabled = false, mode = 'signer' } = $props();

	const VOTER_TYPES = import.meta.env.VITE_VOTER_TYPES;
	const voterTypes = VOTER_TYPES.split(',');

	function handleValueChange(newValue) {
		dispatch('change', newValue);
	}
</script>

<!-- SELECT SIGNTYPE -->
<Select.Root type="single" {value} onValueChange={handleValueChange} {disabled} class="w-full">
	<Select.Trigger class="mb-2 w-full">
		{#if value}
			{#if value === 'drep'}
				Sign with DRep Key
			{:else if value === 'stake'}
				Sign with Stake Key
			{:else if value === 'pool'}
				Sign with Calidus Key
			{:else if value === 'addr'}
				Sign with Payment Key
			{/if}
		{:else}
			Select how to sign
		{/if}
	</Select.Trigger>
	<Select.Content>
		{#if voterTypes.includes('drep')}
			<Select.Item value="drep">Sign with DRep Key</Select.Item>
		{/if}
		{#if voterTypes.includes('stake')}
			<Select.Item value="stake">Sign with Stake Key</Select.Item>
		{/if}
		{#if voterTypes.includes('pool')}
			<Select.Item value="pool">Sign with Calidus Key</Select.Item>
		{/if}
		{#if voterTypes.includes('addr')}
			<Select.Item value="addr">Sign with Payment Key</Select.Item>
		{/if}
	</Select.Content>
</Select.Root>
