<script>
  import Markdown from "$lib/base/Markdown.svelte";

  let { proposal } = $props();

  const summary = $derived(proposal?.summary ?? "");
</script>

{#if summary.trim()}
  <section class="text-sm">
    <div class="**:first:mt-0">
      <Markdown content={summary} />
    </div>
  </section>
{/if}
