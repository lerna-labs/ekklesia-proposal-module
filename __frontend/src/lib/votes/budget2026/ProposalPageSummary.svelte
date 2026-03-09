<script>
  import Markdown from "$lib/base/Markdown.svelte";

  let { proposal } = $props();

  const summary = $derived(proposal?.summary ?? "");
</script>

{#if summary.trim()}
  <section class="text-sm">
    <h2 class="text-lg font-semibold mb-2">Summary</h2>
    <div class="**:first:mt-0">
      <Markdown content={summary} />
    </div>
  </section>
{/if}
