<script>
  import CollapsibleCard from "$lib/components/CollapsibleCard.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import Input from "$lib/components/form/Input.svelte";
  import Textarea from "$lib/components/form/Textarea.svelte";
  import SelectRegions from "$lib/components/form/SelectRegions.svelte";
  import LinkListEditor from "$lib/components/form/LinkListEditor.svelte";
  import SocialMediaLinkField from "$lib/components/form/SocialMediaLinkField.svelte";
  import XBrandIcon from "$lib/components/form/icons/XBrandIcon.svelte";
  import LinkedInBrandIcon from "$lib/components/form/icons/LinkedInBrandIcon.svelte";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import UsersRoundIcon from "@lucide/svelte/icons/users-round";
  import { countErrorsInTree } from "./sectionErrorCounts.js";

  const LONG_TEXT_MAX = 2000;

  let {
    member = $bindable(),
    index,
    expanded = false,
    onToggle,
    onDelete,
    validationErrors,
    /** When true, trimmed bottom padding so the list sits closer to the Add Member control below. */
    isLastMember = false,
  } = $props();

  const displayName = $derived((member?.fullNameOrAlias ?? "").toString().trim() || `Member ${index + 1}`);

  const hasAnyErrors = $derived(countErrorsInTree(validationErrors) > 0);
  const cardRingClass = $derived(hasAnyErrors ? "ring-2 ring-destructive rounded-md" : "");

  /**
   * Form controls look up errors by DOM `id` (`member-{index}-{fieldKey}`). Zod treeifyError
   * uses schema keys (`fullNameOrAlias`, …). Same pattern as WorkPackageFormFields.
   * @param {string} fieldKey
   */
  function validationErrorsForField(fieldKey) {
    if (!validationErrors?.properties?.[fieldKey]) return undefined;
    const id = `member-${index}-${fieldKey}`;
    return { properties: { [id]: validationErrors.properties[fieldKey] } };
  }

  const otherLinksErrors = $derived(validationErrors?.properties?.otherLinks);

  /** @param {Event} e */
  function handleDeleteClick(e) {
    e.stopPropagation();
    onDelete?.();
  }

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
    member.xUsername = normalizeXUsername(member.xUsername);
  }

  function onLinkedInBlur() {
    member.linkedinUsername = normalizeLinkedinUsername(member.linkedinUsername);
  }
</script>

<CollapsibleCard
  id={`consortium-member-${index + 1}`}
  {expanded}
  {onToggle}
  expandLabel="Expand member"
  collapseLabel="Collapse member"
  denseCollapsed={true}
  titleHeadingLevel={3}
  titleClass="text-lg font-medium leading-6"
  class={cardRingClass}
  contentClass={isLastMember ? "pb-2" : ""}
>
  {#snippet title()}
    <div class="flex min-w-0 w-full items-center gap-2">
      <UsersRoundIcon class="size-5 shrink-0" aria-hidden="true" />
      <span class="min-w-0 flex-1 truncate">{displayName}</span>
    </div>
  {/snippet}
  {#snippet trailingExtra()}
    <Button
      type="button"
      variant="outline"
      size="icon"
      class="shrink-0 size-8 cursor-pointer"
      title="Remove member"
      aria-label="Remove member"
      onclick={handleDeleteClick}
    >
      <TrashIcon class="size-4" />
    </Button>
  {/snippet}

  <div class="consortium-member-fields flex flex-col gap-6 mt-2">
    <div class="md:grid md:grid-cols-2 gap-6">
      <section class="space-y-1.5">
        <h4>What is the member's name or alias?</h4>
        <Input
          id="member-{index}-fullNameOrAlias"
          bind:value={member.fullNameOrAlias}
          label="Name or alias"
          description="This can be your legal name or a commonly recognized alias."
          placeholder="Full name or preferred alias"
          required
          maxLength={100}
          validationErrors={validationErrorsForField("fullNameOrAlias")}
          class="w-full"
        />
      </section>
      <section class="space-y-1.5">
        <h4>Which region does the member represent?</h4>
        <SelectRegions
          id="member-{index}-geographicRegion"
          bind:value={member.geographicRegion}
          label="Geographic region"
          description="Helps ensure global representation across the community."
          placeholder="Select region (optional)"
          required={false}
          notPublic={false}
          validationErrors={validationErrorsForField("geographicRegion")}
          class="w-full"
        />
      </section>
    </div>

    <section class="space-y-1.5">
      <h4>What is their brief biography?</h4>
      <Textarea
        id="member-{index}-briefBiography"
        bind:value={member.briefBiography}
        label="Brief biography"
        description="Background and involvement in the ecosystem."
        placeholder="Short summary of background and ecosystem involvement"
        required
        maxLength={LONG_TEXT_MAX}
        validationErrors={validationErrorsForField("briefBiography")}
        class="w-full"
      />
    </section>

    <section class="space-y-1.5">
      <h4>What is their professional background?</h4>
      <Textarea
        id="member-{index}-professionalBackground"
        bind:value={member.professionalBackground}
        label="Professional background (optional)"
        description="Include relevant fields such as governance, law, technology, finance, or community leadership."
        placeholder="e.g. legal expert, blockchain developer, governance advisor"
        required={false}
        maxLength={LONG_TEXT_MAX}
        validationErrors={validationErrorsForField("professionalBackground")}
        class="w-full"
      />
    </section>

    <section class="space-y-1.5">
      <h4>What governance experience do they have?</h4>
      <Textarea
        id="member-{index}-governanceExperience"
        bind:value={member.governanceExperience}
        label="Governance experience (optional)"
        description="For example: DAO participation, voting roles, Catalyst, public service, or committees."
        placeholder="e.g. DAO contributor, Catalyst participant, committee member"
        required={false}
        maxLength={LONG_TEXT_MAX}
        validationErrors={validationErrorsForField("governanceExperience")}
        class="w-full"
      />
    </section>

    <div class="md:grid md:grid-cols-2 gap-6">
      <section class="space-y-1.5">
        <h4>What is your Pool ID? (if applicable)</h4>
        <Input
          id="member-{index}-poolId"
          bind:value={member.poolId}
          label="Pool ID"
          description="Enter their stake pool ID if they operate or represent one."
          placeholder="pool1…"
          validationErrors={validationErrorsForField("poolId")}
          class="w-full"
        />
      </section>
      <section class="space-y-1.5">
        <h4>What is your DRep ID? (if applicable)</h4>
        <Input
          id="member-{index}-drepId"
          bind:value={member.drepId}
          label="DRep ID"
          description="Enter their DRep ID or script hash if they are a registered delegate."
          placeholder="drep1…"
          validationErrors={validationErrorsForField("drepId")}
          class="w-full"
        />
      </section>
    </div>

    <section class="flex flex-col gap-3">
      <h4>Social &amp; Profile links</h4>
      <SocialMediaLinkField
        id="member-{index}-xUsername"
        bind:value={member.xUsername}
        label="X (Twitter)"
        description="Only your handle is stored (no full URL)."
        placeholder="username"
        icon={XBrandIcon}
        urlPrefix="x.com/"
        maxLength={100}
        validationErrors={validationErrorsForField("xUsername")}
        class="w-full"
        onblur={onXBlur}
      />
      <SocialMediaLinkField
        id="member-{index}-linkedinUsername"
        bind:value={member.linkedinUsername}
        label="LinkedIn"
        description="Only the profile slug is stored (no full URL)."
        placeholder="username"
        icon={LinkedInBrandIcon}
        urlPrefix="linkedin.com/in/"
        maxLength={100}
        validationErrors={validationErrorsForField("linkedinUsername")}
        class="w-full"
        onblur={onLinkedInBlur}
      />
      <SocialMediaLinkField
        id="member-{index}-website"
        bind:value={member.website}
        label="Website"
        description="Full URL including https://"
        placeholder="https://example.com"
        variant="website"
        validationErrors={validationErrorsForField("website")}
        class="w-full"
      />
      <LinkListEditor
        bind:value={member.otherLinks}
        label="Additional links"
        description="Add other titled links (e.g. GitHub, forum). Each link has a title and URL."
        addButtonLabel="Add other link"
        validationErrors={otherLinksErrors}
        class="w-full"
      />
    </section>

    <section class="space-y-1.5 mb-6">
      <h4>Do you have any conflicts of interest to disclose?</h4>
      <Textarea
        id="member-{index}-conflictOfInterestStatement"
        bind:value={member.conflictOfInterestStatement}
        label="Conflict of interest statement"
        description="Include financial interests, affiliations, or roles that could influence decisions."
        placeholder="List any affiliations or financial interests"
        required={false}
        maxLength={LONG_TEXT_MAX}
        validationErrors={validationErrorsForField("conflictOfInterestStatement")}
        class="w-full"
      />
    </section>
  </div>
</CollapsibleCard>
