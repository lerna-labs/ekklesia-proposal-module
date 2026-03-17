<script>
  import Markdown from "$lib/base/Markdown.svelte";
  let { proposal } = $props();
</script>

<section class="mt-12" id="budget-administration">
  <h2 class="text-2xl font-medium mb-4">Budget Administration</h2>

  {#if proposal?.metaData?.administrator === "Intersect"}
    <div class="text-sm"> Boilerplate text, content not supplied yet </div>
  {/if}

  {#if proposal?.metaData?.administrator === "Other" && proposal?.metaData?.otherAdministrator}
    <div class="text-sm">
      <Markdown content={proposal?.metaData?.otherAdministrator?.trim()} />
    </div>
  {/if}

  <h3 class="text-lg font-medium mb-2">Third Party Assurers </h3>
  <div class="text-sm">
    <Markdown content={proposal?.metaData?.independentAudits?.trim() || "—"} />
  </div>
</section>
