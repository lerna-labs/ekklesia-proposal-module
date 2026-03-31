<script>
  import { invalidateAll } from "$app/navigation";
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import ProposalWithdrawn from "$lib/ProposalWithdrawn.svelte";
  import { user } from "$stores/sessionManager.js";
  import MessageSquareIcon from "@lucide/svelte/icons/message-square";
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import UserIcon from "@lucide/svelte/icons/user";
  import HomeIcon from "@lucide/svelte/icons/home";
  import ClockIcon from "@lucide/svelte/icons/clock";
  import * as Popover from "$lib/components/ui/popover";
  import { formatUtcInstant } from "$lib/formatUtc.js";
  import Markdown from "$lib/base/Markdown.svelte";
  import ProposalCardDangerZone from "$lib/ProposalCardDangerZone.svelte";
  import { formatAda } from "$lib/utils.js";
  import { formatUsd } from "$lib/utils.js";
  let { proposal, vote, showLink = true, class: className } = $props();
  let revisionDrawerOpen = $state(false);

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

  const canWithdraw = $derived(
    (isOwnProposal || isVoteAdmin) && proposal?.status === "live",
  );

  let withdrawalDetailsDialogOpen = $state(false);

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
      class="text-lg font-medium flex flex-wrap items-center gap-1 min-w-0 line-clamp-2"
    >
      <a href={proposalHref} class="hover:underline cursor-pointer"
        >{proposal.title || proposal.name || "Untitled Proposal"}</a
      >
    </Card.Title>
    <Card.Description>
      <div class="text-xs font-medium text-muted-foreground mb-1">
        <span class="">Proposer Name:</span>
        <span class="text-black font-normal">
          {proposal.metaData?.proposerDetails?.name}
        </span>
      </div>

      <div class="text-xs font-medium text-muted-foreground mb-1">
        <span class="">
          Proposer Type: <span class="text-black font-normal">
            {capitalizeFirst(
              proposal.metaData?.contractingParty?.legalEntityType,
            )}
          </span>
        </span>
      </div>
    </Card.Description>
  </Card.Header>
  <Card.Content class="space-y-3 px-4 sm:px-6">
    <!-- Description block: medium bold labels -->

    <Card.Root
      class="rounded-lg border bg-card shadow-sm p-4 mt-2 mb-6 w-fit min-w-[200px] gap-0"
    >
      <Card.Header class="p-0 m-0">
        <Card.Title
          class="text-xs font-medium text-muted-foreground leading-none"
        >
          Requested Budget
        </Card.Title>
      </Card.Header>
      <Card.Content class="p-0 pt-0 space-y-1">
        <div class="text-black font-semibold text-md">
          {formatAda(proposal.metaData?.totalBudget)} ADA
        </div>
        <div class="text-muted-foreground text-xs">
          USD equivalent ${formatUsd(
            proposal.metaData?.totalBudget *
              (proposal.metaData?.conversionRate ?? 0),
          )} (ADA/USD {proposal.metaData?.conversionRate ?? 0})
        </div>
      </Card.Content>
    </Card.Root>

    {#if proposal.summary}
      <div>
        <div class="text-xs font-medium text-muted-foreground mb-1"
          >Overview:</div
        >
        <div class="text-sm line-clamp-10 ++:first:mt-0">
          <Markdown
            content={proposal.summary}
            class="text-xs leading-tight line-clamp-10"
          />
        </div>
      </div>
    {/if}

    <div class="flex justify-between mt-0">
      <div>
        <span class="text-xs font-medium text-muted-foreground mb-1"
          >Submitted on:</span
        >
        <span class="text-black text-xs"
          >{formatUtcInstant(proposal.submittedAt, {
            dateStyle: "short",
            timeStyle: "short",
          })}</span
        >
      </div>
      <div>
        <span class="text-xs font-medium text-muted-foreground mb-1"
          >Last edited on:</span
        >
        <span class="text-black font-normal text-xs">
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
    <Card.Footer class="flex flex-col items-start gap-3 pt-0 px-4 sm:px-6">
      {#if commentsHref || (showLink && proposalHref)}
        <div class="flex items-center gap-2 flex-wrap justify-between w-full">
          <Button
            variant="ghost"
            class="inline-flex items-center gap-2 min-w-0"
            href={commentsHref}
            aria-label="View comments"
            title="View comments"
          >
            <span class="shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide lucide-message-circle-more-icon lucide-message-circle-more"
                ><path
                  d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"
                /><path d="M8 12h.01" /><path d="M12 12h.01" /><path
                  d="M16 12h.01"
                /></svg
              >
            </span>
            <span
              class="font-semibold text-xs tabular-nums leading-none relative -top-2 -left-2"
            >
              {proposal.commentCount}
            </span>
          </Button>

          {#if showLink && proposalHref}
            <Button
              href={proposalHref}
              variant="secondary"
              size="sm"
              class="text-xs shrink-0 bg-(--mbo-electric-blue) text-white hover:bg-(--mbo-cardano-blue) hover:border-(--mbo-cardano-blue)"
            >
              <FileTextIcon class="size-4 mr-1" />
              Read Proposal
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
