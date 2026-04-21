<script>
  import Textarea from "$lib/components/form/Textarea.svelte";

  const LONG_TEXT_MAX = 2000;

  let { formData = $bindable(), validationErrors } = $props();

  const consortiumErrors = $derived(
    validationErrors?.properties?.metaData?.properties?.consortium,
  );

  const conflictErrors = $derived({
    properties: {
      conflictOfInterestStatement:
        consortiumErrors?.properties?.conflictOfInterestStatement,
    },
  });
  const contributionsErrors = $derived({
    properties: {
      contributionsToCardano:
        consortiumErrors?.properties?.contributionsToCardano,
    },
  });
  const motivationErrors = $derived({
    properties: {
      motivation: consortiumErrors?.properties?.motivation,
    },
  });
  const decentralisedErrors = $derived({
    properties: {
      decentralisedGovernanceImportance:
        consortiumErrors?.properties?.decentralisedGovernanceImportance,
    },
  });
  const constitutionalErrors = $derived({
    properties: {
      constitutionalInterpretation:
        consortiumErrors?.properties?.constitutionalInterpretation,
    },
  });
  const perspectiveErrors = $derived({
    properties: {
      perspectiveYouWouldBring:
        consortiumErrors?.properties?.perspectiveYouWouldBring,
    },
  });
  const transparencyErrors = $derived({
    properties: {
      transparencyApproach:
        consortiumErrors?.properties?.transparencyApproach,
    },
  });
  const internalDecisionErrors = $derived({
    properties: {
      internalDecisionMakingProcess:
        consortiumErrors?.properties?.internalDecisionMakingProcess,
    },
  });
</script>

<div class="flex flex-col gap-6">
  <section class="space-y-1.5">
    <h3>Do you have any conflicts of interest to disclose? (optional)</h3>
    <Textarea
      id="conflictOfInterestStatement"
      bind:value={formData.metaData.consortium.conflictOfInterestStatement}
      label="Conflict of Interest Statement"
      description="Disclosure of financial interests, partnerships, or relationships that may present a conflict."
      placeholder="Free-text description."
      required={false}
      notPublic={true}
      maxLength={LONG_TEXT_MAX}
      validationErrors={conflictErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>What contributions have consortium members made?</h3>
    <Textarea
      id="contributionsToCardano"
      bind:value={formData.metaData.consortium.contributionsToCardano}
      label="Contributions to Cardano"
      description="The consortium's collective contributions across all members. Reference specific projects, roles, and activities across the group."
      placeholder="Free-text description."
      required
      maxLength={LONG_TEXT_MAX}
      validationErrors={contributionsErrors}
      class="w-full [&_div.relative]:min-h-[260px]"
    />
  </section>

  <section class="space-y-1.5">
    <h3>Why is your consortium applying?</h3>
    <Textarea
      id="motivation"
      bind:value={formData.metaData.consortium.motivation}
      label="Motivation"
      description="Why the consortium is running for the Constitutional Committee."
      placeholder="Free-text description."
      required
      maxLength={LONG_TEXT_MAX}
      validationErrors={motivationErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>Why is decentralised governance important to your consortium?</h3>
    <Textarea
      id="decentralisedGovernanceImportance"
      bind:value={formData.metaData.consortium.decentralisedGovernanceImportance}
      label="Why is Decentralised Governance Important?"
      description="The consortium's shared values around decentralised governance."
      placeholder="Free-text description."
      required
      maxLength={LONG_TEXT_MAX}
      validationErrors={decentralisedErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>
      What are your views on constitutional interpretation, and how would your consortium approach
      this role?
    </h3>
    <Textarea
      id="constitutionalInterpretation"
      bind:value={formData.metaData.consortium.constitutionalInterpretation}
      label="Constitutional familiarity and interpretation"
      description="What are the consortium's views on constitutional interpretation? How would they approach this?"
      placeholder="Free-text description."
      required
      maxLength={LONG_TEXT_MAX}
      validationErrors={constitutionalErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>What perspective or unique value would your consortium bring?</h3>
    <Textarea
      id="perspectiveYouWouldBring"
      bind:value={formData.metaData.consortium.perspectiveYouWouldBring}
      label="Perspective You Would Bring"
      description="Unique skills, viewpoints, or contributions the consortium would offer in interpreting the Constitution if elected."
      placeholder="Free-text description."
      required
      maxLength={LONG_TEXT_MAX}
      validationErrors={perspectiveErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>How will your consortium ensure transparency in your decisions?</h3>
    <Textarea
      id="transparencyApproach"
      bind:value={formData.metaData.consortium.transparencyApproach}
      label="Transparency Approach"
      description="How the consortium will communicate decisions and voting rationale to the community."
      placeholder="Free-text description."
      required
      maxLength={LONG_TEXT_MAX}
      validationErrors={transparencyErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>How does your consortium make internal decisions?</h3>
    <Textarea
      id="internalDecisionMakingProcess"
      bind:value={formData.metaData.consortium.internalDecisionMakingProcess}
      label="Internal Decision-Making Process"
      description="How the consortium reaches consensus before casting a governance vote — quorum process, deliberation method, and any community consultation steps."
      placeholder="Free-text description."
      required
      maxLength={LONG_TEXT_MAX}
      validationErrors={internalDecisionErrors}
      class="w-full"
    />
  </section>
</div>
