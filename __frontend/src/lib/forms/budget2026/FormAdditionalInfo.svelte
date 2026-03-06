<script>
  /** @see __frontend/docs/budget2026/form-additional-info.md Version: 1.0.1 */
  import LinkListEditor from "$lib/components/form/LinkListEditor.svelte";

  let {
    formData = $bindable(),
    vote,
    proposal,
    validationErrors,
    notPublic = false,
  } = $props();

  const metaErrors = $derived(
    validationErrors?.properties?.metaData?.properties ?? {},
  );
  const supportingLinksErrors = $derived(metaErrors.supportingInfoLinks);
</script>

<div class="flex flex-col gap-6">
  <LinkListEditor
    bind:value={formData.metaData.supportingInfoLinks}
    label="Other Supporting Info"
    description="Any other details relevant to the proposal."
    {notPublic}
    validationErrors={supportingLinksErrors}
    addButtonLabel="Add Link"
  />
</div>
