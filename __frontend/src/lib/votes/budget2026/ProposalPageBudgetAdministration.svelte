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
  <h2 class="mb-4">Budget Administration</h2>

  <CollapsibleCard
    expanded={expandedAdministrator}
    onToggle={() => (expandedAdministrator = !expandedAdministrator)}
    expandLabel="Expand administrator details"
    collapseLabel="Collapse administrator details"
    titleHeadingLevel={3}
  >
    {#snippet title()}
      Who will be your administrator for this proposal?
    {/snippet}
    {#snippet popover()}
      Cardano's Constitution requires each Treasury Withdrawal to specify an Administrator and a
      third-party auditor. Fields marked with the eye-off icon contain information that will not be
      publicly visible and will only be used for administration or contracting purposes if the
      proposal is approved.
    {/snippet}
    <Badge class="mb-4 shrink-0 border-0 bg-(--mbo-cardano-blue) text-xs font-normal text-white">
      {proposal?.metaData?.administrator === "Intersect" ? "Intersect" : "Other"}
    </Badge>

    {#if proposal?.metaData?.administrator === "Intersect"}
      <div class="text-sm">
        For more info about Intersect administration service and process click <a
          href="https://admin-services.docs.intersectmbo.org/overview/budget-proposal-administration-for-2026-cycle"
          target="_blank"
          rel="noopener noreferrer"
          class="link"
        >
          here.
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
    titleHeadingLevel={3}
  >
    {#snippet title()}
      Are you applying as a registered company or as an individual?
    {/snippet}

    <Badge class="mb-4 shrink-0 border-0 bg-(--mbo-cardano-blue) text-xs font-normal text-white">
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
    titleHeadingLevel={3}
  >
    {#snippet title()}
      How will independent audits or assurance be handled for this proposal?
    {/snippet}
    {#snippet popover()}
      Describe whether funds are being set aside for independent audits or third-party assurance,
      and how oversight of treasury funds will be ensured.
    {/snippet}
    <ItemContainer>
      <Markdown content={proposal?.metaData?.independentAudits?.trim() || "—"} class="text-sm" />
    </ItemContainer>
  </CollapsibleCard>
</section>
