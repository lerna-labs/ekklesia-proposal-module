<script>
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import FormIndividualIdentityContact from "./FormIndividualIdentityContact.svelte";
  import FormBackgroundExpertise from "./FormBackgroundExpertise.svelte";
  import FormIndividualBiographyGovernance from "./FormIndividualBiographyGovernance.svelte";
  import FormColdCredentials from "./FormColdCredentials.svelte";
  import FormDeclarationAgreement from "./FormDeclarationAgreement.svelte";
  import { computeCcVoteSectionErrorCounts, errorCountLabel } from "./sectionErrorCounts.js";

  let { formData = $bindable(), validationErrors } = $props();

  const sectionErrorCounts = $derived.by(() =>
    computeCcVoteSectionErrorCounts(validationErrors, "individual"),
  );

  let accordionValue = $state(["section-1", "section-2", "section-3", "section-4"]);
</script>

<div class="w-full">
  <Accordion.Root type="multiple" class="mx-auto w-full max-w-4xl px-4" bind:value={accordionValue}>
    <Accordion.Item value="section-1" id="individual-identity-contact">
      <Accordion.Trigger level={2} class="section-title">
        <span class="mb-0 flex items-center gap-2">
          1. Identity &amp; Contact
          {#if sectionErrorCounts["section-1"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-1"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="px-[3px] pt-[3px] pb-8">
        <FormIndividualIdentityContact bind:formData {validationErrors} />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-2" id="individual-background-expertise">
      <Accordion.Trigger level={2} class="section-title">
        <span class="mb-0 flex items-center gap-2">
          2. Background &amp; Expertise
          {#if sectionErrorCounts["section-2"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-2"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="px-[3px] pt-[3px] pb-8">
        <FormBackgroundExpertise bind:formData {validationErrors} track="individual" />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-3" id="individual-biography-governance">
      <Accordion.Trigger level={2} class="section-title">
        <span class="mb-0 flex items-center gap-2">
          3. Biography &amp; Governance Statement
          {#if sectionErrorCounts["section-3"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-3"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="px-[3px] pt-[3px] pb-8">
        <FormIndividualBiographyGovernance bind:formData {validationErrors} />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-4" id="individual-cold-credentials">
      <Accordion.Trigger level={2} class="section-title">
        <span class="mb-0 flex items-center gap-2">
          4. Cold Credentials
          {#if sectionErrorCounts["section-4"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-4"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="px-[3px] pt-[3px] pb-8">
        <FormColdCredentials bind:formData {validationErrors} track="individual" />
      </Accordion.Content>
    </Accordion.Item>
  </Accordion.Root>

  <div id="individual-declaration-agreement" class="mx-auto w-full max-w-4xl px-4 pt-4">
    <div class="section-title pb-2">
      <h2 class="mb-0 flex items-center gap-2">
        5. Declaration &amp; Agreement
        {#if sectionErrorCounts["section-5"] > 0}
          <Badge variant="destructive">
            {errorCountLabel(sectionErrorCounts["section-5"])}
          </Badge>
        {/if}
      </h2>
    </div>
    <div class="px-[3px] pt-[3px] pb-12">
      <FormDeclarationAgreement bind:formData {validationErrors} />
    </div>
  </div>
</div>
