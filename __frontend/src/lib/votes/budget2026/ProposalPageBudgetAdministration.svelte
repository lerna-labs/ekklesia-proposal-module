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

  <Badge
    class="shrink-0 font-normal text-xs bg-(--mbo-cardano-blue) text-white border-0 mb-4"
  >
    {proposal?.metaData?.administrator === "Intersect" ? "Intersect" : "Other"}
  </Badge>

  {#if proposal?.metaData?.administrator === "Intersect"}
    <div class="text-sm"
      >For more info about Intersect administration service and process click <a
        href="https://admin-services.docs.intersectmbo.org"
        class="link"
        target="_blank"
        rel="noopener noreferrer">here</a
      ></div
    >
  {/if}

  {#if proposal?.metaData?.administrator === "Other" && proposal?.metaData?.otherAdministrator}
    <div class="text-sm">
      <Markdown content={proposal?.metaData?.otherAdministrator?.trim()} />
    </div>
  {/if}

  <h3 class="text-lg font-medium mb-2 mt-8">
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
