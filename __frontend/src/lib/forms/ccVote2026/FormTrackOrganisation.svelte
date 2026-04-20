<script>
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import FormOrganisationDetails from "./FormOrganisationDetails.svelte";
  import FormBackgroundExpertise from "./FormBackgroundExpertise.svelte";
  import FormOrganisationGovernanceStatement from "./FormOrganisationGovernanceStatement.svelte";
  import FormColdCredentials from "./FormColdCredentials.svelte";
  import FormTreasuryDonation from "./FormTreasuryDonation.svelte";
  import FormDeclarationAgreement from "./FormDeclarationAgreement.svelte";

  let { formData = $bindable(), proposal, validationErrors } = $props();

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
    <Accordion.Item value="section-1" id="organisation-details">
      <Accordion.Trigger level={2} class="section-title">
        <span class="flex items-center gap-2 mb-0">1. Organisation Details</span>
      </Accordion.Trigger>
      <Accordion.Content class="pt-[3px] px-[3px]">
        <FormOrganisationDetails bind:formData {validationErrors} />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-2" id="organisation-background-expertise">
      <Accordion.Trigger level={2} class="section-title">
        <span class="flex items-center gap-2 mb-0">2. Background &amp; Expertise</span>
      </Accordion.Trigger>
      <Accordion.Content class="pt-[3px] px-[3px]">
        <FormBackgroundExpertise bind:formData {validationErrors} />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-3" id="organisation-governance-statement">
      <Accordion.Trigger level={2} class="section-title">
        <span class="flex items-center gap-2 mb-0">3. Governance Statement</span>
      </Accordion.Trigger>
      <Accordion.Content class="pt-[3px] px-[3px]">
        <FormOrganisationGovernanceStatement bind:formData {validationErrors} />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-4" id="organisation-cold-credentials">
      <Accordion.Trigger level={2} class="section-title">
        <span class="flex items-center gap-2 mb-0">4. Cold Credentials</span>
      </Accordion.Trigger>
      <Accordion.Content class="pt-[3px] px-[3px]">
        <FormColdCredentials bind:formData {validationErrors} />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-5" id="organisation-treasury-donation" class="last:border-b">
      <Accordion.Trigger level={2} class="section-title">
        <span class="flex items-center gap-2 mb-0">5. Treasury Donation Verification</span>
      </Accordion.Trigger>
      <Accordion.Content class="pt-[3px] px-[3px]">
        <FormTreasuryDonation bind:formData {proposal} {validationErrors} />
      </Accordion.Content>
    </Accordion.Item>
  </Accordion.Root>

  <div
    id="organisation-declaration-agreement"
    class="max-w-4xl mx-auto px-4 w-full pt-4"
  >
    <div class="section-title pb-2">
      <h2 class="flex items-center gap-2 mb-0">6. Declaration &amp; Agreement</h2>
    </div>
    <div class="pt-[3px] px-[3px] pb-12">
      <FormDeclarationAgreement bind:formData {validationErrors} />
    </div>
  </div>
</div>
