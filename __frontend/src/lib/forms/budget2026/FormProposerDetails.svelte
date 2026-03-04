<script>
  /** @see __frontend/docs/budget2026/form-proposer-details.md Version: 1.1.0 */
  import Input from "$lib/components/form/Input.svelte";
  import LinkListEditor from "$lib/components/form/LinkListEditor.svelte";
  let {
    formData = $bindable(),
    vote,
    categories,
    proposal,
    validationErrors,
  } = $props();

  const proposerErrors = $derived(
    validationErrors?.properties?.metaData?.properties?.proposerDetails,
  );
  const nameErrors = $derived({
    properties: { name: proposerErrors?.properties?.name },
  });
  const emailErrors = $derived({
    properties: { email: proposerErrors?.properties?.email },
  });
  const linksErrors = $derived(proposerErrors?.properties?.links);
</script>

<!-- Proposer details – content to be added -->
<h3>What's the display name of the proposer?</h3>

<p>
  Depending if you are submitting this proposal as an individual or a company,
  this could either be your name or your company name
</p>

<Input
  id="name"
  bind:value={formData.metaData.proposerDetails.name}
  label="Proposer Public Name"
  description="This name will be public on your proposal page"
  placeholder="Enter Name"
  required
  maxLength={100}
  validationErrors={nameErrors}
  class="mb-8"
/>

<h3>Would you like to link any social media on your proposal page?</h3>

<LinkListEditor
  bind:value={formData.metaData.proposerDetails.links}
  label="Social Media Links"
  description="Social media links to be tagged in Intersect communications on project progress"
  validationErrors={linksErrors}
  class="mb-8"
/>

<h3>What's the best email an Intersect admin can use to contact you?</h3>

<p>This will be used for anything related to this proposal submission</p>

<Input
  id="email"
  bind:value={formData.metaData.proposerDetails.email}
  label="Primary Contact Email"
  description="The primary email address used for notifications and official correspondence related to this proposal."
  required
  maxLength={255}
  type="email"
  validationErrors={emailErrors}
  class="mb-8"
  placeholder="Enter Email"
  notPublic
/>
