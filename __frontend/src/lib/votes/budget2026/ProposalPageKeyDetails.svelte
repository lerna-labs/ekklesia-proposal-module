<script>
  import * as Card from "$lib/components/ui/card";
  import * as Popover from "$lib/components/ui/popover";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import MarkdownModal from "$lib/components/MarkdownModal.svelte";
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

  import Markdown from "$lib/base/Markdown.svelte";
  import * as Accordion from "$lib/components/ui/accordion/index.js";

  let { proposal, vote, pillars = [] } = $props();

  const summary = $derived(proposal?.summary ?? "");
  const trackRecord = $derived(proposal?.metaData?.trackRecord ?? "");

  let otherAdminModalOpen = $state(false);
  let linkWarningDialog;

  const labelClass = "text-xs font-semibold text-muted-foreground";
  const showVersionBadge = $derived(
    (proposal?.version != null && proposal.version > 1) ||
      (Array.isArray(proposal?.versions) && proposal.versions.length > 0),
  );

  const totalBudget = $derived(proposal?.metaData?.totalBudget ?? null);
  const conversionRate = $derived(
    proposal?.metaData?.proposalDetails?.conversionRate ?? 0,
  );
  const administrator = $derived(proposal?.metaData?.administrator ?? "");
  const otherAdministrator = $derived(
    proposal?.metaData?.otherAdministrator ?? "",
  );
  const administratorLabel = $derived.by(() => {
    const adm = String(administrator).trim();
    if (adm === "Intersect" || adm === "Yes") return "Intersect";
    if (adm === "Other" || adm === "No") return "Other";
    return adm || null;
  });
  const isOtherAdministrator = $derived(
    administrator === "Other" || administrator === "No",
  );
  const estimatedDuration = $derived(proposal?.metaData?.estimatedDuration);
  const submittedAt = $derived(proposal?.submittedAt);
  const updatedAt = $derived(proposal?.updatedAt);

  const proposerName = $derived(
    proposal?.metaData?.proposerDetails?.name ?? "",
  );
  const legalEntityType = $derived(
    proposal?.metaData?.contractingParty?.legalEntityType ?? "",
  );
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

<Card.Root class="bg-slate-50" id="key-details">
  <Card.Header class="py-0">
    <Card.Title class="text-xl font-medium">Key Details</Card.Title>
  </Card.Header>
  <Card.Content
    class="grid grid-cols-1 md:grid-cols-2 gap-2 md:grid-rows-[auto_auto]"
  >
    <div class="space-y-2 text-xs md:row-start-1 md:col-start-1">
      {#if totalBudget != null}
        <div
          class="rounded-lg border bg-card text-card-foreground overflow-hidden"
        >
          <div class="pt-4 pr-4 pl-4 pb-2 min-w-0 flex gap-1.5">
            <CoinsIcon
              class="size-3.5 shrink-0 mt-0.5 text-muted-foreground"
              aria-hidden="true"
            />
            <div class="min-w-0">
              <p class="text-xs font-medium text-muted-foreground mb-1"
                >Requested budget</p
              >
              <div
                class="tabular-nums text-lg font-semibold text-(--mbo-electric-blue)"
                >{formatAda(totalBudget)} ADA</div
              >
              <div class="text-xs text-muted-foreground mt-1 mb-2">
                USD equivalent ${formatUsd(totalBudget * conversionRate)} (ADA/USD
                {conversionRate})
              </div>

              <Button
                variant="outline"
                size="sm"
                class="text-xs mb-2"
                href="#budget-summary"
              >
                View budget breakdown
              </Button>
            </div>
          </div>
        </div>
      {/if}
      {#if administratorLabel || (estimatedDuration != null && estimatedDuration !== "")}
        <div
          class="rounded-lg border bg-card text-card-foreground grid grid-cols-2 divide-x divide-border overflow-hidden"
        >
          <div class="p-4 min-w-0 flex gap-1.5">
            <ClockIcon
              class="size-3.5 shrink-0 mt-0.5 text-muted-foreground"
              aria-hidden="true"
            />
            <div class="min-w-0">
              <p class="text-xs font-medium text-muted-foreground mb-1"
                >Estimated duration</p
              >
              <span class="font-medium">
                {#if estimatedDuration != null && estimatedDuration !== ""}
                  {Number(estimatedDuration) === 1
                    ? "1 month"
                    : `${Number(estimatedDuration)} months`}
                {:else}
                  <span class="text-muted-foreground">—</span>
                {/if}
              </span>
            </div>
          </div>
          <div class="p-4 min-w-0 flex gap-1.5">
            <ShieldCheckIcon
              class="size-3.5 shrink-0 mt-0.5 text-muted-foreground"
              aria-hidden="true"
            />
            <div class="min-w-0">
              <p class="text-xs font-medium text-muted-foreground mb-1"
                >Administrator</p
              >
              <p class="flex items-center gap-1">
                {#if administratorLabel}
                  {#if isOtherAdministrator}
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 cursor-pointer rounded hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Show other administrator details"
                      onclick={() => (otherAdminModalOpen = true)}
                    >
                      <span class="font-medium">{administratorLabel}</span>
                      <InfoIcon
                        class="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </button>
                  {:else}
                    {administratorLabel}
                  {/if}
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
      <div class="mt-4 space-y-2 md:row-start-2 md:col-start-1">
        {#if (proposal?._id ?? proposal?.id) != null}
          {@const proposalIdStr = String(proposal._id ?? proposal.id)}
          <div class="flex items-center gap-1 text-xs text-muted-foreground">
            <HashIcon
              class="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span class={labelClass}>Proposal ID:</span>
            <button
              type="button"
              class="text-muted-foreground hover:underline cursor-pointer bg-transparent border-0 p-0 text-left font-inherit"
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
          <div class="flex items-center gap-1 text-xs text-muted-foreground">
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
                  {new Date(updatedAt).toLocaleString(undefined, dateOptions)}
                </Popover.Trigger>
                <Popover.Content class="w-auto p-3" align="start">
                  <div class="text-xs space-y-1">
                    {#if submittedAt != null}
                      <p>
                        <span class="font-medium text-muted-foreground">
                          Submitted:
                        </span>
                        {new Date(submittedAt).toLocaleString(
                          undefined,
                          dateOptions,
                        )}
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
              <span>
                {new Date(submittedAt).toLocaleString(undefined, dateOptions)}
              </span>
            {/if}
          </div>
        {/if}
      </div>
    {/if}

    {#if hasProposerContent}
      <div
        class="rounded-lg border bg-white text-card-foreground overflow-hidden"
      >
        <div class="pt-4 pr-4 pl-4 pb-2 min-w-0 flex gap-1.5">
          {#if legalEntityType === "company"}
            <HomeIcon
              class="size-3.5 shrink-0 mt-0.5 text-muted-foreground"
              aria-hidden="true"
            />
          {:else}
            <UserIcon
              class="size-3.5 shrink-0 mt-0.5 text-muted-foreground"
              aria-hidden="true"
            />
          {/if}
          <div class="min-w-0">
            <p class="text-xs font-medium text-muted-foreground mb-1"
              >Proposer</p
            >
            <p class="font-medium text-foreground">
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
        <div class="px-4 pb-4 space-y-3 text-xs">
          {#if links.length > 0}
            <div class="border-t pt-3">
              <ul class="space-y-0.5 list-none p-0">
                {#each links as link (link.url)}
                  <li>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-primary hover:underline inline-flex items-start gap-1 text-xs cursor-pointer"
                      onclick={(e) => {
                        e.preventDefault();
                        linkWarningDialog.show(
                          link.url,
                          (link.title ?? "").trim() || link.url,
                        );
                      }}
                    >
                      <ExternalLinkIcon
                        class="size-3.5 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span class="min-w-0 wrap-break-word">
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

<MarkdownModal
  bind:open={otherAdminModalOpen}
  title="Details about other administrator"
  content={otherAdministrator.trim() || "No details provided."}
/>
<LinkWarningDialog bind:this={linkWarningDialog} />
