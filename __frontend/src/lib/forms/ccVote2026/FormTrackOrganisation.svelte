<script>
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import FormOrganisationDetails from "./FormOrganisationDetails.svelte";
  import FormBackgroundExpertise from "./FormBackgroundExpertise.svelte";
  import FormOrganisationGovernanceStatement from "./FormOrganisationGovernanceStatement.svelte";
  import FormColdCredentials from "./FormColdCredentials.svelte";
  import FormDeclarationAgreement from "./FormDeclarationAgreement.svelte";
  import {
    computeCcVoteSectionErrorCounts,
    errorCountLabel,
  } from "./sectionErrorCounts.js";

  let { formData = $bindable(), validationErrors } = $props();

  const sectionErrorCounts = $derived.by(() =>
    computeCcVoteSectionErrorCounts(validationErrors, "organisation"),
  );

  let accordionValue = $state([
    "section-1",
    "section-2",
    "section-3",
    "section-4",
  ]);
</script>

<div class="w-full">
  <Accordion.Root
    type="multiple"
    class="max-w-4xl mx-auto px-4 w-full"
    bind:value={accordionValue}
  >
    <Accordion.Item value="section-1" id="organisation-details">
      <Accordion.Trigger level={2} class="section-title">
        <span class="flex items-center gap-2 mb-0">
          1. Organisation Details
          {#if sectionErrorCounts["section-1"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-1"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="pt-[3px] px-[3px] pb-8">
        <FormOrganisationDetails bind:formData {validationErrors} />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-2" id="organisation-background-expertise">
      <Accordion.Trigger level={2} class="section-title">
        <span class="flex items-center gap-2 mb-0">
          2. Background &amp; Expertise
          {#if sectionErrorCounts["section-2"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-2"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="pt-[3px] px-[3px] pb-8">
        <FormBackgroundExpertise
          bind:formData
          {validationErrors}
          track="organisation"
        />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-3" id="organisation-governance-statement">
      <Accordion.Trigger level={2} class="section-title">
        <span class="flex items-center gap-2 mb-0">
          3. Governance Statement
          {#if sectionErrorCounts["section-3"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-3"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="pt-[3px] px-[3px] pb-8">
        <FormOrganisationGovernanceStatement bind:formData {validationErrors} />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-4" id="organisation-cold-credentials">
      <Accordion.Trigger level={2} class="section-title">
        <span class="flex items-center gap-2 mb-0">
          4. Cold Credentials
          {#if sectionErrorCounts["section-4"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-4"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="pt-[3px] px-[3px] pb-8">
        <FormColdCredentials bind:formData {validationErrors} />
      </Accordion.Content>
    </Accordion.Item>

  </Accordion.Root>

  <div
    id="organisation-declaration-agreement"
    class="max-w-4xl mx-auto px-4 w-full pt-4"
  >
    <div class="section-title pb-2">
      <h2 class="flex items-center gap-2 mb-0">
        5. Declaration &amp; Agreement
        {#if sectionErrorCounts["section-5"] > 0}
          <Badge variant="destructive">
            {errorCountLabel(sectionErrorCounts["section-5"])}
          </Badge>
        {/if}
      </h2>
    </div>
    <div class="pt-[3px] px-[3px] pb-12">
      <FormDeclarationAgreement bind:formData {validationErrors} />
    </div>
  </div>
</div>
