<script>
  import { invalidateAll } from "$app/navigation";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import ProposalWithdrawn from "$lib/ProposalWithdrawn.svelte";
  import { user } from "$stores/sessionManager.js";
  import MessageSquareIcon from "@lucide/svelte/icons/message-square";
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import HashIcon from "@lucide/svelte/icons/hash";
  import UserIcon from "@lucide/svelte/icons/user";
  import ClockIcon from "@lucide/svelte/icons/clock";
  import { formatUtcInstant } from "$lib/formatUtc.js";
  import Markdown from "$lib/base/Markdown.svelte";
  import ProposalCardDangerZone from "$lib/ProposalCardDangerZone.svelte";
  import ProposalRevisionHistory from "$lib/ProposalRevisionHistory.svelte";
  import { toast } from "svelte-sonner";

  let {
    proposal,
    vote,
    showLink = true,
    class: className,
  } = $props();

  let revisionDrawerOpen = $state(false);
  let withdrawalDetailsDialogOpen = $state(false);

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

  const proposalHref = $derived(
    vote && (proposal._id || proposal.id)
      ? `/votes/${vote.slug}/${proposal._id || proposal.id}`
      : null,
  );
  const commentsHref = $derived(
    proposalHref ? `${proposalHref}#comments` : null,
  );
  const commentCount = $derived(
    proposal?.commentCount != null ? Number(proposal.commentCount) : null,
  );
  const proposerHref = $derived(
    vote?.slug && proposal?.proposerId
      ? `/votes/${vote.slug}?proposer=${encodeURIComponent(proposal.proposerId)}&page=1`
      : null,
  );

  const labelClass = "text-xs font-semibold text-muted-foreground";

  const showVersionBadge = $derived(
    (proposal?.version != null && proposal.version > 1) ||
      (Array.isArray(proposal?.versions) && proposal.versions.length > 0),
  );
</script>

<Card.Root
  class="hover:shadow-md transition-shadow gap-y-3 py-4 sm:py-6 {className ||
    ''} {proposal?.status === 'withdrawnByProposer' ||
  proposal?.status === 'withdrawnByAdmin'
    ? 'bg-red-100/50'
    : ''}"
>
  <Card.Header class="relative pb-0 px-4 sm:px-6">
    <Card.Title
      class="text-lg font-medium flex flex-wrap items-center gap-1 min-w-0"
    >
      <span class="inline min-w-0">
        <a href={proposalHref} class="hover:underline cursor-pointer"
          >{proposal.title || proposal.name || "Untitled Proposal"}</a
        >
        {#if showVersionBadge}
          <button
            type="button"
            onclick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              revisionDrawerOpen = true;
            }}
            class="inline-flex items-center rounded-md border border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 px-2 py-0.5 text-xs font-normal shrink-0 cursor-pointer transition-colors ml-0 align-baseline"
            aria-label="View revision history"
            title="View revision history"
          >
            Version {proposal?.version ?? 1}
          </button>
        {/if}
      </span>
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
  </Card.Header>
  <Card.Content class="space-y-3 px-4 sm:px-6">
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
            class="hover:underline cursor-pointer bg-transparent border-0 p-0 text-left font-inherit text-inherit"
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
      {#if proposal?.proposerId != null && String(proposal.proposerId).trim() !== ""}
        {@const proposerIdStr = String(proposal.proposerId).trim()}
        <div class="flex items-center gap-1 text-xs text-muted-foreground">
          <UserIcon
            class="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span class={labelClass}>Proposer:</span>
          {#if proposerHref}
            <a
              href={proposerHref}
              class="text-muted-foreground hover:underline cursor-pointer"
              title="Show all proposals by this proposer"
            >
              {proposerIdStr}
            </a>
          {:else}
            <span>{proposerIdStr}</span>
          {/if}
        </div>
      {/if}
      {#if (showVersionBadge && proposal.updatedAt != null) || proposal.submittedAt != null}
        <div class="flex items-center gap-1 text-xs text-muted-foreground">
          <ClockIcon
            class="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          {#if showVersionBadge && proposal.updatedAt != null}
            <span class={labelClass}>Last updated:</span>
            <span>
              {formatUtcInstant(proposal.updatedAt, {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </span>
          {:else if proposal.submittedAt != null}
            <span class={labelClass}>Submitted at:</span>
            <span>
              {formatUtcInstant(proposal.submittedAt, {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </span>
          {/if}
        </div>
      {/if}
    </div>

    {#if proposal.summary}
      <div class="text-sm line-clamp-10 ++:first:mt-0 pt-4">
        <Markdown content={proposal.summary} />
      </div>
    {/if}

    {#if proposal.withdrawalDetails}
      {@const wd = proposal.withdrawalDetails}
      {@const withdrawalDate = wd?.date
        ? formatUtcInstant(wd.date, {
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
            {#if wd?.category}
              <span
                class="ml-1 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-black text-white"
              >
                {wd.category}
              </span>
            {/if}
          </Card.Title>
          <Card.Description>
            This proposal was withdrawn on {withdrawalDate}
          </Card.Description>
        </Card.Header>
        <Card.Content class="space-y-1 text-sm">
          {#if wd?.comment}
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
            <Button
              href={proposalHref}
              variant="secondary"
              size="sm"
              class="text-xs shrink-0"
            >
              <FileTextIcon class="size-4 mr-1" />
              Read Proposal
            </Button>
          {/if}
          {#if commentsHref}
            <Button
              href={commentsHref}
              variant="outline"
              size="sm"
              class="text-xs shrink-0"
              aria-label={commentCount != null
                ? `${commentCount} ${commentCount === 1 ? "Comment" : "Comments"}`
                : "View comments"}
            >
              <MessageSquareIcon class="size-4 mr-1" />
              {commentCount != null ? commentCount : "—"}
              {commentCount === 1 ? "Comment" : "Comments"}
            </Button>
          {/if}
        </div>
      {/if}
      {#if canWithdraw}
        <div class="mt-2 w-full">
          <ProposalCardDangerZone
            {proposal}
            isProposer={isOwnProposal}
            onSuccess={() => invalidateAll()}
          />
        </div>
      {/if}
    </Card.Footer>
  {/if}
</Card.Root>

{#if proposal?.status === "withdrawnByAdmin" || proposal?.status === "withdrawnByProposer"}
  <ProposalWithdrawn bind:open={withdrawalDetailsDialogOpen} {proposal} />
{/if}

<ProposalRevisionHistory
  {proposal}
  {vote}
  bind:open={revisionDrawerOpen}
/>
