<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Input from '$lib/components/ui/input';
	import * as Button from '$lib/components/ui/button';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';

	let { class: className = '', placeholder = 'Search...' } = $props();
	let value = $state('');

	$effect(() => {
		const search = page.url.searchParams.get('search') ?? '';
		value = search;
	});

	function submit() {
		const searchParams = new URLSearchParams(page.url.searchParams);
		const trimmed = value.trim();
		if (trimmed) {
			searchParams.set('search', trimmed);
		} else {
			searchParams.delete('search');
		}
		const url = `${page.url.pathname}?${searchParams.toString()}`;
		goto(url);
	}

	function clear() {
		value = '';
		const searchParams = new URLSearchParams(page.url.searchParams);
		searchParams.delete('search');
		const url = `${page.url.pathname}?${searchParams.toString()}`;
		goto(url);
	}

	function handleKeydown(e) {
		if (e.key === 'Enter') {
			e.preventDefault();
			submit();
		}
	}
</script>

<div class="relative flex w-full items-center gap-2 {className}">
	<Input.Root
		bind:value
		{placeholder}
		onkeydown={handleKeydown}
		class="pr-20"
		aria-label="Search"
	/>
	{#if value.trim()}
		<Button.Root
			type="button"
			variant="ghost"
			size="icon"
			class="absolute right-9 top-0 h-full rounded-none"
			onclick={clear}
			aria-label="Clear search"
		>
			<XIcon class="size-4" />
		</Button.Root>
	{/if}
	<Button.Root
		type="button"
		variant="ghost"
		size="icon"
		class="absolute right-0 top-0 h-full rounded-l-none"
		onclick={submit}
		aria-label="Search"
	>
		<SearchIcon class="size-4" />
	</Button.Root>
</div>
