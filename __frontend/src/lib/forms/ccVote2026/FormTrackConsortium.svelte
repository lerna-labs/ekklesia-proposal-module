<script>
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import FormConsortiumDetails from "./FormConsortiumDetails.svelte";
  import FormConsortiumGovernanceStatement from "./FormConsortiumGovernanceStatement.svelte";
  import FormColdCredentials from "./FormColdCredentials.svelte";
  import FormConsortiumMembers from "./FormConsortiumMembers.svelte";
  import FormDeclarationAgreement from "./FormDeclarationAgreement.svelte";
  import { computeCcVoteSectionErrorCounts, errorCountLabel } from "./sectionErrorCounts.js";

  let { formData = $bindable(), validationErrors } = $props();

  const sectionErrorCounts = $derived.by(() =>
    computeCcVoteSectionErrorCounts(validationErrors, "consortium"),
  );

  let accordionValue = $state(["section-1", "section-2", "section-3", "section-4"]);
</script>

<div class="w-full">
  <Accordion.Root type="multiple" class="mx-auto w-full max-w-4xl px-4" bind:value={accordionValue}>
    <Accordion.Item value="section-1" id="consortium-details">
      <Accordion.Trigger level={2} class="section-title">
        <span class="mb-0 flex items-center gap-2">
          1. Consortium Details
          {#if sectionErrorCounts["section-1"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-1"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="px-[3px] pt-[3px] pb-8">
        <FormConsortiumDetails bind:formData {validationErrors} />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-2" id="consortium-governance-statement">
      <Accordion.Trigger level={2} class="section-title">
        <span class="mb-0 flex items-center gap-2">
          2. Consortium Governance Statement
          {#if sectionErrorCounts["section-2"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-2"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="px-[3px] pt-[3px] pb-8">
        <FormConsortiumGovernanceStatement bind:formData {validationErrors} />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-3" id="consortium-cold-credentials">
      <Accordion.Trigger level={2} class="section-title">
        <span class="mb-0 flex items-center gap-2">
          3. Cold Credentials
          {#if sectionErrorCounts["section-3"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-3"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="px-[3px] pt-[3px] pb-8">
        <FormColdCredentials bind:formData {validationErrors} track="consortium" />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-4" id="consortium-members">
      <Accordion.Trigger level={2} class="section-title">
        <span class="mb-0 flex items-center gap-2">
          4. Consortium Members
          {#if sectionErrorCounts["section-4"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-4"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="px-[3px] pt-[3px] pb-8">
        <FormConsortiumMembers bind:formData {validationErrors} />
      </Accordion.Content>
    </Accordion.Item>
  </Accordion.Root>

  <div id="consortium-declaration-agreement" class="mx-auto w-full max-w-4xl px-4 pt-4">
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
      <FormDeclarationAgreement bind:formData {validationErrors} consortiumExtraCheckbox={true} />
    </div>
  </div>
</div>
