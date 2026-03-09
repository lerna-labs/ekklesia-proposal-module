<script>
  import * as Card from "$lib/components/ui/card";
  import * as Popover from "$lib/components/ui/popover";
  import { Button } from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge";
  import MarkdownModal from "$lib/components/MarkdownModal.svelte";
  import { formatAda } from "$lib/utils.js";
  import ClockIcon from "@lucide/svelte/icons/clock";
  import HashIcon from "@lucide/svelte/icons/hash";
  import HomeIcon from "@lucide/svelte/icons/home";
  import ShieldCheckIcon from "@lucide/svelte/icons/shield-check";
  import UserIcon from "@lucide/svelte/icons/user";
  import CoinsIcon from "@lucide/svelte/icons/coins";
  import InfoIcon from "@lucide/svelte/icons/info";
  import { toast } from "svelte-sonner";

  let { proposal, vote, pillars = [] } = $props();

  let trackRecordOpen = $state(false);
  let otherAdminModalOpen = $state(false);
  let repaymentCircumstancesModalOpen = $state(false);

  const labelClass = "text-xs font-semibold text-muted-foreground";
  const showVersionBadge = $derived(
    (proposal?.version != null && proposal.version > 1) ||
      (Array.isArray(proposal?.versions) && proposal.versions.length > 0),
  );

  const totalBudget = $derived(proposal?.metaData?.totalBudget ?? null);
  const treasuryRepayment = $derived(
    proposal?.metaData?.treasuryRepayment ?? "",
  );
  const treasuryRepaymentCircumstances = $derived(
    proposal?.metaData?.treasuryRepaymentCircumstances ?? "",
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

  const trackRecord = $derived(proposal?.metaData?.trackRecord ?? "");
  const hasTrackRecord = $derived(trackRecord.trim().length > 0);
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
    proposerName.trim() ||
      legalEntityType.trim() ||
      links.length > 0 ||
      hasTrackRecord,
  );
  const dateOptions = { dateStyle: "long", timeStyle: "short" };
</script>

<Card.Root class="h-full">
  <Card.Content class="space-y-3 text-sm">
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
            <p
              class="tabular-nums text-lg font-semibold text-(--mbo-electric-blue)"
              >{formatAda(totalBudget)} ADA</p
            >
          </div>
        </div>
        <div class="px-4 pb-4 pt-0 flex gap-1 min-w-0">
          <span class="size-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <div class="min-w-0">
            {#if treasuryRepayment === "Yes"}
              <button
                type="button"
                class="cursor-pointer rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Show repayment circumstances"
                onclick={() => (repaymentCircumstancesModalOpen = true)}
              >
                <Badge
                  class="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0 font-normal cursor-pointer hover:opacity-90"
                  >Treasury Repayment</Badge
                >
              </button>
            {:else}
              <Badge
                class="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-0 font-normal"
                >No Treasury Repayment</Badge
              >
            {/if}
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
            <p>
              {#if estimatedDuration != null && estimatedDuration !== ""}
                {Number(estimatedDuration) === 1
                  ? "1 month"
                  : `${Number(estimatedDuration)} months`}
              {:else}
                <span class="text-muted-foreground">—</span>
              {/if}
            </p>
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
                    <span>{administratorLabel}</span>
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

    {#if hasProposerContent}
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            {#if legalEntityType === "company"}
              <HomeIcon class="size-4 shrink-0" aria-hidden="true" />
            {:else if legalEntityType.trim()}
              <UserIcon class="size-4 shrink-0" aria-hidden="true" />
            {/if}
            {#if proposerHref}
              <a
                href={proposerHref}
                class="font-semibold text-foreground hover:underline"
              >
                {proposerName.trim() || "Proposer"}
              </a>
            {:else}
              <span>{proposerName.trim() || "Proposer"}</span>
            {/if}
          </Card.Title>
        </Card.Header>
        <Card.Content class="space-y-3 text-sm">
          {#if links.length > 0}
            <div>
              <p class="font-medium text-muted-foreground mb-0.5">Links</p>
              <ul class="space-y-1">
                {#each links as link (link.url)}
                  <li>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-primary hover:underline"
                    >
                      {link.title || link.url}
                    </a>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
          {#if hasTrackRecord || proposerHref}
            <div class="flex flex-wrap gap-2">
              {#if hasTrackRecord}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="text-xs"
                  onclick={() => (trackRecordOpen = true)}
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
          {/if}
        </Card.Content>
      </Card.Root>
    {/if}
    {#if (proposal?._id ?? proposal?.id) != null || (showVersionBadge && updatedAt != null) || submittedAt != null}
      <div class="mt-4 space-y-1">
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
    {#if !administratorLabel && (estimatedDuration == null || estimatedDuration === "") && totalBudget == null && !hasProposerContent && !((showVersionBadge && updatedAt != null) || submittedAt != null) && (proposal?._id ?? proposal?.id) == null}
      <p class="text-muted-foreground">No proposal details available.</p>
    {/if}
  </Card.Content>
</Card.Root>

<MarkdownModal
  bind:open={otherAdminModalOpen}
  title="Details about other administrator"
  content={otherAdministrator.trim() || "No details provided."}
/>
<MarkdownModal
  bind:open={repaymentCircumstancesModalOpen}
  title="Repayment circumstances"
  content={treasuryRepaymentCircumstances.trim() || "No details provided."}
/>
<MarkdownModal
  bind:open={trackRecordOpen}
  title="Track Record"
  content={trackRecord}
  contentClass="text-sm [&_.markdown]:text-inherit"
  class="sm:max-w-lg max-h-[90dvh] overflow-y-auto flex flex-col"
  description="Proposer's track record and relevant experience"
/>
