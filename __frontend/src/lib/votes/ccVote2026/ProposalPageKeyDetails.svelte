<script>
  import * as Card from "$lib/components/ui/card";
  import * as Popover from "$lib/components/ui/popover";
  import LinkWarningDialog from "$lib/components/LinkWarningDialog.svelte";
  import ClockIcon from "@lucide/svelte/icons/clock";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
  import MapPinIcon from "@lucide/svelte/icons/map-pin";
  import HashIcon from "@lucide/svelte/icons/hash";
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import UserIcon from "@lucide/svelte/icons/user";
  import { toast } from "svelte-sonner";
  import ShareProposalPopover from "$lib/components/ShareProposalPopover.svelte";
  import { Badge } from "$lib/components/ui/badge";

  import { formatUtcInstant } from "$lib/formatUtc.js";
  import { shortenString } from "$lib/utils.js";
  import Markdown from "$lib/base/Markdown.svelte";
  import { buildSocialRows, hasText, toText } from "./proposalPageUtils.js";

  let { proposal, vote } = $props();

  let linkWarningDialog;

  const labelClass = "text-xs font-semibold text-muted-foreground";
  const showVersionBadge = $derived(
    (proposal?.version != null && proposal.version > 1) ||
      (Array.isArray(proposal?.versions) && proposal.versions.length > 0),
  );
  const submittedAt = $derived(proposal?.submittedAt);
  const updatedAt = $derived(proposal?.updatedAt);
  const dateOptions = { dateStyle: "long", timeStyle: "short" };

  const TRACK_LABELS = {
    individual: "Individual",
    organisation: "Organisation",
    consortium: "Consortium",
  };

  const track = $derived(
    typeof proposal?.metaData?.track === "string" ? proposal.metaData.track : "",
  );
  const apiUrl =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL
      ? import.meta.env.VITE_API_URL
      : "/api/v0";
  let regionsById = $state({});

  $effect(() => {
    let cancelled = false;
    fetch(`${apiUrl}/regions`)
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || "Failed to load regions");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const raw = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        /** @type {Record<string, string>} */
        const map = {};
        for (const region of raw) {
          const id = region?._id != null ? String(region._id) : "";
          const name = region?.name != null ? String(region.name) : "";
          if (id && name) map[id] = name;
        }
        regionsById = map;
      })
      .catch(() => {
        if (!cancelled) regionsById = {};
      });
    return () => {
      cancelled = true;
    };
  });

  const trackPayload = $derived.by(() => {
    const t = track;
    if (!t || !proposal?.metaData || typeof proposal.metaData !== "object") {
      return null;
    }
    const md = /** @type {Record<string, unknown>} */ (proposal.metaData);
    const p = md[t];
    return p && typeof p === "object" ? /** @type {Record<string, unknown>} */ (p) : null;
  });

  const applicantDisplayName = $derived.by(() => {
    const p = trackPayload;
    if (!p) return "";
    if (track === "individual") {
      return String(p.fullNameOrAlias ?? "").trim();
    }
    if (track === "organisation") {
      return String(p.organisationName ?? "").trim();
    }
    if (track === "consortium") {
      return String(p.consortiumName ?? "").trim();
    }
    return "";
  });

  const trackLabel = $derived.by(() => {
    const t = track;
    return t && TRACK_LABELS[/** @type {keyof typeof TRACK_LABELS} */ (t)]
      ? TRACK_LABELS[/** @type {keyof typeof TRACK_LABELS} */ (t)]
      : null;
  });

  const socialRows = $derived.by(() => {
    return buildSocialRows(trackPayload);
  });
  const geographicRegionLabel = $derived.by(() => {
    const p = trackPayload;
    if (!p || (track !== "individual" && track !== "organisation")) return "";
    const regionId = toText(p.geographicRegion);
    return regionId ? (regionsById[regionId] ?? "Unknown region") : "";
  });

  const applicantPoolId = $derived.by(() => {
    if (track !== "individual" && track !== "organisation") return "";
    return toText(trackPayload?.poolId);
  });
  const applicantDrepId = $derived.by(() => {
    if (track !== "individual" && track !== "organisation") return "";
    return toText(trackPayload?.drepId);
  });
  const hasApplicantCredentialIds = $derived(
    applicantPoolId.length > 0 || applicantDrepId.length > 0,
  );
  const coldCredentialHash = $derived(toText(proposal?.metaData?.coldCredentialHash));
  const coldCredentialTypeLabel = $derived.by(() =>
    toText(
      proposal?.metaData?.coldCredentialType === "keyCredential"
        ? "Key Credential"
        : proposal?.metaData?.coldCredentialType === "scriptCredential"
          ? "Script Credential"
          : "",
    ),
  );
  const hasColdCredential = $derived(
    coldCredentialHash.length > 0 || coldCredentialTypeLabel.length > 0,
  );

  const firstSectionCards = $derived.by(() => {
    return [];
  });

  const proposerHref = $derived(
    vote?.slug && proposal?.proposerId
      ? `/votes/${vote.slug}?proposer=${encodeURIComponent(proposal.proposerId)}&page=1`
      : null,
  );

  /** Application ID + dates: desktop row 2 under name; mobile below type card. */
  const hasMetadataBlock = $derived(
    (proposal?._id ?? proposal?.id) != null ||
      (showVersionBadge && updatedAt != null) ||
      submittedAt != null,
  );
</script>

<Card.Root class="gap-3 bg-slate-50" id="key-details">
  <Card.Header class="py-0 pb-0">
    <h2 id="key-details-heading" class="sr-only">Key Details</h2>
    <div class="flex items-center justify-between gap-2">
      <Card.Title class="text-xl font-medium" aria-hidden="true">Key Details</Card.Title>
      <ShareProposalPopover
        buttonLabel="Share Application"
        defaultText={`Check out this CC application: ${proposal?.title ?? ""}`.trim()}
      />
    </div>
  </Card.Header>
  <Card.Content class="grid grid-cols-1 gap-2 md:grid-cols-2 md:grid-rows-[auto_auto]">
    <div class="space-y-2 text-xs md:col-start-1 md:row-start-1 md:self-start">
      <div class="bg-card text-card-foreground overflow-hidden rounded-lg border">
        <div class="flex min-w-0 gap-1.5 pt-4 pr-4 pb-2 pl-4">
          <UserIcon class="text-muted-foreground mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <div class="min-w-0">
            <p class="text-muted-foreground mb-1 text-xs font-medium">Applicant name</p>
            <p class="text-foreground text-lg font-medium tracking-tight wrap-break-word">
              {#if applicantDisplayName.trim()}
                {#if proposerHref}
                  <a href={proposerHref} class="hover:underline">{applicantDisplayName}</a>
                {:else}
                  {applicantDisplayName}
                {/if}
              {:else}
                <span class="text-muted-foreground text-base font-medium">—</span>
              {/if}
            </p>
          </div>
        </div>
      </div>
      {#if hasApplicantCredentialIds}
        <div
          class="bg-card text-card-foreground divide-border grid grid-cols-2 divide-x overflow-hidden rounded-lg border"
        >
          <div class="flex min-w-0 gap-1.5 p-4">
            <div class="min-w-0">
              <p class="text-muted-foreground mb-1 text-xs font-medium">Pool ID</p>
              <p class="font-medium wrap-break-word">
                {#if applicantPoolId}
                  <button
                    type="button"
                    class="text-foreground font-inherit cursor-pointer border-0 bg-transparent p-0 text-left hover:underline"
                    title="Copy Pool ID"
                    onclick={() => {
                      navigator.clipboard.writeText(applicantPoolId).then(
                        () => toast.success("Pool ID copied to clipboard"),
                        () => toast.error("Failed to copy"),
                      );
                    }}
                  >
                    {shortenString(applicantPoolId, 20, true)}
                  </button>
                {:else}
                  <span class="text-muted-foreground">—</span>
                {/if}
              </p>
            </div>
          </div>
          <div class="flex min-w-0 gap-1.5 p-4">
            <div class="min-w-0">
              <p class="text-muted-foreground mb-1 text-xs font-medium">DRep ID</p>
              <p class="font-medium wrap-break-word">
                {#if applicantDrepId}
                  <button
                    type="button"
                    class="text-foreground font-inherit cursor-pointer border-0 bg-transparent p-0 text-left hover:underline"
                    title="Copy DRep ID"
                    onclick={() => {
                      navigator.clipboard.writeText(applicantDrepId).then(
                        () => toast.success("DRep ID copied to clipboard"),
                        () => toast.error("Failed to copy"),
                      );
                    }}
                  >
                    {shortenString(applicantDrepId, 20, true)}
                  </button>
                {:else}
                  <span class="text-muted-foreground">—</span>
                {/if}
              </p>
            </div>
          </div>
        </div>
      {/if}
      {#if hasColdCredential}
        <div class="bg-card text-card-foreground overflow-hidden rounded-lg border">
          <div class="min-w-0 p-4">
            <div class="mb-2 flex items-center gap-1.5">
              <p class="text-muted-foreground text-xs font-medium">Cold credential hash</p>
              {#if coldCredentialTypeLabel}
                <Badge
                  class="shrink-0 border-0 bg-(--mbo-cardano-blue) px-1.5 py-0 text-[10px] leading-4 font-normal text-white"
                >
                  {coldCredentialTypeLabel}
                </Badge>
              {/if}
            </div>
            <div class="space-y-3">
              {#if coldCredentialHash}
                <div>
                  <button
                    type="button"
                    class="text-foreground font-inherit block max-w-full min-w-0 cursor-pointer truncate border-0 bg-transparent p-0 text-left hover:underline"
                    title="Copy cold credential hash"
                    onclick={() => {
                      navigator.clipboard.writeText(coldCredentialHash).then(
                        () => toast.success("Cold credential hash copied to clipboard"),
                        () => toast.error("Failed to copy"),
                      );
                    }}
                  >
                    {coldCredentialHash}
                  </button>
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/if}
    </div>

    <div
      class="text-card-foreground overflow-hidden rounded-lg border bg-white md:col-start-2 md:row-start-1 md:self-stretch {hasMetadataBlock
        ? 'md:row-span-2'
        : ''}"
    >
      <div class="flex min-w-0 gap-1.5 pt-4 pr-4 pb-2 pl-4">
        <FileTextIcon class="text-muted-foreground mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <div class="min-w-0">
          <p class="text-muted-foreground mb-1 text-xs font-medium">Applicant type</p>
          <p class="text-foreground font-medium">
            {#if trackLabel}
              {trackLabel}
            {:else}
              <span class="text-muted-foreground">—</span>
            {/if}
          </p>
        </div>
      </div>
      <div class="space-y-3 px-4 pb-4 text-xs">
        {#if geographicRegionLabel}
          <div class="border-t pt-3">
            <div class="mb-1 flex items-center gap-1.5">
              <MapPinIcon
                class="text-muted-foreground -mt-1 size-3.5 shrink-0"
                aria-hidden="true"
              />
              <p class="text-muted-foreground mb-1 text-xs font-medium">Geographic region</p>
            </div>
            <p class="text-foreground ml-6 wrap-break-word">{geographicRegionLabel}</p>
          </div>
        {/if}
        {#if socialRows.length > 0}
          <div class="border-t pt-3">
            <div class="mb-1 flex items-center gap-1.5">
              <ExternalLinkIcon
                class="text-muted-foreground -mt-1 size-3.5 shrink-0"
                aria-hidden="true"
              />
              <p class="text-muted-foreground mb-1 text-xs font-medium">Social Links</p>
            </div>
            <ul class="list-none space-y-2 p-0">
              {#each socialRows as row (row.key)}
                <li>
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary inline-flex cursor-pointer items-start gap-1 text-xs underline hover:underline"
                    onclick={(e) => {
                      e.preventDefault();
                      linkWarningDialog.show(row.url, row.label);
                    }}
                  >
                    <span class="ml-6 line-clamp-1 min-w-0 wrap-break-word">
                      {row.label}
                    </span>
                  </a>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
        {#if firstSectionCards.length > 0}
          {#each firstSectionCards as card (card.id)}
            <div class="border-t pt-3">
              <p class="text-muted-foreground mb-2 text-xs font-medium">{card.title}</p>
              {#if card.rows?.length > 0}
                <dl class="ml-6 space-y-2">
                  {#each card.rows as row (row.id)}
                    <div>
                      <dt class="text-muted-foreground text-xs">{row.label}</dt>
                      <dd class="text-foreground text-xs wrap-break-word">{toText(row.value)}</dd>
                    </div>
                  {/each}
                </dl>
              {/if}
              {#if card.markdownRows?.length > 0}
                {#each card.markdownRows as row (row.id)}
                  <div class="prose prose-neutral dark:prose-invert max-w-none text-xs">
                    <Markdown content={toText(row.value)} />
                  </div>
                {/each}
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>

    {#if hasMetadataBlock}
      <div
        class="hidden min-h-0 text-xs md:col-start-1 md:row-start-2 md:mt-0 md:flex md:flex-col md:self-stretch"
      >
        <div class="mt-auto space-y-2">
          {#if (proposal?._id ?? proposal?.id) != null}
            {@const applicationIdStr = String(proposal._id ?? proposal.id)}
            <div class="text-muted-foreground flex items-center gap-1 text-xs">
              <HashIcon class="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
              <span class={labelClass}>Application ID:</span>
              <button
                type="button"
                class="text-muted-foreground font-inherit cursor-pointer border-0 bg-transparent p-0 text-left hover:underline"
                title="Copy application ID"
                onclick={() => {
                  navigator.clipboard.writeText(applicationIdStr).then(
                    () => toast.success("Application ID copied to clipboard"),
                    () => toast.error("Failed to copy"),
                  );
                }}
              >
                {applicationIdStr}
              </button>
            </div>
          {/if}
          {#if (showVersionBadge && updatedAt != null) || submittedAt != null}
            <div class="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
              <ClockIcon class="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
              {#if showVersionBadge && updatedAt != null}
                <span class={labelClass}>Last updated:</span>
                <Popover.Root>
                  <Popover.Trigger
                    type="button"
                    class="text-muted-foreground focus-visible:ring-ring cursor-pointer rounded outline-none hover:underline focus-visible:ring-2"
                    title="Click to see submitted date"
                    aria-label="Show submitted date"
                  >
                    {formatUtcInstant(updatedAt, dateOptions)}
                  </Popover.Trigger>
                  <Popover.Content class="w-auto p-3" align="start">
                    <div class="space-y-1 text-xs">
                      {#if submittedAt != null}
                        <p>
                          <span class="text-muted-foreground font-medium">Submitted:</span>
                          {formatUtcInstant(submittedAt, dateOptions)}
                        </p>
                      {:else}
                        <p class="text-muted-foreground">Submitted date not available</p>
                      {/if}
                    </div>
                  </Popover.Content>
                </Popover.Root>
              {:else if submittedAt != null}
                <span class={labelClass}>Submitted at:</span>
                <span>{formatUtcInstant(submittedAt, dateOptions)}</span>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    {#if hasMetadataBlock}
      <div class="mt-4 space-y-2 text-xs md:hidden">
        {#if (proposal?._id ?? proposal?.id) != null}
          {@const applicationIdStrMobile = String(proposal._id ?? proposal.id)}
          <div class="text-muted-foreground flex items-center gap-1">
            <HashIcon class="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
            <span class={labelClass}>Application ID:</span>
            <button
              type="button"
              class="text-muted-foreground font-inherit cursor-pointer border-0 bg-transparent p-0 text-left hover:underline"
              title="Copy application ID"
              onclick={() => {
                navigator.clipboard.writeText(applicationIdStrMobile).then(
                  () => toast.success("Application ID copied to clipboard"),
                  () => toast.error("Failed to copy"),
                );
              }}
            >
              {applicationIdStrMobile}
            </button>
          </div>
        {/if}
        {#if (showVersionBadge && updatedAt != null) || submittedAt != null}
          <div class="text-muted-foreground flex flex-wrap items-center gap-1">
            <ClockIcon class="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
            {#if showVersionBadge && updatedAt != null}
              <span class={labelClass}>Last updated:</span>
              <Popover.Root>
                <Popover.Trigger
                  type="button"
                  class="text-muted-foreground focus-visible:ring-ring cursor-pointer rounded outline-none hover:underline focus-visible:ring-2"
                  title="Click to see submitted date"
                  aria-label="Show submitted date"
                >
                  {formatUtcInstant(updatedAt, dateOptions)}
                </Popover.Trigger>
                <Popover.Content class="w-auto p-3" align="start">
                  <div class="space-y-1 text-xs">
                    {#if submittedAt != null}
                      <p>
                        <span class="text-muted-foreground font-medium">Submitted:</span>
                        {formatUtcInstant(submittedAt, dateOptions)}
                      </p>
                    {:else}
                      <p class="text-muted-foreground">Submitted date not available</p>
                    {/if}
                  </div>
                </Popover.Content>
              </Popover.Root>
            {:else if submittedAt != null}
              <span class={labelClass}>Submitted at:</span>
              <span>{formatUtcInstant(submittedAt, dateOptions)}</span>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
  </Card.Content>
</Card.Root>

<LinkWarningDialog bind:this={linkWarningDialog} />
