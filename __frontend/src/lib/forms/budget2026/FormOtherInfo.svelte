<script>
  /** @see __frontend/docs/budget2026/form-other-info.md Version: 1.0.0 */
  import RadioGroup from "$lib/components/form/RadioGroup.svelte";
  import LinkListEditor from "$lib/components/form/LinkListEditor.svelte";

  let {
    formData = $bindable(),
    vote,
    categories,
    proposal,
    validationErrors,
    notPublic = false,
  } = $props();

  const metaErrors = $derived(
    validationErrors?.properties?.metaData?.properties ?? {},
  );
  const initiativeTypeValidationErrors = $derived({
    properties: { initiativeType: metaErrors.initiativeType },
  });
  const proposalTypeValidationErrors = $derived({
    properties: { proposalType: metaErrors.proposalType },
  });
  const supportingLinksErrors = $derived(metaErrors.supportingInfoLinks);
</script>

<div class="flex flex-col gap-6">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <RadioGroup
      id="initiativeType"
      bind:value={formData.metaData.initiativeType}
      label="Initiative Type"
      description="Is this a brand new project or the continuation/maintenance of an existing one?"
      required
      options={[
        { value: "New Initiative", label: "New Initiative" },
        { value: "Maintenance", label: "Maintenance" },
      ]}
      validationErrors={initiativeTypeValidationErrors}
    />
    <RadioGroup
      id="proposalType"
      bind:value={formData.metaData.proposalType}
      label="Type of Proposal"
      description="Classification of the proposal type."
      required
      options={[
        { value: "Technical (software/IT)", label: "Technical (software/IT)" },
        { value: "Non-technical", label: "Non-technical" },
      ]}
      validationErrors={proposalTypeValidationErrors}
    />
  </div>

  <LinkListEditor
    bind:value={formData.metaData.supportingInfoLinks}
    label="Other Supporting Info"
    description="Any other details relevant to the proposal."
    {notPublic}
    validationErrors={supportingLinksErrors}
    addButtonLabel="Add Link"
  />
</div>
