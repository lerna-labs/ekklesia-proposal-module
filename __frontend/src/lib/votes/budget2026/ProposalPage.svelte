<script>
  import * as Card from "$lib/components/ui/card";
  import * as Button from "$lib/components/ui/button";
  import ProposalWithdrawn from "$lib/ProposalWithdrawn.svelte";
  import HashIcon from "@lucide/svelte/icons/hash";
  import UserIcon from "@lucide/svelte/icons/user";
  import HomeIcon from "@lucide/svelte/icons/home";
  import LandmarkIcon from "@lucide/svelte/icons/landmark";
  import ClockIcon from "@lucide/svelte/icons/clock";
  import * as Popover from "$lib/components/ui/popover";
  import Markdown from "$lib/base/Markdown.svelte";
  import ProposalCardBudget from "$lib/ProposalCardBudget.svelte";
  import ProposalRevisionHistory from "$lib/ProposalRevisionHistory.svelte";
  import Comments from "$lib/comments/Comments.svelte";
  import { toast } from "svelte-sonner";

  let {
    proposal,
    vote,
    pillars = [],
    commentCount = null,
    backToVoteUrl = "",
    voteUrl = "",
    currentVersionHref = null,
    showComments = false,
    commentsHref = "",
  } = $props();

  let revisionDrawerOpen = $state(false);
  let withdrawalDetailsDialogOpen = $state(false);

  const proposerHref = $derived(
    vote?.slug && proposal?.proposerId
      ? `/votes/${vote.slug}?proposer=${encodeURIComponent(proposal.proposerId)}&page=1`
      : null,
  );

  const pillarIds = $derived(
    proposal?.metaData?.strategyFramework?.pillars ?? [],
  );
  const pillarEntries = $derived(
    Array.isArray(pillars) && pillarIds.length > 0
      ? pillarIds
          .map((id) => {
            const title = pillars.find((p) => String(p._id) === String(id))?.title;
            return title ? { id: String(id), title } : null;
          })
          .filter(Boolean)
      : [],
  );

  const labelClass = "text-xs font-semibold text-muted-foreground";

  const showVersionBadge = $derived(
    (proposal?.version != null && proposal.version > 1) ||
      (Array.isArray(proposal?.versions) && proposal.versions.length > 0),
  );
</script>

<!-- Back button -->
<div class="mb-6">
  {#if currentVersionHref}
    <Button.Root href={currentVersionHref} variant="ghost" size="sm">
      See current version of this proposal
    </Button.Root>
  {:else if backToVoteUrl}
    <Button.Root
      type="button"
      variant="ghost"
      size="sm"
      onclick={() => history.back()}
    >
      ← Back to vote
    </Button.Root>
  {:else}
    <Button.Root href={voteUrl} variant="ghost" size="sm">
      ← Back to vote
    </Button.Root>
  {/if}
</div>

<!-- Proposal summary (no card wrapper) -->
<div
  class="space-y-4 {proposal?.status === 'withdrawnByProposer' ||
  proposal?.status === 'withdrawnByAdmin'
    ? 'rounded-lg bg-red-100/50 p-4 sm:p-6'
    : ''}"
>
  <!-- Header: title, badges, budget -->
  <div
    class="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center"
  >
    <h1
      class="text-2xl font-semibold flex flex-wrap items-center gap-1 min-w-0"
    >
      <span>{proposal?.title || proposal?.name || "Untitled Proposal"}</span>
      {#if showVersionBadge}
        <button
          type="button"
          onclick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            revisionDrawerOpen = true;
          }}
          class="inline-flex items-center rounded-md border border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 px-2 py-0.5 text-xs font-normal shrink-0 cursor-pointer transition-colors"
          aria-label="View revision history"
          title="View revision history"
        >
          Version {proposal?.version ?? 1}
        </button>
      {/if}
      {#if proposal?.status === "withdrawnByAdmin" || proposal?.status === "withdrawnByProposer"}
        <button
          type="button"
          class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium uppercase bg-destructive text-white cursor-pointer hover:bg-destructive/90 border-0 h-5 shrink-0"
          aria-label="View withdrawal details"
          onclick={() => (withdrawalDetailsDialogOpen = true)}
        >
          {proposal.status === "withdrawnByAdmin"
            ? "Withdrawn by Admin"
            : "Withdrawn"}
        </button>
      {/if}
    </h1>
    {#if proposal?.metaData?.totalBudget != null}
      <ProposalCardBudget
        totalBudget={proposal.metaData.totalBudget}
        conversionRate={proposal.metaData?.conversionRate ??
          proposal.metaData?.proposalDetails?.conversionRate ??
          proposal.metaData?.financialAndAdministrative?.conversionRate}
        class="shrink-0"
      />
    {/if}
  </div>

  <!-- Content: metadata + full summary -->
  <div class="space-y-3">
    <div class="space-y-2 leading-tight">
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
            class="text-muted-foreground hover:underline cursor-pointer bg-transparent border-0 p-0 text-left font-inherit text-inherit"
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
      {#if proposal?.metaData?.proposerDetails?.name != null &&
        String(proposal.metaData.proposerDetails.name).trim() !== ""}
        {@const legalEntityType = proposal.metaData?.contractingParty?.legalEntityType}
        <div class="flex items-center gap-1 text-xs text-muted-foreground">
          {#if legalEntityType != null && String(legalEntityType).trim() !== ""}
            <Popover.Root>
              <Popover.Trigger
                type="button"
                class="rounded outline-none focus-visible:ring-2 focus-visible:ring-ring p-0.5 -m-0.5 cursor-help"
                aria-label="Proposer type: {legalEntityType}"
              >
                {#if legalEntityType === "company"}
                  <HomeIcon
                    class="size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                {:else}
                  <UserIcon
                    class="size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                {/if}
              </Popover.Trigger>
              <Popover.Content class="w-auto p-2 text-xs" align="start">
                <span class="font-medium text-muted-foreground">Proposer type:</span>
                <span class="ml-1">{legalEntityType}</span>
              </Popover.Content>
            </Popover.Root>
          {:else}
            <UserIcon
              class="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          {/if}
          <span class={labelClass}>Proposer Name:</span>
          {#if proposerHref}
            <a
              href={proposerHref}
              class="text-muted-foreground hover:underline cursor-pointer"
              title="Show all proposals by this proposer"
            >
              {proposal.metaData.proposerDetails.name}
            </a>
          {:else}
            <span>{proposal.metaData.proposerDetails.name}</span>
          {/if}
        </div>
      {/if}
      {#if pillarEntries.length > 0}
        <div
          class="grid grid-cols-[auto_auto_1fr] sm:flex sm:flex-wrap sm:items-center gap-x-1 gap-y-2 sm:gap-1 text-xs text-muted-foreground"
        >
          <LandmarkIcon
            class="size-3.5 shrink-0 text-muted-foreground mt-0.5 row-start-1 col-start-1 sm:row-auto sm:col-auto"
            aria-hidden="true"
          />
          <span
            class="{labelClass} shrink-0 row-start-1 col-start-2 sm:row-auto sm:col-auto"
          >
            {pillarEntries.length === 1 ? "Category:" : "Categories:"}
          </span>
          {#each pillarEntries as { id, title }, i}
            {#if i > 0}<span class="hidden sm:inline">,</span>{/if}
            <a
              href="/votes/{vote?.slug}?category={id}&page=1"
              class="text-muted-foreground hover:underline cursor-pointer w-fit col-start-3 sm:col-auto sm:row-auto {i ===
              0
                ? "row-start-1"
                : i === 1
                  ? "row-start-2"
                  : i === 2
                    ? "row-start-3"
                    : i === 3
                      ? "row-start-4"
                      : "row-start-5"}"
              title="Show other proposals in this category"
            >
              {title}
            </a>
          {/each}
        </div>
      {/if}
      {#if (showVersionBadge && proposal?.updatedAt != null) || proposal?.submittedAt != null}
        <div class="flex items-center gap-1 text-xs text-muted-foreground">
          <ClockIcon
            class="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          {#if showVersionBadge && proposal?.updatedAt != null}
            <span class={labelClass}>Last updated:</span>
            <Popover.Root>
              <Popover.Trigger
                type="button"
                class="text-muted-foreground hover:underline cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                title="Click to see submitted date"
                aria-label="Show submitted date"
              >
                {new Date(proposal.updatedAt).toLocaleString(undefined, {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              </Popover.Trigger>
              <Popover.Content class="w-auto p-3" align="start">
                <div class="text-xs space-y-1">
                  {#if proposal.submittedAt != null}
                    <p>
                      <span class="font-medium text-muted-foreground">
                        Submitted:
                      </span>
                      {new Date(proposal.submittedAt).toLocaleString(undefined, {
                        dateStyle: "long",
                        timeStyle: "short",
                      })}
                    </p>
                  {:else}
                    <p class="text-muted-foreground">
                      Submitted date not available
                    </p>
                  {/if}
                </div>
              </Popover.Content>
            </Popover.Root>
          {:else if proposal?.submittedAt != null}
            <span class={labelClass}>Submitted at:</span>
            <span>
              {new Date(proposal.submittedAt).toLocaleString(undefined, {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </span>
          {/if}
        </div>
      {/if}
    </div>

    {#if proposal?.summary}
      <div class="text-sm [&_:first-child]:mt-0 pt-4">
        <Markdown content={proposal.summary} />
      </div>
    {/if}

    {#if proposal?.withdrawalDetails}
      {@const wd = proposal.withdrawalDetails}
      {@const withdrawalDate = wd?.date
        ? new Date(wd.date).toLocaleString(undefined, {
            dateStyle: "long",
            timeStyle: "short",
          })
        : "—"}
      <Card.Root class="bg-white mt-8">
        <Card.Header>
          <Card.Title>
            {proposal.status === "withdrawnByAdmin"
              ? "Proposal Withdrawn by Admin"
              : "Proposal Withdrawn by Proposer"}

            <span
              class="ml-1 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-black text-white"
            >
              {wd.category}
            </span>
          </Card.Title>
          <Card.Description>
            This proposal was withdrawn on {withdrawalDate}
          </Card.Description>
        </Card.Header>
        <Card.Content class="space-y-1 text-sm">
          {#if wd.comment}
            <div>
              <span class="font-medium text-muted-foreground">Comment:</span>
              <Markdown content={wd.comment} class="text-sm mt-0.5" />
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    {/if}
  </div>

</div>

{#if showComments && proposal}
  <div id="comments" class="mt-8">
    <Comments proposalId={proposal._id} {proposal} {vote} />
  </div>
{/if}

{#if proposal?.status === "withdrawnByAdmin" || proposal?.status === "withdrawnByProposer"}
  <ProposalWithdrawn bind:open={withdrawalDetailsDialogOpen} {proposal} />
{/if}

<ProposalRevisionHistory
  {proposal}
  {vote}
  {pillars}
  bind:open={revisionDrawerOpen}
/>
