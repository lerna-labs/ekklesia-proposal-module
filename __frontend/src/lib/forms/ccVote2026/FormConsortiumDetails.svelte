<script>
  import Input from "$lib/components/form/Input.svelte";
  import LinkListEditor from "$lib/components/form/LinkListEditor.svelte";
  import SocialMediaLinkField from "$lib/components/form/SocialMediaLinkField.svelte";
  import XBrandIcon from "$lib/components/form/icons/XBrandIcon.svelte";
  import LinkedInBrandIcon from "$lib/components/form/icons/LinkedInBrandIcon.svelte";

  let { formData = $bindable(), validationErrors } = $props();

  const consortiumErrors = $derived(validationErrors?.properties?.metaData?.properties?.consortium);

  const consortiumNameErrors = $derived({
    properties: {
      consortiumName: consortiumErrors?.properties?.consortiumName,
    },
  });
  const contactPersonErrors = $derived({
    properties: {
      contactPerson: consortiumErrors?.properties?.contactPerson,
    },
  });
  const emailErrors = $derived({
    properties: { contactEmail: consortiumErrors?.properties?.contactEmail },
  });
  const xErrors = $derived({
    properties: { xUsername: consortiumErrors?.properties?.xUsername },
  });
  const linkedinErrors = $derived({
    properties: {
      linkedinUsername: consortiumErrors?.properties?.linkedinUsername,
    },
  });
  const websiteErrors = $derived({
    properties: { website: consortiumErrors?.properties?.website },
  });
  const otherLinksErrors = $derived(consortiumErrors?.properties?.otherLinks);

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
    formData.metaData.consortium.xUsername = normalizeXUsername(
      formData.metaData.consortium.xUsername,
    );
  }

  function onLinkedInBlur() {
    formData.metaData.consortium.linkedinUsername = normalizeLinkedinUsername(
      formData.metaData.consortium.linkedinUsername,
    );
  }
</script>

<div class="consortium-details-section flex flex-col gap-6">
  <section class="space-y-1.5">
    <h3>What is the name of your consortium?</h3>
    <Input
      id="consortiumName"
      bind:value={formData.metaData.consortium.consortiumName}
      label="Consortium name"
      description="This will be displayed as the applicant name."
      placeholder="Enter consortium name"
      required
      maxLength={100}
      validationErrors={consortiumNameErrors}
      class="w-full"
    />
  </section>

  <div class="grid gap-6 md:grid-cols-2">
    <section class="space-y-1.5">
      <h3>Who is the primary contact person?</h3>
      <Input
        id="contactPerson"
        bind:value={formData.metaData.consortium.contactPerson}
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
        bind:value={formData.metaData.consortium.contactEmail}
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

  <section class="flex flex-col gap-3">
    <h3>Add consortium social or public links</h3>

    <SocialMediaLinkField
      id="xUsername"
      bind:value={formData.metaData.consortium.xUsername}
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
      bind:value={formData.metaData.consortium.linkedinUsername}
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
      bind:value={formData.metaData.consortium.website}
      label="Website"
      description="Full URL including https:// (e.g. your consortium site)."
      placeholder="https://example.com"
      variant="website"
      validationErrors={websiteErrors}
      class="w-full"
    />

    <LinkListEditor
      bind:value={formData.metaData.consortium.otherLinks}
      label="Additional links"
      description="Add other titled links (e.g. GitHub, forum, podcast). Each link has a title and URL."
      addButtonLabel="Add link"
      validationErrors={otherLinksErrors}
      class="w-full"
    />
  </section>
</div>
