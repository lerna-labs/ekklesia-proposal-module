<script>
  import Markdown from "$lib/base/Markdown.svelte";
  let { proposal } = $props();
</script>

<section id="executive-summary">
  <h2 class="text-2xl font-medium mb-4 mt-8"> Proposal Overview </h2>

  <h3 class="text-lg font-medium mb-2 mt-4"
    >Please describe your whole proposal at high level</h3
  >
  <p class="text-sm">
    <Markdown content={proposal?.summary} />
  </p>

  {#if proposal?.metaData?.trackRecord}
    <h3 class="text-lg font-medium mb-2 mt-4" id="track-record"
      >Why are you the best suited to deliver this work?</h3
    >
    <p class="text-sm">
      <Markdown content={proposal?.metaData?.trackRecord} />
    </p>
  {/if}
</section>
