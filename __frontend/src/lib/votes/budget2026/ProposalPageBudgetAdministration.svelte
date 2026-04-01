<script>
  import Markdown from "$lib/base/Markdown.svelte";
  import { Badge } from "$lib/components/ui/badge";
  import CollapsibleCard from "$lib/components/CollapsibleCard.svelte";
  import ItemContainer from "./ItemContainer.svelte";
  let { proposal } = $props();
  let expandedAdministrator = $state(true);
  let expandedLegalEntity = $state(true);
  let expandedIndependentAudits = $state(true);
</script>

<section class="mt-12" id="budget-administration">
  <h2 class="text-2xl font-medium mb-4">Budget Administration</h2>

  <CollapsibleCard
    expanded={expandedAdministrator}
    onToggle={() => (expandedAdministrator = !expandedAdministrator)}
    expandLabel="Expand administrator details"
    collapseLabel="Collapse administrator details"
  >
    {#snippet title()}
      Who will be your administrator for this proposal?
    {/snippet}
    <Badge
      class="shrink-0 font-normal text-xs bg-(--mbo-cardano-blue) text-white border-0 mb-4"
    >
      {proposal?.metaData?.administrator === "Intersect"
        ? "Intersect"
        : "Other"}
    </Badge>

    {#if proposal?.metaData?.administrator === "Intersect"}
      <div class="text-sm">
        For more info about Intersect administration service and process click <a
          href="https://admin-services.docs.intersectmbo.org"
          class="link"
          target="_blank"
          rel="noopener noreferrer"
        >
          here
        </a>
      </div>
    {/if}

    {#if proposal?.metaData?.administrator === "Other" && proposal?.metaData?.otherAdministrator}
      <div class="text-sm">
        <Markdown content={proposal?.metaData?.otherAdministrator?.trim()} />
      </div>
    {/if}
  </CollapsibleCard>

  <CollapsibleCard
    class="mt-2"
    expanded={expandedLegalEntity}
    onToggle={() => (expandedLegalEntity = !expandedLegalEntity)}
    expandLabel="Expand legal entity details"
    collapseLabel="Collapse legal entity details"
  >
    {#snippet title()}
      Are you applying as a registered company or as an individual?
    {/snippet}

    <Badge
      class="shrink-0 font-normal text-xs bg-(--mbo-cardano-blue) text-white border-0 mb-4"
    >
      {proposal?.metaData?.contractingParty?.legalEntityType === "company"
        ? "Company"
        : "Individual"}
    </Badge>
  </CollapsibleCard>

  <CollapsibleCard
    class="mt-2"
    expanded={expandedIndependentAudits}
    onToggle={() => (expandedIndependentAudits = !expandedIndependentAudits)}
    expandLabel="Expand independent audits details"
    collapseLabel="Collapse independent audits details"
  >
    {#snippet title()}
      How will independent audits or assurance be handled for this proposal?
    {/snippet}
    <ItemContainer>
      <Markdown
        content={proposal?.metaData?.independentAudits?.trim() || "—"}
        class="text-sm"
      />
    </ItemContainer>
  </CollapsibleCard>
</section>
