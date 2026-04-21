<script>
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import FormConsortiumDetails from "./FormConsortiumDetails.svelte";
  import FormConsortiumGovernanceStatement from "./FormConsortiumGovernanceStatement.svelte";
  import FormColdCredentials from "./FormColdCredentials.svelte";
  import FormConsortiumMembers from "./FormConsortiumMembers.svelte";
  import FormTreasuryDonation from "./FormTreasuryDonation.svelte";
  import FormDeclarationAgreement from "./FormDeclarationAgreement.svelte";
  import {
    computeCcVoteSectionErrorCounts,
    errorCountLabel,
  } from "./sectionErrorCounts.js";

  let { formData = $bindable(), proposal, validationErrors } = $props();

  const sectionErrorCounts = $derived.by(() =>
    computeCcVoteSectionErrorCounts(validationErrors, "consortium"),
  );

  let accordionValue = $state([
    "section-1",
    "section-2",
    "section-3",
    "section-4",
    "section-5",
  ]);
</script>

<div class="w-full">
  <Accordion.Root
    type="multiple"
    class="max-w-4xl mx-auto px-4 w-full"
    bind:value={accordionValue}
  >
    <Accordion.Item value="section-1" id="consortium-details">
      <Accordion.Trigger level={2} class="section-title">
        <span class="flex items-center gap-2 mb-0">
          1. Consortium Details
          {#if sectionErrorCounts["section-1"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-1"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="pt-[3px] px-[3px] pb-8">
        <FormConsortiumDetails bind:formData {validationErrors} />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-2" id="consortium-governance-statement">
      <Accordion.Trigger level={2} class="section-title">
        <span class="flex items-center gap-2 mb-0">
          2. Consortium Governance Statement
          {#if sectionErrorCounts["section-2"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-2"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="pt-[3px] px-[3px] pb-8">
        <FormConsortiumGovernanceStatement bind:formData {validationErrors} />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-3" id="consortium-cold-credentials">
      <Accordion.Trigger level={2} class="section-title">
        <span class="flex items-center gap-2 mb-0">
          3. Cold Credentials
          {#if sectionErrorCounts["section-3"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-3"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="pt-[3px] px-[3px] pb-8">
        <FormColdCredentials bind:formData {validationErrors} />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-4" id="consortium-members">
      <Accordion.Trigger level={2} class="section-title">
        <span class="flex items-center gap-2 mb-0">
          4. Consortium Members
          {#if sectionErrorCounts["section-4"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-4"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="pt-[3px] px-[3px] pb-8">
        <FormConsortiumMembers bind:formData {validationErrors} />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-5" id="consortium-treasury-donation" class="last:border-b">
      <Accordion.Trigger level={2} class="section-title">
        <span class="flex items-center gap-2 mb-0">
          5. Treasury Donation Verification
          {#if sectionErrorCounts["section-5"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-5"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="pt-[3px] px-[3px] pb-8">
        <FormTreasuryDonation bind:formData {proposal} {validationErrors} />
      </Accordion.Content>
    </Accordion.Item>
  </Accordion.Root>

  <div
    id="consortium-declaration-agreement"
    class="max-w-4xl mx-auto px-4 w-full pt-4"
  >
    <div class="section-title pb-2">
      <h2 class="flex items-center gap-2 mb-0">
        6. Declaration &amp; Agreement
        {#if sectionErrorCounts["section-6"] > 0}
          <Badge variant="destructive">
            {errorCountLabel(sectionErrorCounts["section-6"])}
          </Badge>
        {/if}
      </h2>
    </div>
    <div class="pt-[3px] px-[3px] pb-12">
      <FormDeclarationAgreement
        bind:formData
        {validationErrors}
        consortiumExtraCheckbox={true}
      />
    </div>
  </div>
</div>
