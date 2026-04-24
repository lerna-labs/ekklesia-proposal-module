<script>
  import Textarea from "$lib/components/form/Textarea.svelte";

  const LONG_TEXT_MAX = 2000;

  /** @type {"individual" | "organisation"} */
  let { formData = $bindable(), validationErrors, track = "individual" } = $props();

  const individualErrors = $derived(validationErrors?.properties?.metaData?.properties?.individual);
  const organisationErrors = $derived(validationErrors?.properties?.metaData?.properties?.organisation);

  const professionalErrors = $derived({
    properties: {
      professionalBackground: individualErrors?.properties?.professionalBackground,
    },
  });
  const individualGovernanceErrors = $derived({
    properties: {
      governanceExperience: individualErrors?.properties?.governanceExperience,
    },
  });

  const organisationalAreasErrors = $derived({
    properties: {
      organisationalAreasOfExpertise: organisationErrors?.properties?.organisationalAreasOfExpertise,
    },
  });
  const organisationGovernanceErrors = $derived({
    properties: {
      governanceExperience: organisationErrors?.properties?.governanceExperience,
    },
  });
</script>

<div class="flex flex-col gap-6">
  {#if track === "organisation"}
    <section class="space-y-1.5">
      <h3>What are your organisation's areas of expertise?</h3>
      <Textarea
        id="organisationalAreasOfExpertise"
        bind:value={formData.metaData.organisation.organisationalAreasOfExpertise}
        label="Organisational Areas of Expertise"
        description="For example: governance, law, research, development, finance."
        placeholder="e.g. governance, legal advisory, blockchain development, research"
        required
        maxLength={LONG_TEXT_MAX}
        validationErrors={organisationalAreasErrors}
        class="w-full"
      />
    </section>

    <section class="space-y-1.5">
      <h3>What governance experience does your organisation have?</h3>
      <Textarea
        id="governanceExperience"
        bind:value={formData.metaData.organisation.governanceExperience}
        label="Governance Experience"
        description="Include DAO participation, Catalyst involvement, advisory roles, etc."
        placeholder="e.g. DAO participation, Catalyst proposals, advisory or committee roles"
        required
        maxLength={LONG_TEXT_MAX}
        validationErrors={organisationGovernanceErrors}
        class="w-full"
      />
    </section>
  {:else}
    <section class="space-y-1.5">
      <h3>What is your professional background?</h3>
      <Textarea
        id="professionalBackground"
        bind:value={formData.metaData.individual.professionalBackground}
        label="Professional Background"
        description="Include relevant fields such as governance, law, technology, finance, or community leadership."
        placeholder="e.g. 10+ years in fintech, governance advisory, and blockchain delivery"
        required
        maxLength={LONG_TEXT_MAX}
        validationErrors={professionalErrors}
        class="w-full"
      />
    </section>

    <section class="space-y-1.5">
      <h3>What governance experience do you have?</h3>
      <Textarea
        id="governanceExperience"
        bind:value={formData.metaData.individual.governanceExperience}
        label="Governance Experience"
        description="For example: DAO participation, voting roles, Catalyst, public service, or committees."
        placeholder="e.g. Catalyst participant, DAO contributor, committee member"
        required
        maxLength={LONG_TEXT_MAX}
        validationErrors={individualGovernanceErrors}
        class="w-full"
      />
    </section>
  {/if}
</div>
