<script>
	import { Button } from '$lib/components/ui/button/index.js';
	import { fly } from 'svelte/transition';
	import { versionChange } from '$stores/versionStore.js';
	import { page } from '$app/stores';

	function reload(e) {
		e.preventDefault();
		window.location.reload();
	}
</script>

{#if $versionChange}
	<div
		class="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-orange-500 p-2 text-white"
		transition:fly={{ y: 100, duration: 600, opacity: 1 }}
	>
		<a href="/" onclick={reload} class="text-xs">
			A new version of the app is available. Please refresh the page.
		</a>
	</div>
{/if}
