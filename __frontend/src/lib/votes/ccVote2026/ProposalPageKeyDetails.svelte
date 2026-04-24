<script>
  import * as Card from "$lib/components/ui/card";
  import * as Popover from "$lib/components/ui/popover";
  import LinkWarningDialog from "$lib/components/LinkWarningDialog.svelte";
  import ClockIcon from "@lucide/svelte/icons/clock";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
  import HashIcon from "@lucide/svelte/icons/hash";
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import UserIcon from "@lucide/svelte/icons/user";
  import { toast } from "svelte-sonner";

  import { formatUtcInstant } from "$lib/formatUtc.js";

  let { proposal, vote } = $props();

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
    const p = trackPayload;
    if (!p) return /** @type {{ key: string, label: string, url: string }[]} */ ([]);
    /** @type {{ key: string, label: string, url: string }[]} */
    const rows = [];

    const x = normalizeXUsername(String(p.xUsername ?? ""));
    if (x) {
      rows.push({
        key: `x:${x}`,
        label: "X (Twitter)",
        url: `https://x.com/${x}`,
      });
    }

    const li = normalizeLinkedinUsername(String(p.linkedinUsername ?? ""));
    if (li) {
      rows.push({
        key: `li:${li}`,
        label: "LinkedIn",
        url: `https://www.linkedin.com/in/${li}/`,
      });
    }

    const web = String(p.website ?? "").trim();
    if (web) {
      const url = /^https?:\/\//i.test(web) ? web : `https://${web}`;
      rows.push({ key: `web:${url}`, label: "Website", url });
    }

    const other = Array.isArray(p.otherLinks) ? p.otherLinks : [];
    for (const item of other) {
      if (!item || typeof item !== "object") continue;
      const o = /** @type {Record<string, unknown>} */ (item);
      const title = String(o.title ?? "").trim();
      const url = String(o.url ?? "").trim();
      if (!url) continue;
      rows.push({
        key: `other:${url}:${title}`,
        label: title || url,
        url,
      });
    }

    return rows;
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

<Card.Root class="bg-slate-50" id="key-details">
  <Card.Header class="py-0">
    <h2 id="key-details-heading" class="sr-only">Key Details</h2>
    <Card.Title class="text-xl font-medium" aria-hidden="true">Key Details</Card.Title>
  </Card.Header>
  <Card.Content
    class="grid grid-cols-1 md:grid-cols-2 gap-2 md:grid-rows-[auto_auto]"
  >
    <div class="space-y-2 text-xs md:row-start-1 md:col-start-1 md:self-start">
      <div class="rounded-lg border bg-card text-card-foreground overflow-hidden">
        <div class="pt-4 pr-4 pl-4 pb-2 min-w-0 flex gap-1.5">
          <UserIcon
            class="size-3.5 shrink-0 mt-0.5 text-muted-foreground"
            aria-hidden="true"
          />
          <div class="min-w-0">
            <p class="text-xs font-medium text-muted-foreground mb-1">Applicant name</p>
            <p class="text-lg font-semibold text-foreground tracking-tight wrap-break-word">
              {#if applicantDisplayName.trim()}
                {#if proposerHref}
                  <a href={proposerHref} class="hover:underline">{applicantDisplayName}</a>
                {:else}
                  {applicantDisplayName}
                {/if}
              {:else}
                <span class="text-muted-foreground font-medium text-base">—</span>
              {/if}
            </p>
          </div>
        </div>
      </div>
    </div>

    <div
      class="rounded-lg border bg-white text-card-foreground overflow-hidden md:col-start-2 md:row-start-1 md:self-stretch {hasMetadataBlock
        ? 'md:row-span-2'
        : ''}"
    >
      <div class="pt-4 pr-4 pl-4 pb-2 min-w-0 flex gap-1.5">
        <FileTextIcon
          class="size-3.5 shrink-0 mt-0.5 text-muted-foreground"
          aria-hidden="true"
        />
        <div class="min-w-0">
          <p class="text-xs font-medium text-muted-foreground mb-1">Applicant type</p>
          <p class="font-medium text-foreground">
            {#if trackLabel}
              {trackLabel}
            {:else}
              <span class="text-muted-foreground">—</span>
            {/if}
          </p>
        </div>
      </div>
      <div class="px-4 pb-4 space-y-3 text-xs">
        <div class="border-t pt-3">
          <div class="flex items-center gap-1.5 mb-1">
            <ExternalLinkIcon
              class="size-3.5 shrink-0 -mt-1 text-muted-foreground"
              aria-hidden="true"
            />
            <p class="text-xs font-medium text-muted-foreground mb-1">Social Links</p>
          </div>
          {#if socialRows.length > 0}
            <ul class="space-y-2 list-none p-0">
              {#each socialRows as row (row.key)}
                <li>
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary underline hover:underline inline-flex items-start gap-1 text-xs cursor-pointer"
                    onclick={(e) => {
                      e.preventDefault();
                      linkWarningDialog.show(row.url, row.label);
                    }}
                  >
                    <span class="min-w-0 wrap-break-word ml-6 line-clamp-1">
                      {row.label}
                    </span>
                  </a>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="text-muted-foreground ml-6">—</p>
          {/if}
        </div>
      </div>
    </div>

    {#if hasMetadataBlock}
      <div
        class="hidden md:flex md:flex-col md:row-start-2 md:col-start-1 md:self-stretch min-h-0 text-xs md:mt-0"
      >
        <div class="mt-auto space-y-2">
          {#if (proposal?._id ?? proposal?.id) != null}
            {@const applicationIdStr = String(proposal._id ?? proposal.id)}
            <div class="flex items-center gap-1 text-xs text-muted-foreground">
              <HashIcon
                class="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span class={labelClass}>Application ID:</span>
              <button
                type="button"
                class="text-muted-foreground hover:underline cursor-pointer bg-transparent border-0 p-0 text-left font-inherit"
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
            <div class="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
              <ClockIcon
                class="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              {#if showVersionBadge && updatedAt != null}
                <span class={labelClass}>Last updated:</span>
                <Popover.Root>
                  <Popover.Trigger
                    type="button"
                    class="text-muted-foreground hover:underline cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    title="Click to see submitted date"
                    aria-label="Show submitted date"
                  >
                    {formatUtcInstant(updatedAt, dateOptions)}
                  </Popover.Trigger>
                  <Popover.Content class="w-auto p-3" align="start">
                    <div class="text-xs space-y-1">
                      {#if submittedAt != null}
                        <p>
                          <span class="font-medium text-muted-foreground">
                            Submitted:
                          </span>
                          {formatUtcInstant(submittedAt, dateOptions)}
                        </p>
                      {:else}
                        <p class="text-muted-foreground">
                          Submitted date not available
                        </p>
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
          <div class="flex items-center gap-1 text-muted-foreground">
            <HashIcon
              class="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span class={labelClass}>Application ID:</span>
            <button
              type="button"
              class="text-muted-foreground hover:underline cursor-pointer bg-transparent border-0 p-0 text-left font-inherit"
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
          <div class="flex items-center gap-1 text-muted-foreground flex-wrap">
            <ClockIcon
              class="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            {#if showVersionBadge && updatedAt != null}
              <span class={labelClass}>Last updated:</span>
              <Popover.Root>
                <Popover.Trigger
                  type="button"
                  class="text-muted-foreground hover:underline cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  title="Click to see submitted date"
                  aria-label="Show submitted date"
                >
                  {formatUtcInstant(updatedAt, dateOptions)}
                </Popover.Trigger>
                <Popover.Content class="w-auto p-3" align="start">
                  <div class="text-xs space-y-1">
                    {#if submittedAt != null}
                      <p>
                        <span class="font-medium text-muted-foreground">
                          Submitted:
                        </span>
                        {formatUtcInstant(submittedAt, dateOptions)}
                      </p>
                    {:else}
                      <p class="text-muted-foreground">
                        Submitted date not available
                      </p>
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
