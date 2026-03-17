<script>
  import Markdown from "$lib/base/Markdown.svelte";
  let { proposal } = $props();
</script>

<section>
  <h2 class="text-2xl font-medium mb-4 mt-8"
    >Executive Summary

    {#if proposal?.metaData?.trackRecord}
      & Track Record
    {/if}
  </h2>
  <p class="text-sm">
    <Markdown content={proposal?.summary} />
  </p>

  {#if proposal?.metaData?.trackRecord}
    <h3 class="text-lg font-medium mb-2" id="track-record">Track Record</h3>
    <p class="text-sm">
      <Markdown content={proposal?.metaData?.trackRecord} />
    </p>
  {/if}
</section>
