<script>
  import Input from "$lib/components/form/Input.svelte";
  import Textarea from "$lib/components/form/Textarea.svelte";
  import SelectRegions from "$lib/components/form/SelectRegions.svelte";
  import LinkListEditor from "$lib/components/form/LinkListEditor.svelte";
  import SocialMediaLinkField from "$lib/components/form/SocialMediaLinkField.svelte";
  import XBrandIcon from "$lib/components/form/icons/XBrandIcon.svelte";
  import LinkedInBrandIcon from "$lib/components/form/icons/LinkedInBrandIcon.svelte";

  const LONG_TEXT_MAX = 2000;

  let { formData = $bindable(), validationErrors } = $props();

  const organisationErrors = $derived(
    validationErrors?.properties?.metaData?.properties?.organisation,
  );

  const organisationNameErrors = $derived({
    properties: {
      organisationName: organisationErrors?.properties?.organisationName,
    },
  });
  const organisationDescriptionErrors = $derived({
    properties: {
      organisationDescription: organisationErrors?.properties?.organisationDescription,
    },
  });
  const regionErrors = $derived({
    properties: {
      geographicRegion: organisationErrors?.properties?.geographicRegion,
    },
  });
  const contactPersonErrors = $derived({
    properties: {
      contactPerson: organisationErrors?.properties?.contactPerson,
    },
  });
  const emailErrors = $derived({
    properties: { contactEmail: organisationErrors?.properties?.contactEmail },
  });
  const poolErrors = $derived({
    properties: { poolId: organisationErrors?.properties?.poolId },
  });
  const drepErrors = $derived({
    properties: { drepId: organisationErrors?.properties?.drepId },
  });
  const xErrors = $derived({
    properties: { xUsername: organisationErrors?.properties?.xUsername },
  });
  const linkedinErrors = $derived({
    properties: {
      linkedinUsername: organisationErrors?.properties?.linkedinUsername,
    },
  });
  const websiteErrors = $derived({
    properties: { website: organisationErrors?.properties?.website },
  });
  const otherLinksErrors = $derived(organisationErrors?.properties?.otherLinks);

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
    formData.metaData.organisation.xUsername = normalizeXUsername(
      formData.metaData.organisation.xUsername,
    );
  }

  function onLinkedInBlur() {
    formData.metaData.organisation.linkedinUsername = normalizeLinkedinUsername(
      formData.metaData.organisation.linkedinUsername,
    );
  }
</script>

<div class="organisation-details-section flex flex-col gap-6">
  <section class="space-y-1.5">
    <h3>What is your organisation’s name?</h3>
    <Input
      id="organisationName"
      bind:value={formData.metaData.organisation.organisationName}
      label="Organisation name"
      description="The official or commonly recognized name of your organisation."
      placeholder="Enter organisation name"
      required
      maxLength={100}
      validationErrors={organisationNameErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>How would you describe your organisation?</h3>
    <Textarea
      id="organisationDescription"
      bind:value={formData.metaData.organisation.organisationDescription}
      label="Organisational description"
      description="Summarise your organisation’s mission, focus, and relevance to Cardano."
      placeholder="Brief overview of your mission, structure, and activities in the ecosystem"
      required
      maxLength={LONG_TEXT_MAX}
      validationErrors={organisationDescriptionErrors}
      class="w-full"
    />
  </section>

  <section class="space-y-1.5">
    <h3>Which geographic region do you represent?</h3>
    <SelectRegions
      id="geographicRegion"
      bind:value={formData.metaData.organisation.geographicRegion}
      label="Geographic region"
      description="Helps ensure global representation across the community."
      placeholder="No region (optional)"
      required={false}
      notPublic={false}
      validationErrors={regionErrors}
      class="w-full"
    />
  </section>

  <div class="gap-6 md:grid md:grid-cols-2">
    <section class="space-y-1.5">
      <h3>Who is the primary contact person?</h3>
      <Input
        id="contactPerson"
        bind:value={formData.metaData.organisation.contactPerson}
        label="Contact person"
        description="This will be used for official communication and will not be visible to voters/public."
        placeholder="Enter name"
        required
        maxLength={100}
        notPublic
        validationErrors={contactPersonErrors}
        class="w-full"
      />
    </section>

    <section class="space-y-1.5">
      <h3>What is the contact email?</h3>
      <Input
        id="contactEmail"
        bind:value={formData.metaData.organisation.contactEmail}
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
  </div>

  <div class="gap-6 md:grid md:grid-cols-2">
    <section class="space-y-1.5">
      <h3>What is your Pool ID? (if applicable)</h3>
      <Input
        id="poolId"
        bind:value={formData.metaData.organisation.poolId}
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
        bind:value={formData.metaData.organisation.drepId}
        label="DRep ID"
        description="Enter your DRep ID or script hash if you are a registered delegate. Identifier typically starts with drep1."
        placeholder="drep1…"
        validationErrors={drepErrors}
        class="w-full"
      />
    </section>
  </div>

  <section class="flex flex-col gap-3">
    <h3>Add your social or professional links</h3>

    <SocialMediaLinkField
      id="xUsername"
      bind:value={formData.metaData.organisation.xUsername}
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
      bind:value={formData.metaData.organisation.linkedinUsername}
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
      bind:value={formData.metaData.organisation.website}
      label="Website"
      description="Full URL including https:// (e.g. your organisation’s site)."
      placeholder="https://example.com"
      variant="website"
      validationErrors={websiteErrors}
      class="w-full"
    />

    <LinkListEditor
      bind:value={formData.metaData.organisation.otherLinks}
      label="Additional links"
      description="Add other titled links (e.g. GitHub, forum, podcast). Each link has a title and URL."
      addButtonLabel="Add link"
      validationErrors={otherLinksErrors}
      class="w-full"
    />
  </section>
</div>
