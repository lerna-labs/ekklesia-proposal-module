<script>
  import Textarea from "$lib/components/form/Textarea.svelte";
  import RadioGroup from "$lib/components/form/RadioGroup.svelte";
  let {
    formData = $bindable(),
    vote,
    categories,
    proposal,
    validationErrors,
  } = $props();

  const contractingPartyErrors = $derived({
    properties: validationErrors?.properties?.metaData?.properties?.contractingParty?.properties ?? {},
  });
  const otherAdministratorErrors = $derived({
    properties: validationErrors?.properties?.metaData?.properties ?? {},
  });
</script>

<Textarea
  id="otherAdministrator"
  bind:value={formData.metaData.otherAdministrator}
  label="Details about other administrator"
  description="Please specify who is your administrator"
  required
  maxLength={4000}
  validationErrors={otherAdministratorErrors}
/>

<h3>Are you applying as a registered company or as an individual?</h3>

<RadioGroup
  id="legalEntityType"
  bind:value={formData.metaData.contractingParty.legalEntityType}
  validationErrors={contractingPartyErrors}
  label="Proposal’s Party Details"
  description="Are you applying as a registered company or an individual?"
  required
  options={[
    { value: "company", label: "Company" },
    { value: "individual", label: "Individual" },
  ]}
/>
