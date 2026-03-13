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
  import Markdown from "$lib/base/Markdown.svelte";
  import ProposalCardBudget from "$lib/ProposalCardBudget.svelte";
  import ProposalCardDangerZone from "$lib/ProposalCardDangerZone.svelte";
  let { proposal, vote, showLink = true, class: className } = $props();
  let revisionDrawerOpen = $state(false);

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
    <div
      class="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start"
    >
      <Card.Title
        class="text-lg font-medium flex flex-wrap items-center gap-1 min-w-0"
      >
        <span class="inline min-w-0">
          <a href={proposalHref} class="hover:underline cursor-pointer"
            >{proposal.title || proposal.name || "Untitled Proposal"}</a
          >
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
      {#if proposal.metaData?.totalBudget != null}
        <ProposalCardBudget
          totalBudget={proposal.metaData.totalBudget}
          conversionRate={proposal.metaData?.conversionRate ??
            proposal.metaData?.proposalDetails?.conversionRate ??
            proposal.metaData?.financialAndAdministrative?.conversionRate}
          class="shrink-0"
        />
      {/if}
    </div>
  </Card.Header>
  <Card.Content class="space-y-3 px-4 sm:px-6">
    <!-- Description block: medium bold labels -->
    <div class="space-y-2 leading-tight">
      {#if proposal.metaData?.proposerDetails?.name != null && String(proposal.metaData.proposerDetails.name).trim() !== ""}
        {@const legalEntityType =
          proposal.metaData?.contractingParty?.legalEntityType}
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
                <span class="font-medium text-muted-foreground"
                  >Proposer type:</span
                >
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
      {#if proposal.updatedAt != null || proposal.submittedAt != null}
        <div class="flex items-center gap-1 text-xs text-muted-foreground">
          <ClockIcon
            class="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          {#if proposal.updatedAt != null}
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
                      {new Date(proposal.submittedAt).toLocaleString(
                        undefined,
                        {
                          dateStyle: "long",
                          timeStyle: "short",
                        },
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
          {:else if proposal.submittedAt != null}
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

    {#if proposal.summary}
      <div class="text-sm line-clamp-10 ++:first:mt-0 pt-4">
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
