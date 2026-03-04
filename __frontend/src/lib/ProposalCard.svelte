<script>
  import { invalidateAll } from "$app/navigation";
  import * as Card from "$lib/components/ui/card";
  import * as Button from "$lib/components/ui/button";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import ProposalWithdrawal from "$lib/ProposalWithdrawal.svelte";
  import ProposalWithdrawn from "$lib/ProposalWithdrawn.svelte";
  import { user } from "$stores/sessionManager.js";
  import MessageSquareIcon from "@lucide/svelte/icons/message-square";
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import HashIcon from "@lucide/svelte/icons/hash";
  import UserIcon from "@lucide/svelte/icons/user";
  import LandmarkIcon from "@lucide/svelte/icons/landmark";
  import ClockIcon from "@lucide/svelte/icons/clock";
  import * as Popover from "$lib/components/ui/popover";
  import Markdown from "$lib/base/Markdown.svelte";
  import ProposalCardBudget from "$lib/ProposalCardBudget.svelte";
  import ProposalCardDangerZone from "$lib/ProposalCardDangerZone.svelte";
  import { toast } from "svelte-sonner";
  let {
    proposal,
    vote,
    categories = [],
    showLink = true,
    class: className,
  } = $props();

  const isOwnProposal = $derived(
    $user?.userId &&
      proposal?.proposerId &&
      String(proposal.proposerId).trim() === String($user.userId).trim(),
  );

  const isVoteAdmin = $derived(
    vote?._id &&
      $user?.adminVoteIds &&
      Array.isArray($user.adminVoteIds) &&
      $user.adminVoteIds.includes(String(vote._id)),
  );

  const canWithdraw = $derived(
    (isOwnProposal || isVoteAdmin) && proposal?.status === "live",
  );

  let withdrawOpen = $state(false);
  let withdrawalDetailsDialogOpen = $state(false);

  const proposalHref = $derived(
    vote && (proposal._id || proposal.id)
      ? `/votes/${vote.slug}/${proposal._id || proposal.id}`
      : null,
  );
  const commentsHref = $derived(proposalHref ? `${proposalHref}#comments` : null);
  const commentCount = $derived(
    proposal?.commentCount != null ? Number(proposal.commentCount) : null,
  );
  const proposerHref = $derived(
    vote?.slug && proposal?.proposerId
      ? `/votes/${vote.slug}?proposer=${encodeURIComponent(proposal.proposerId)}&page=1`
      : null,
  );

  const pillarIds = $derived(proposal?.metaData?.strategyFramework?.pillars ?? []);
  const pillarEntries = $derived(
    Array.isArray(categories) && pillarIds.length > 0
      ? pillarIds
          .map((id) => {
            const title = categories.find((c) => String(c._id) === String(id))?.title;
            return title ? { id: String(id), title } : null;
          })
          .filter(Boolean)
      : [],
  );

  const labelClass = "text-xs font-semibold text-muted-foreground";
</script>

<Card.Root
  class="hover:shadow-md transition-shadow gap-y-3 py-4 sm:py-6 {className ||
    ''} {proposal?.status === 'withdrawnByProposer' ||
  proposal?.status === 'withdrawnByAdmin'
    ? 'bg-red-100/50'
    : ''}"
>
  <Card.Header class="relative pb-0 px-4 sm:px-6">
    <div class="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
      <Card.Title class="text-lg font-medium flex flex-wrap items-center gap-1 min-w-0">
        <span>{proposal.title || proposal.name || "Untitled Proposal"}</span>
        {#if proposal.status === "withdrawnByAdmin" || proposal.status === "withdrawnByProposer"}
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
      </Card.Title>
      {#if proposal.totalBudget !== undefined}
        <ProposalCardBudget
          totalBudget={proposal.totalBudget}
          conversionRate={proposal.metaData?.conversionRate
            ?? proposal.metaData?.proposalDetails?.conversionRate
            ?? proposal.metaData?.financialAndAdministrative?.conversionRate}
          class="shrink-0"
        />
      {/if}
    </div>
  </Card.Header>
  <Card.Content class="space-y-3 px-4 sm:px-6">
    <!-- Description block: medium bold labels -->
    <div class="space-y-2 leading-tight">
      {#if (proposal?._id ?? proposal?.id) != null}
        {@const proposalIdStr = String(proposal._id ?? proposal.id)}
        <div class="flex items-center gap-1 text-xs text-muted-foreground">
          <HashIcon class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span class={labelClass}>Proposal ID:</span>
          <button
            type="button"
            class="text-muted-foreground hover:underline cursor-pointer bg-transparent border-0 p-0 text-left font-inherit text-inherit"
            title="Copy proposal ID"
            onclick={() => {
              navigator.clipboard.writeText(proposalIdStr).then(
                () => toast.success("Proposal ID copied to clipboard"),
                () => toast.error("Failed to copy")
              );
            }}
          >
            {proposalIdStr}
          </button>
        </div>
      {/if}
      {#if proposal.metaData?.proposerDetails?.name != null && String(proposal.metaData.proposerDetails.name).trim() !== ""}
        <div class="flex items-center gap-1 text-xs text-muted-foreground">
          <UserIcon class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
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
      {#if proposal.metaData?.contractingParty?.legalEntityType != null && String(proposal.metaData.contractingParty.legalEntityType).trim() !== ""}
        <div class="flex items-center gap-1 text-xs text-muted-foreground">
          <span class={labelClass}>Proposer type:</span>
          <span>{proposal.metaData.contractingParty.legalEntityType}</span>
        </div>
      {/if}
      {#if pillarEntries.length > 0}
        <div class="grid grid-cols-[auto_auto_1fr] sm:flex sm:flex-wrap sm:items-center gap-x-1 gap-y-2 sm:gap-1 text-xs text-muted-foreground">
          <LandmarkIcon class="size-3.5 shrink-0 text-muted-foreground mt-0.5 row-start-1 col-start-1 sm:row-auto sm:col-auto" aria-hidden="true" />
          <span class="{labelClass} shrink-0 row-start-1 col-start-2 sm:row-auto sm:col-auto">{pillarEntries.length === 1 ? "Category:" : "Categories:"}</span>
          {#each pillarEntries as { id, title }, i}
            {#if i > 0}<span class="hidden sm:inline">, </span>{/if}
            <a
              href="/votes/{vote?.slug}?category={id}&page=1"
              class="text-muted-foreground hover:underline cursor-pointer w-fit col-start-3 sm:col-auto sm:row-auto {i === 0 ? 'row-start-1' : i === 1 ? 'row-start-2' : i === 2 ? 'row-start-3' : i === 3 ? 'row-start-4' : 'row-start-5'}"
              title="Show other proposals in this category"
            >
              {title}
            </a>
          {/each}
        </div>
      {/if}
      {#if proposal.updatedAt != null}
        <div class="flex items-center gap-1 text-xs text-muted-foreground">
          <ClockIcon class="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
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
                    <span class="font-medium text-muted-foreground">Submitted:</span>
                    {new Date(proposal.submittedAt).toLocaleString(undefined, {
                      dateStyle: "long",
                      timeStyle: "short",
                    })}
                  </p>
                {:else}
                  <p class="text-muted-foreground">Submitted date not available</p>
                {/if}
              </div>
            </Popover.Content>
          </Popover.Root>
        </div>
      {/if}
    </div>

    {#if proposal.summary}
      <div class="text-sm line-clamp-10 [&_:first-child]:mt-0 pt-4">
        <Markdown content={proposal.summary} />
      </div>
    {/if}

    {#if proposal.withdrawalDetails}
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
  </Card.Content>
  {#if (showLink && proposalHref) || canWithdraw || commentsHref}
    <Card.Footer class="flex flex-col items-start gap-3 pt-4 px-4 sm:px-6">
      {#if commentsHref || (showLink && proposalHref)}
        <div class="flex items-center gap-2 flex-wrap">
          {#if showLink && proposalHref}
            <Button.Root
              href={proposalHref}
              variant="secondary"
              size="sm"
              class="text-xs shrink-0 bg-(--mbo-electric-blue) text-white hover:bg-(--mbo-cardano-blue) hover:border-(--mbo-cardano-blue)"
            >
              <FileTextIcon class="size-4 mr-1" />
              Read Proposal
            </Button.Root>
          {/if}
          {#if commentsHref}
            <Button.Root
              href={commentsHref}
              variant="outline"
              size="sm"
              class="text-xs shrink-0"
            aria-label={commentCount != null
                ? `${commentCount} ${commentCount === 1 ? "Comment" : "Comments"}`
                : "View comments"}
          >
            <MessageSquareIcon class="size-4 mr-1" />
            {commentCount != null ? commentCount : "—"} {commentCount === 1 ? "Comment" : "Comments"}
            </Button.Root>
          {/if}
        </div>
      {/if}
      {#if canWithdraw}
        <div class="mt-2 w-full">
          <ProposalCardDangerZone onWithdrawClick={() => (withdrawOpen = true)} />
        </div>
      {/if}
    </Card.Footer>
  {/if}
</Card.Root>

<ProposalWithdrawal
  bind:open={withdrawOpen}
  {proposal}
  onSuccess={() => invalidateAll()}
/>

{#if proposal?.status === "withdrawnByAdmin" || proposal?.status === "withdrawnByProposer"}
  <ProposalWithdrawn bind:open={withdrawalDetailsDialogOpen} {proposal} />
{/if}
