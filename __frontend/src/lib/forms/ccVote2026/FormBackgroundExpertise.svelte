<script>
  import Textarea from "$lib/components/form/Textarea.svelte";

  const LONG_TEXT_MAX = 2000;

  let { formData = $bindable(), validationErrors } = $props();

  const individualErrors = $derived(
    validationErrors?.properties?.metaData?.properties?.individual,
  );

  const professionalErrors = $derived({
    properties: {
      professionalBackground:
        individualErrors?.properties?.professionalBackground,
    },
  });
  const governanceErrors = $derived({
    properties: {
      governanceExperience: individualErrors?.properties?.governanceExperience,
    },
  });
</script>

<div class="flex flex-col gap-6">
  <section class="space-y-1.5">
    <h3>What is your professional background?</h3>
    <Textarea
      id="professionalBackground"
      bind:value={formData.metaData.individual.professionalBackground}
      label="Professional Background"
      description="Include relevant fields such as governance, law, technology, finance, or community leadership."
      placeholder="Free-text description."
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
      placeholder="Free-text description."
      required
      maxLength={LONG_TEXT_MAX}
      validationErrors={governanceErrors}
      class="w-full"
    />
  </section>
</div>
