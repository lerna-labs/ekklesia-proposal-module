<script>
  import Textarea from "$lib/components/form/Textarea.svelte";

  const LONG_TEXT_MAX = 2000;

  let { formData = $bindable(), validationErrors } = $props();

  const individualErrors = $derived(validationErrors?.properties?.metaData?.properties?.individual);

  const briefBiographyErrors = $derived({
    properties: {
      briefBiography: individualErrors?.properties?.briefBiography,
    },
  });
  const conflictErrors = $derived({
    properties: {
      conflictOfInterestStatement: individualErrors?.properties?.conflictOfInterestStatement,
    },
  });
  const contributionsErrors = $derived({
    properties: {
      contributionsToCardano: individualErrors?.properties?.contributionsToCardano,
    },
  });
  const motivationErrors = $derived({
    properties: {
      motivation: individualErrors?.properties?.motivation,
    },
  });
  const decentralisedErrors = $derived({
    properties: {
      decentralisedGovernanceImportance:
        individualErrors?.properties?.decentralisedGovernanceImportance,
    },
  });
  const constitutionalErrors = $derived({
    properties: {
      constitutionalInterpretation: individualErrors?.properties?.constitutionalInterpretation,
    },
  });
  const perspectiveErrors = $derived({
    properties: {
      perspectiveYouWouldBring: individualErrors?.properties?.perspectiveYouWouldBring,
    },
  });
  const transparencyErrors = $derived({
    properties: {
      transparencyApproach: individualErrors?.properties?.transparencyApproach,
    },
  });
</script>

<div class="flex flex-col gap-6">
  <section class="space-y-1.5">
    <h3>Tell us about yourself (brief biography)</h3>
    <Textarea
      id="briefBiography"
      bind:value={formData.metaData.individual.briefBiography}
      label="Brief Biography"
      description="General background, expertise, and Cardano ecosystem history."
      placeholder="Short summary of your background, expertise, and ecosystem involvement"
      required
      maxLength={LONG_TEXT_MAX}
      validationErrors={briefBiographyErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>Do you have any conflicts of interest to disclose?</h3>
    <Textarea
      id="conflictOfInterestStatement"
      bind:value={formData.metaData.individual.conflictOfInterestStatement}
      label="Conflict of Interest Statement"
      description="Disclosure of financial interests, organisational roles, or relationships that may present a conflict."
      placeholder="List any affiliations, roles, or financial interests"
      required={false}
      maxLength={LONG_TEXT_MAX}
      validationErrors={conflictErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>What contributions have you made to the ecosystem?</h3>
    <Textarea
      id="contributionsToCardano"
      bind:value={formData.metaData.individual.contributionsToCardano}
      label="Contributions to Cardano"
      description="Specific projects, roles, initiatives, or community activities to date."
      placeholder="e.g. Led XYZ project, active DRep, contributed to open-source tools"
      required
      maxLength={LONG_TEXT_MAX}
      validationErrors={contributionsErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>Why are you running for this position?</h3>
    <Textarea
      id="motivation"
      bind:value={formData.metaData.individual.motivation}
      label="Motivation"
      description="Why the candidate is running for the Constitutional Committee."
      placeholder="Why you are running and what you aim to contribute"
      required
      maxLength={LONG_TEXT_MAX}
      validationErrors={motivationErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>Why is decentralised governance important to you?</h3>
    <Textarea
      id="decentralisedGovernanceImportance"
      bind:value={formData.metaData.individual.decentralisedGovernanceImportance}
      label="Why is Decentralised Governance Important?"
      description="Beliefs and values around decentralised governance."
      placeholder="Your views on decentralization and its importance in governance"
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
      bind:value={formData.metaData.individual.constitutionalInterpretation}
      label="Constitutional familiarity and interpretation"
      description="What are the candidate’s views on constitutional interpretation? How would they approach this?"
      placeholder="How you read, interpret, and apply the constitution in decisions"
      required
      maxLength={LONG_TEXT_MAX}
      validationErrors={constitutionalErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>What perspective or unique value would you bring?</h3>
    <Textarea
      id="perspectiveYouWouldBring"
      bind:value={formData.metaData.individual.perspectiveYouWouldBring}
      label="Perspective You Would Bring"
      description="Unique skills, viewpoints, or contributions the candidate would offer in interpreting the Constitution if elected."
      placeholder="Unique skills, experience, or viewpoints you bring to the committee"
      required
      maxLength={LONG_TEXT_MAX}
      validationErrors={perspectiveErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>How will you ensure transparency in your decisions?</h3>
    <Textarea
      id="transparencyApproach"
      bind:value={formData.metaData.individual.transparencyApproach}
      label="Transparency Approach"
      description="How the candidate will communicate decisions and voting rationale to the community."
      placeholder="How you will communicate decisions, votes, and reasoning to the community"
      required
      maxLength={LONG_TEXT_MAX}
      validationErrors={transparencyErrors}
      class="w-full"
    />
  </section>
</div>
