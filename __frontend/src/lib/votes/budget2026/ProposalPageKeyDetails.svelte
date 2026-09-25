<script>
  import * as Card from "$lib/components/ui/card";
  import * as Popover from "$lib/components/ui/popover";
  import { Button } from "$lib/components/ui/button";
  import LinkWarningDialog from "$lib/components/LinkWarningDialog.svelte";
  import { formatAda, formatUsd } from "$lib/utils.js";
  import ClockIcon from "@lucide/svelte/icons/clock";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
  import HashIcon from "@lucide/svelte/icons/hash";
  import HomeIcon from "@lucide/svelte/icons/home";
  import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
  import UserIcon from "@lucide/svelte/icons/user";
  import CoinsIcon from "@lucide/svelte/icons/coins";
  import InfoIcon from "@lucide/svelte/icons/info";
  import { toast } from "svelte-sonner";

  import { formatUtcInstant } from "$lib/formatUtc.js";
  import ShareProposalPopover from "$lib/components/ShareProposalPopover.svelte";

  let { proposal, vote } = $props();

  let linkWarningDialog;

  const labelClass = "text-xs font-semibold text-muted-foreground";
  const showVersionBadge = $derived(
    (proposal?.version != null && proposal.version > 1) ||
      (Array.isArray(proposal?.versions) && proposal.versions.length > 0),
  );

  const totalBudget = $derived(proposal?.metaData?.totalBudget ?? null);
  const conversionRate = $derived(proposal?.metaData?.proposalDetails?.conversionRate ?? 0);
  const administrator = $derived(proposal?.metaData?.administrator ?? "");
  const administratorLabel = $derived.by(() => {
    const adm = String(administrator).trim();
    if (adm === "Intersect" || adm === "Yes") return "Intersect";
    if (adm === "Other" || adm === "No") return "Other";
    return adm || null;
  });
  const estimatedDuration = $derived(proposal?.metaData?.estimatedDuration);
  const submittedAt = $derived(proposal?.submittedAt);
  const updatedAt = $derived(proposal?.updatedAt);

  const proposerName = $derived(proposal?.metaData?.proposerDetails?.name ?? "");
  const legalEntityType = $derived(proposal?.metaData?.contractingParty?.legalEntityType ?? "");
  const links = $derived(
    Array.isArray(proposal?.metaData?.proposerDetails?.links)
      ? proposal.metaData.proposerDetails.links.filter(
          (l) => (l?.title ?? "").trim() || (l?.url ?? "").trim(),
        )
      : [],
  );
  const proposerHref = $derived(
    vote?.slug && proposal?.proposerId
      ? `/votes/${vote.slug}?proposer=${encodeURIComponent(proposal.proposerId)}&page=1`
      : null,
  );
  const hasProposerContent = $derived(
    proposerName.trim() || legalEntityType.trim() || links.length > 0,
  );
  const dateOptions = { dateStyle: "long", timeStyle: "short" };
</script>

<Card.Root class="gap-3 bg-slate-50" id="key-details">
  <Card.Header class="py-0 pb-0">
    <h2 id="key-details-heading" class="sr-only">Key Details</h2>
    <div class="flex items-center justify-between gap-2">
      <Card.Title class="text-xl font-medium" aria-hidden="true">Key Details</Card.Title>
      <ShareProposalPopover
        buttonLabel="Share Proposal"
        defaultText={`Check out this budget proposal: ${proposal?.title ?? ""}`.trim()}
      />
    </div>
  </Card.Header>
  <Card.Content class="grid grid-cols-1 gap-2 md:grid-cols-2 md:grid-rows-[auto_auto]">
    <div class="space-y-2 text-xs md:col-start-1 md:row-start-1">
      {#if totalBudget != null}
        <div class="bg-card text-card-foreground overflow-hidden rounded-lg border">
          <div class="flex min-w-0 gap-1.5 pt-4 pr-4 pb-2 pl-4">
            <CoinsIcon class="text-muted-foreground mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <div class="min-w-0">
              <p class="text-muted-foreground mb-1 text-xs font-medium">Requested budget</p>
              <div class="text-lg font-semibold text-(--mbo-electric-blue) tabular-nums">
                {formatAda(totalBudget)} ADA
              </div>
              <div class="text-muted-foreground mt-1 mb-2 text-xs">
                USD equivalent ${formatUsd(totalBudget * conversionRate)} (ADA/USD
                {conversionRate})*
              </div>

              <div class="mb-4 inline-flex items-center gap-1">
                This conversion rate was specified by the proposer

                <Popover.Root>
                  <Popover.Trigger class="cursor-pointer" aria-label="info">
                    <InfoIcon class="size-3 shrink-0" aria-hidden="true" />
                  </Popover.Trigger>
                  <Popover.Content class="p-3 text-xs" align="start">
                    *If Intersect is selected as the administrator, this rate is indicative only and
                    does not mean the contract will be set in that dollar value; the contract will
                    be based in ADA, and vendors are responsible for managing market conditions.
                  </Popover.Content>
                </Popover.Root>
              </div>

              <Button variant="outline" size="sm" class="mb-2 text-xs" href="#budget-summary">
                View Budget Summary
              </Button>
            </div>
          </div>
        </div>
      {/if}
      {#if administratorLabel || (estimatedDuration != null && estimatedDuration !== "")}
        <div
          class="bg-card text-card-foreground divide-border grid grid-cols-2 divide-x overflow-hidden rounded-lg border"
        >
          <Popover.Root>
            <Popover.Trigger
              class="cursor-pointer"
              openOnHover={true}
              aria-label="More information about estimated duration"
            >
              <div class="flex min-w-0 gap-1.5 p-4">
                <ClockIcon
                  class="text-muted-foreground mt-0.5 size-3.5 shrink-0"
                  aria-hidden="true"
                />
                <div class="min-w-0 text-left">
                  <p class="text-muted-foreground mb-1 text-xs font-medium">Estimated duration</p>
                  <span class="inline-flex items-center gap-1 font-medium">
                    {#if estimatedDuration != null && estimatedDuration !== ""}
                      {Number(estimatedDuration) === 1
                        ? "1 month"
                        : `${Number(estimatedDuration)} months`}
                      <InfoIcon class="size-3 shrink-0 text-black" aria-hidden="true" />
                    {:else}
                      <span class="text-muted-foreground">—</span>
                    {/if}
                  </span>
                </div>
              </div>
            </Popover.Trigger>
            <Popover.Content class="p-3 text-sm" align="start">
              <div class="font-medium">
                How long will your proposal need to be fully delivered? Or if you are requesting
                funding for operations, how many months will this budget cover?
              </div>
              <p class="mt-2 text-xs">
                Provide an estimated duration from the start of the work to completion. Or if your
                proposal covers ongoing operations or services, specify the number of months this
                budget is intended to support.
              </p>
            </Popover.Content>
          </Popover.Root>
          <div class="flex min-w-0 gap-1.5 p-4">
            <ShieldCheckIcon
              class="text-muted-foreground mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            <div class="min-w-0">
              <p class="text-muted-foreground mb-1 text-xs font-medium">Administrator</p>
              <p class="flex items-center gap-1 font-medium">
                {#if administratorLabel}
                  {administratorLabel}
                {:else}
                  <span class="text-muted-foreground">—</span>
                {/if}
              </p>
            </div>
          </div>
        </div>
      {/if}
    </div>

    {#if (proposal?._id ?? proposal?.id) != null || (showVersionBadge && updatedAt != null) || submittedAt != null}
      <div class="mt-4 space-y-2 md:col-start-1 md:row-start-2">
        {#if (proposal?._id ?? proposal?.id) != null}
          {@const proposalIdStr = String(proposal._id ?? proposal.id)}
          <div class="text-muted-foreground flex items-center gap-1 text-xs">
            <HashIcon class="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
            <span class={labelClass}>Proposal ID:</span>
            <button
              type="button"
              class="text-muted-foreground font-inherit cursor-pointer border-0 bg-transparent p-0 text-left hover:underline"
              title="Copy proposal ID"
              onclick={() => {
                navigator.clipboard.writeText(proposalIdStr).then(
                  () => toast.success("Proposal ID copied to clipboard"),
                  () => toast.error("Failed to copy"),
                );
              }}
            >
              {proposalIdStr}
            </button>
          </div>
        {/if}
        {#if (showVersionBadge && updatedAt != null) || submittedAt != null}
          <div class="text-muted-foreground flex items-center gap-1 text-xs">
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
              <span>
                {formatUtcInstant(submittedAt, dateOptions)}
              </span>
            {/if}
          </div>
        {/if}
      </div>
    {/if}

    {#if hasProposerContent}
      <div class="text-card-foreground overflow-hidden rounded-lg border bg-white">
        <div class="flex min-w-0 gap-1.5 pt-4 pr-4 pb-2 pl-4">
          {#if legalEntityType === "company"}
            <HomeIcon class="text-muted-foreground mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {:else}
            <UserIcon class="text-muted-foreground mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {/if}
          <div class="min-w-0">
            <p class="text-muted-foreground mb-1 text-xs font-medium">Proposer</p>
            <p class="text-foreground font-medium">
              {#if proposerHref}
                <a href={proposerHref} class="hover:underline">
                  {proposerName.trim() || "Proposer"}
                </a>
              {:else}
                <span>{proposerName.trim() || "Proposer"}</span>
              {/if}
            </p>
          </div>
        </div>
        <div class="space-y-3 px-4 pb-4 text-xs">
          {#if links.length > 0}
            <div class="border-t pt-3">
              <div class="mb-1 flex items-center gap-1.5">
                <ExternalLinkIcon
                  class="text-muted-foreground -mt-1 size-3.5 shrink-0"
                  aria-hidden="true"
                />
                <p class="text-muted-foreground mb-1 text-xs font-medium">Social Links</p>
              </div>
              <ul class="list-none space-y-2 border-b p-0 pb-3">
                {#each links as link, i (i)}
                  <li>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-primary inline-flex cursor-pointer items-start gap-1 text-xs underline hover:underline"
                      onclick={(e) => {
                        e.preventDefault();
                        linkWarningDialog.show(link.url, (link.title ?? "").trim() || link.url);
                      }}
                    >
                      <span class="ml-6 line-clamp-1 min-w-0 wrap-break-word">
                        {link.title || link.url}
                      </span>
                    </a>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
          <div class="flex flex-wrap gap-2">
            {#if proposal?.metaData?.trackRecord}
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="text-xs"
                href="#track-record"
              >
                Track Record
              </Button>
            {/if}
            {#if proposerHref}
              <Button
                href={proposerHref}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                size="sm"
                class="text-xs"
              >
                Show All Proposals
              </Button>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </Card.Content>
</Card.Root>

<LinkWarningDialog bind:this={linkWarningDialog} />
