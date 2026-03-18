<script>
  import Markdown from "$lib/base/Markdown.svelte";
  import { Badge } from "$lib/components/ui/badge";
  let { proposal } = $props();
</script>

<section class="mt-12" id="budget-administration">
  <h2 class="text-2xl font-medium mb-4">Budget Administration</h2>

  <h3 class="text-lg font-medium mb-2 mt-4"
    >Who will be your administrator for this proposal?</h3
  >
  {#if proposal?.metaData?.administrator === "Intersect"}
    <div class="text-sm">Boilerplate text, content not supplied yet</div>
  {/if}

  {#if proposal?.metaData?.administrator === "Other" && proposal?.metaData?.otherAdministrator}
    <div class="text-sm">
      <Markdown content={proposal?.metaData?.otherAdministrator?.trim()} />
    </div>
  {/if}

  <h3 class="text-lg font-medium mb-2 mt-4">
    Are you applying as a registered company or as an individual?
  </h3>

  <Badge
    class="shrink-0 font-normal text-xs bg-(--mbo-cardano-blue) text-white border-0 mb-4"
  >
    {proposal?.metaData?.contractingParty?.legalEntityType === "company"
      ? "Company"
      : "Individual"}
  </Badge>

  <h3 class="text-lg font-medium mb-2 mt-4"
    >How will independent audits or assurance be handled for this proposal?</h3
  >
  <div class="text-sm">
    <Markdown content={proposal?.metaData?.independentAudits?.trim() || "—"} />
  </div>
</section>
