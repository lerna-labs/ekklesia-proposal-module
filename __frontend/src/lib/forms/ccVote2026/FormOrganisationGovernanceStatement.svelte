<script>
  import Textarea from "$lib/components/form/Textarea.svelte";

  const LONG_TEXT_MAX = 2000;

  let { formData = $bindable(), validationErrors } = $props();

  const organisationErrors = $derived(
    validationErrors?.properties?.metaData?.properties?.organisation,
  );

  const conflictErrors = $derived({
    properties: {
      conflictOfInterestStatement: organisationErrors?.properties?.conflictOfInterestStatement,
    },
  });
  const contributionsErrors = $derived({
    properties: {
      contributionsToCardano: organisationErrors?.properties?.contributionsToCardano,
    },
  });
  const motivationErrors = $derived({
    properties: {
      motivation: organisationErrors?.properties?.motivation,
    },
  });
  const decentralisedErrors = $derived({
    properties: {
      decentralisedGovernanceImportance:
        organisationErrors?.properties?.decentralisedGovernanceImportance,
    },
  });
  const constitutionalErrors = $derived({
    properties: {
      constitutionalInterpretation: organisationErrors?.properties?.constitutionalInterpretation,
    },
  });
  const perspectiveErrors = $derived({
    properties: {
      perspectiveYouWouldBring: organisationErrors?.properties?.perspectiveYouWouldBring,
    },
  });
  const transparencyErrors = $derived({
    properties: {
      transparencyApproach: organisationErrors?.properties?.transparencyApproach,
    },
  });
</script>

<div class="flex flex-col gap-6">
  <section class="space-y-1.5">
    <h3>Do you have any conflicts of interest to disclose?</h3>
    <Textarea
      id="conflictOfInterestStatement"
      bind:value={formData.metaData.organisation.conflictOfInterestStatement}
      label="Conflict of Interest Statement"
      description="Disclosure of financial interests, partnerships, or relationships that may present a conflict."
      placeholder="List any affiliations or financial interests"
      required={false}
      maxLength={LONG_TEXT_MAX}
      validationErrors={conflictErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>What contributions has your organisation made?</h3>
    <Textarea
      id="contributionsToCardano"
      bind:value={formData.metaData.organisation.contributionsToCardano}
      label="Contributions to Cardano"
      description="Specific contributions to the Cardano blockchain, ecosystem, and community."
      placeholder="e.g. Delivered XYZ project, contributed to ecosystem initiatives"
      required
      maxLength={LONG_TEXT_MAX}
      validationErrors={contributionsErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>Why is your organisation applying for this role?</h3>
    <Textarea
      id="motivation"
      bind:value={formData.metaData.organisation.motivation}
      label="Motivation"
      description="Why the organisation is running for the Constitutional Committee."
      placeholder="Why your organization is applying and what it aims to contribute"
      required
      maxLength={LONG_TEXT_MAX}
      validationErrors={motivationErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>Why is decentralised governance important to your organisation?</h3>
    <Textarea
      id="decentralisedGovernanceImportance"
      bind:value={formData.metaData.organisation.decentralisedGovernanceImportance}
      label="Why is Decentralised Governance Important?"
      description="The organisation's values around decentralised governance."
      placeholder="Your organization’s perspective on decentralization and governance"
      required
      maxLength={LONG_TEXT_MAX}
      validationErrors={decentralisedErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>How will you approach constitutional interpretation?</h3>
    <Textarea
      id="constitutionalInterpretation"
      bind:value={formData.metaData.organisation.constitutionalInterpretation}
      label="Constitutional familiarity and interpretation"
      description="What are the organisation's views on constitutional interpretation? How would they approach this?"
      placeholder="How your organization will interpret and apply the constitution"
      required
      maxLength={LONG_TEXT_MAX}
      validationErrors={constitutionalErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>What perspective or unique value would your organisation bring?</h3>
    <Textarea
      id="perspectiveYouWouldBring"
      bind:value={formData.metaData.organisation.perspectiveYouWouldBring}
      label="Perspective You Would Bring"
      description="Unique perspective the organisation would contribute if elected."
      placeholder="Unique strengths, expertise, or viewpoints your organisation brings"
      required
      maxLength={LONG_TEXT_MAX}
      validationErrors={perspectiveErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>How will your organisation ensure transparency in your decisions?</h3>
    <Textarea
      id="transparencyApproach"
      bind:value={formData.metaData.organisation.transparencyApproach}
      label="Transparency Approach"
      description="How decisions and voting rationale will be communicated to the community."
      placeholder="How your organization will communicate decisions, votes, and reasoning"
      required
      maxLength={LONG_TEXT_MAX}
      validationErrors={transparencyErrors}
      class="w-full"
    />
  </section>
</div>
