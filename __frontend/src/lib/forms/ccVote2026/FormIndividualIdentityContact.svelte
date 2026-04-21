<script>
  import Input from "$lib/components/form/Input.svelte";
  import SelectRegions from "$lib/components/form/SelectRegions.svelte";
  import LinkListEditor from "$lib/components/form/LinkListEditor.svelte";
  import SocialMediaLinkField from "$lib/components/form/SocialMediaLinkField.svelte";
  import XBrandIcon from "$lib/components/form/icons/XBrandIcon.svelte";
  import LinkedInBrandIcon from "$lib/components/form/icons/LinkedInBrandIcon.svelte";

  let { formData = $bindable(), validationErrors } = $props();

  const individualErrors = $derived(
    validationErrors?.properties?.metaData?.properties?.individual,
  );

  const fullNameErrors = $derived({
    properties: {
      fullNameOrAlias: individualErrors?.properties?.fullNameOrAlias,
    },
  });
  const emailErrors = $derived({
    properties: { contactEmail: individualErrors?.properties?.contactEmail },
  });
  const regionErrors = $derived({
    properties: {
      geographicRegion: individualErrors?.properties?.geographicRegion,
    },
  });
  const poolErrors = $derived({
    properties: { poolId: individualErrors?.properties?.poolId },
  });
  const drepErrors = $derived({
    properties: { drepId: individualErrors?.properties?.drepId },
  });
  const xErrors = $derived({
    properties: { xUsername: individualErrors?.properties?.xUsername },
  });
  const linkedinErrors = $derived({
    properties: {
      linkedinUsername: individualErrors?.properties?.linkedinUsername,
    },
  });
  const websiteErrors = $derived({
    properties: { website: individualErrors?.properties?.website },
  });
  const otherLinksErrors = $derived(individualErrors?.properties?.otherLinks);

  /** @param {string} raw */
  function normalizeXUsername(raw) {
    let t = (raw ?? "").trim();
    t = t.replace(/^@+/, "");
    t = t.replace(/^https?:\/\/(www\.)?x\.com\//i, "");
    t = t.replace(/^https?:\/\/(www\.)?twitter\.com\//i, "");
    t = t.replace(/^\/+/, "");
    const q = t.indexOf("?");
    if (q >= 0) t = t.slice(0, q);
    return t.trim();
  }

  /** @param {string} raw */
  function normalizeLinkedinUsername(raw) {
    let t = (raw ?? "").trim();
    t = t.replace(/^@+/, "");
    t = t.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, "");
    t = t.replace(/^\/+/, "");
    const q = t.indexOf("?");
    if (q >= 0) t = t.slice(0, q);
    t = t.replace(/\/+$/, "");
    return t.trim();
  }

  function onXBlur() {
    formData.metaData.individual.xUsername = normalizeXUsername(
      formData.metaData.individual.xUsername,
    );
  }

  function onLinkedInBlur() {
    formData.metaData.individual.linkedinUsername = normalizeLinkedinUsername(
      formData.metaData.individual.linkedinUsername,
    );
  }
</script>

<div class="identity-contact-section flex flex-col gap-6">
  <section class="space-y-1.5">
    <h3>What name should appear on your candidacy?</h3>
    <Input
      id="fullNameOrAlias"
      bind:value={formData.metaData.individual.fullNameOrAlias}
      label="Full name or alias"
      description="This can be your legal name or a commonly recognized alias."
      placeholder="Enter your name or alias"
      required
      maxLength={100}
      validationErrors={fullNameErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>What is your contact email?</h3>
    <Input
      id="contactEmail"
      bind:value={formData.metaData.individual.contactEmail}
      label="Contact email"
      description="This will be used for official communication and will not be visible to voters."
      placeholder="Enter email"
      required
      maxLength={254}
      type="email"
      notPublic
      validationErrors={emailErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>Which geographic region do you represent? (optional)</h3>
    <SelectRegions
      id="geographicRegion"
      bind:value={formData.metaData.individual.geographicRegion}
      label="Geographic region"
      description="Helps ensure global representation across the community."
      placeholder="No region (optional)"
      required={false}
      notPublic={false}
      validationErrors={regionErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>What is your Pool ID? (if applicable)</h3>
    <Input
      id="poolId"
      bind:value={formData.metaData.individual.poolId}
      label="Pool ID"
      description="Enter your stake pool ID if you operate or represent one. On-chain identifier (starts with pool1)."
      placeholder="pool1…"
      validationErrors={poolErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>What is your DRep ID? (if applicable)</h3>
    <Input
      id="drepId"
      bind:value={formData.metaData.individual.drepId}
      label="DRep ID"
      description="Enter your DRep ID or script hash if you are a registered delegate. Identifier typically starts with drep1."
      placeholder="drep1…"
      validationErrors={drepErrors}
      class="w-full"
    />
  </section>

  <section class="flex flex-col gap-3">
    <h3>Add your social or professional links (optional)</h3>

    <SocialMediaLinkField
      id="xUsername"
      bind:value={formData.metaData.individual.xUsername}
      label="X (Twitter)"
      description="Only your handle is stored (no full URL)."
      placeholder="username"
      icon={XBrandIcon}
      urlPrefix="x.com/"
      maxLength={100}
      validationErrors={xErrors}
      class="w-full"
      onblur={onXBlur}
    />

    <SocialMediaLinkField
      id="linkedinUsername"
      bind:value={formData.metaData.individual.linkedinUsername}
      label="LinkedIn"
      description="Only the profile slug is stored (no full URL)."
      placeholder="username"
      icon={LinkedInBrandIcon}
      urlPrefix="linkedin.com/in/"
      maxLength={100}
      validationErrors={linkedinErrors}
      class="w-full"
      onblur={onLinkedInBlur}
    />

    <SocialMediaLinkField
      id="website"
      bind:value={formData.metaData.individual.website}
      label="Website"
      description="Full URL including https:// (e.g. your personal or campaign site)."
      placeholder="https://example.com"
      variant="website"
      validationErrors={websiteErrors}
      class="w-full"
    />

    <LinkListEditor
      bind:value={formData.metaData.individual.otherLinks}
      label="Additional links"
      description="Add other titled links (e.g. GitHub, forum, podcast). Each link has a title and URL."
      addButtonLabel="Add link"
      validationErrors={otherLinksErrors}
      class="w-full"
    />
  </section>
</div>
