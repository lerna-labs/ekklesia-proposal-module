<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import {
    canShowVotingUi,
    draftSubmissionOpen,
    buildVoteVotingUrl,
  } from "$lib/voteWindowPolicy.js";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import UserIcon from "@lucide/svelte/icons/user";
  import VoteIcon from "@lucide/svelte/icons/vote";

  let { vote = null, policyNow = new Date() } = $props();

  const closedSubmissionTitle =
    "The submission period for this vote has ended (submission end date in UTC).";
  const missingVoteSlugTitle =
    "Cannot create a new application: this vote has no URL slug (contact an administrator).";

  const voteTitle = $derived(vote?.title ?? vote?.name ?? "this vote");
  const votingHref = $derived(buildVoteVotingUrl(vote));
  const showVotingCta = $derived(canShowVotingUi(vote, policyNow) && votingHref);
</script>

<Card.Root class="h-full min-h-0 min-w-0 gap-3">
  {#if showVotingCta}
    <Card.Header>
      <Card.Title class="text-base">Voting</Card.Title>
      <Card.Description class="mt-1.5 text-black">
        The voting for the <span class="font-medium">{voteTitle}</span> is now open. Click on the button
        below to go the voting page.
      </Card.Description>
    </Card.Header>
    <Card.Content class="flex h-full flex-wrap items-end gap-2 pt-0!">
      <Button
        href={votingHref}
        target="_blank"
        rel="noopener noreferrer"
        variant="secondary"
        size="sm"
        class="w-fit shrink-0 animate-pulse cursor-pointer bg-(--mbo-electric-blue) text-xs text-white hover:border-(--mbo-cardano-blue) hover:bg-(--mbo-cardano-blue)"
      >
        <VoteIcon class="mr-1 size-4" aria-hidden="true" />
        Vote Now!
      </Button>
    </Card.Content>
  {:else}
    <Card.Header>
      <Card.Title class="text-base">Submit your candidacy</Card.Title>
      <Card.Description class="mt-1.5 text-black">
        Create and manage your candidacy for the Constitutional Committee Election
      </Card.Description>
    </Card.Header>
    <Card.Content class="flex h-full flex-wrap items-end gap-2 pt-0!">
      {#if vote?.slug && draftSubmissionOpen(vote, policyNow)}
        <Button
          href="/dashboard/{vote.slug}/new"
          data-walletsigner-action="navigateAfterLogin"
          variant="default"
          size="sm"
          class="add-item-btn w-fit cursor-pointer gap-1 text-xs text-white"
        >
          <PlusIcon class="size-4 shrink-0" aria-hidden="true" />
          Create New Candidacy
        </Button>
      {:else if !vote?.slug}
        <Button
          disabled
          variant="default"
          size="sm"
          title={missingVoteSlugTitle}
          aria-label="Create New Application unavailable — vote has no slug"
          class="add-item-btn w-fit cursor-not-allowed gap-1 text-xs text-white opacity-70"
        >
          <PlusIcon class="size-4 shrink-0" aria-hidden="true" />
          Create New Application
        </Button>
      {:else}
        <Button
          disabled
          variant="default"
          size="sm"
          title={closedSubmissionTitle}
          aria-label="Create New Application unavailable — submission period ended"
          class="add-item-btn w-fit cursor-not-allowed gap-1 text-xs text-white opacity-70"
        >
          <PlusIcon class="size-4 shrink-0" aria-hidden="true" />
          Create New Proposal
        </Button>
      {/if}
      <Button
        href="/dashboard#proposals"
        data-walletsigner-action="navigateAfterLogin"
        variant="outline"
        size="sm"
        class=" w-fit cursor-pointer gap-1 text-xs "
      >
        <UserIcon class="size-4 shrink-0" aria-hidden="true" />
        My Drafts
      </Button>
    </Card.Content>
  {/if}
</Card.Root>
