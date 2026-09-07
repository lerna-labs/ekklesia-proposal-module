<script>
  import { invalidateAll } from "$app/navigation";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import ProposalWithdrawn from "$lib/ProposalWithdrawn.svelte";
  import { user } from "$stores/sessionManager.js";
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import VoteIcon from "@lucide/svelte/icons/vote";
  import MessageSquareMoreIcon from "@lucide/svelte/icons/message-square-more";
  import Markdown from "$lib/base/Markdown.svelte";
  import ProposalCardDangerZone from "$lib/ProposalCardDangerZone.svelte";
  import { formatUtcInstant } from "$lib/formatUtc.js";
  import { buildProposalVotingUrl, canShowVotingUi } from "$lib/voteWindowPolicy.js";

  let { proposal, vote, showLink = true, class: className, policyNow = new Date() } = $props();
  let withdrawalDetailsDialogOpen = $state(false);

  const TRACK_LABELS = {
    individual: "Individual",
    organisation: "Organisation",
    consortium: "Consortium",
  };

  const proposerTrackLabel = $derived.by(() => {
    const track = proposal?.metaData?.track;
    if (!track) return "";
    return TRACK_LABELS[track] ?? capitalizeFirst(track);
  });

  const overviewText = $derived.by(() => {
    const track = proposal?.metaData?.track;
    if (!track) return "";
    const motivation = proposal?.metaData?.[track]?.motivation;
    return typeof motivation === "string" ? motivation : "";
  });

  function capitalizeFirst(val) {
    const s = (val ?? "").toString();
    if (!s) return "";
    return s[0].toUpperCase() + s.slice(1);
  }

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

  const canWithdraw = $derived((isOwnProposal || isVoteAdmin) && proposal?.status === "live");

  const proposalHref = $derived(
    vote && (proposal._id || proposal.id)
      ? `/votes/${vote.slug}/${proposal._id || proposal.id}`
      : null,
  );
  const commentsHref = $derived(proposalHref ? `${proposalHref}#comments` : null);
  const commentCount = $derived(
    proposal?.commentCount != null ? Number(proposal.commentCount) : null,
  );

  const voteNowHref = $derived.by(() => {
    if (proposal?.status !== "live") return null;
    if (!canShowVotingUi(vote, policyNow)) return null;
    return buildProposalVotingUrl(vote, proposal._id ?? proposal.id);
  });
</script>

<Card.Root
  class="gap-y-3 py-4 transition-shadow hover:shadow-md sm:py-6 {className ||
    ''} {proposal?.status === 'withdrawnByProposer' || proposal?.status === 'withdrawnByAdmin'
    ? 'bg-red-100/50'
    : ''}"
>
  <Card.Header class="relative px-4 pb-0 sm:px-6">
    <Card.Title class="line-clamp-2 flex min-w-0 flex-wrap items-center gap-1 text-lg font-medium">
      <a href={proposalHref} class="cursor-pointer hover:underline"
        >{proposal.title || proposal.name || "Untitled Proposal"}</a
      >
    </Card.Title>
    <Card.Description>
      <div class="text-muted-foreground mb-1 text-xs font-medium">
        <span class="">
          Candidate Type: <span class="font-normal text-black">
            {proposerTrackLabel}
          </span>
        </span>
      </div>
    </Card.Description>
  </Card.Header>
  <Card.Content class="space-y-3 px-4 sm:px-6">
    {#if overviewText}
      <div>
        <div class="text-muted-foreground mb-1 text-xs font-medium">Overview:</div>
        <div class="++:first:mt-0 line-clamp-10 text-sm">
          <Markdown content={overviewText} class="line-clamp-10 text-xs leading-tight" />
        </div>
      </div>
    {/if}

    <div class="mt-0 flex justify-between">
      <div>
        <span class="text-muted-foreground mb-1 text-xs font-medium">Submitted on:</span>
        <span class="text-xs text-black"
          >{formatUtcInstant(proposal.submittedAt, {
            dateStyle: "short",
            timeStyle: "short",
          })}</span
        >
      </div>
      <div>
        <span class="text-muted-foreground mb-1 text-xs font-medium">Last edited on:</span>
        <span class="text-xs font-normal text-black">
          {formatUtcInstant(proposal.updatedAt, {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </span>
      </div>
    </div>

    {#if proposal.withdrawalDetails}
      {@const wd = proposal.withdrawalDetails}
      {@const withdrawalDate = wd?.date
        ? formatUtcInstant(wd.date, {
            dateStyle: "long",
            timeStyle: "short",
          })
        : "—"}
      <Card.Root class="mt-8 bg-white">
        <Card.Header>
          <Card.Title>
            {proposal.status === "withdrawnByAdmin"
              ? "Proposal Withdrawn by Admin"
              : "Proposal Withdrawn by Proposer"}

            <span
              class="ml-1 inline-flex items-center rounded-md bg-black px-2 py-0.5 text-xs font-medium text-white"
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
              <span class="text-muted-foreground font-medium">Comment:</span>
              <Markdown content={wd.comment} class="mt-0.5 text-sm" />
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
    {/if}
  </Card.Content>
  {#if (showLink && proposalHref) || canWithdraw || commentsHref || voteNowHref}
    <Card.Footer class="flex flex-col items-start gap-3 px-4 pt-0 sm:px-6">
      {#if commentsHref || (showLink && proposalHref) || voteNowHref}
        <div class="flex w-full flex-wrap items-center justify-between gap-2">
          {#if commentsHref}
            <Button
              href={commentsHref}
              variant="outline"
              size="sm"
              class="shrink-0 text-xs"
              aria-label={commentCount != null ? `Comments (${commentCount})` : "View comments"}
            >
              <MessageSquareMoreIcon class="mr-1 size-4" />
              Comments ({commentCount != null ? commentCount : "-"})
            </Button>
          {/if}

          <div class="flex shrink-0 flex-wrap items-center gap-2">
            {#if showLink && proposalHref}
              <Button
                href={proposalHref}
                variant="secondary"
                size="sm"
                class="shrink-0 bg-(--mbo-electric-blue) text-xs text-white hover:border-(--mbo-cardano-blue) hover:bg-(--mbo-cardano-blue)"
              >
                <FileTextIcon class="mr-1 size-4" />
                Read Proposal
              </Button>
            {/if}
            {#if voteNowHref}
              <Button
                href={voteNowHref}
                target="_blank"
                rel="noopener noreferrer"
                variant="secondary"
                size="sm"
                class="shrink-0 animate-pulse bg-(--mbo-electric-blue) text-xs text-white hover:border-(--mbo-cardano-blue) hover:bg-(--mbo-cardano-blue)"
              >
                <VoteIcon class="mr-1 size-4" aria-hidden="true" />
                Vote Now!
              </Button>
            {/if}
          </div>
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
