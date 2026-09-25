<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import BudgetProcessTimeline from "$lib/components/BudgetProcessTimeline.svelte";
  import { budgetPhases } from "$lib/votes/budget2026/timeline.js";
  import { buildVoteVotingUrl, canShowVotingUi } from "$lib/voteWindowPolicy.js";
  import VoteIcon from "@lucide/svelte/icons/vote";

  let { data } = $props();
  let vote = $derived(data.vote);
  let policyNow = $derived(new Date(data.policyNowMs ?? Date.now()));
  let showVotingCta = $derived(canShowVotingUi(vote, policyNow));
  let voteTitle = $derived(vote?.title ?? vote?.name ?? "this vote");
  let votingHref = $derived(buildVoteVotingUrl(vote));

  /** Pin “now” for the timeline while testing (`undefined` = real time). Example: `"2026-05-26T12:00:00.000Z"` or `1716724800000`. */
  // const timelineTestNow = "2026-07-29T12:00:00.000Z";
</script>

<section class="container mx-auto max-w-4xl px-4 py-8">
  <div>
    <h1 class="mb-6">Cardano Budget Process</h1>
    <p class="mb-4">
      This portal exists to support the <strong>Cardano Ecosystem Budget Process</strong>
      facilitated by Intersect.
    </p>

    <p class="mb-4">
      This budget process, designed by the Cardano Budget Committee and supported by Cardano DReps,
      provides a <strong>
        transparent, structured, and strategic way to allocate Treasury funds
      </strong>
      to initiatives that contribute to the long-term growth of the Cardano ecosystem.
    </p>

    <p class="mb-4">
      Proposals submitted through this process will follow the defined budgeting workflow, which
      includes <strong>
        DRep feedback, DRep Hydra voting, ahead of the on-chain treasury withdrawals.
      </strong>
    </p>

    <p>
      You can review the budget process approved by DReps <a
        href="https://budgetcommittee.docs.intersectmbo.org/cardano-budget-process/cardano-budget-2026-overview"
        target="_blank"
        class="link"
      >
        here
      </a>
    </p>
  </div>

  <div
    class="mt-10 grid grid-cols-1 gap-6 sm:items-stretch {showVotingCta
      ? 'sm:grid-cols-3'
      : 'sm:grid-cols-2'}"
  >
    <div class="flex h-full min-w-0 flex-col">
      <BudgetProcessTimeline phases={budgetPhases} />
    </div>

    <div class="flex h-full min-w-0 flex-col">
      <Card.Root class="h-full min-h-0 min-w-0 gap-3">
        <Card.Header>
          <Card.Title>Proposals</Card.Title>
          <!-- prettier-ignore -->
          <Card.Description class="text-black mt-3">
            In this section you can <strong>Submit</strong>,
            <strong>View</strong> and <strong>Comment</strong>
            on Proposals.
          </Card.Description>
        </Card.Header>
        <Card.Footer class="flex h-full items-end">
          <Button
            href="/votes/cardano-budget-2026"
            size="sm"
            class="w-full bg-(--mbo-electric-blue) text-xs text-white hover:border-(--mbo-cardano-blue) hover:bg-(--mbo-cardano-blue)"
          >
            View Proposals
          </Button>
        </Card.Footer>
      </Card.Root>
    </div>

    {#if showVotingCta && votingHref}
      <div class="flex h-full min-w-0 flex-col">
        <Card.Root class="h-full min-h-0 min-w-0 gap-3">
          <Card.Header>
            <Card.Title class="text-base">Voting</Card.Title>
            <Card.Description class="mt-1.5 text-black">
              The voting for the <span class="font-medium">{voteTitle}</span>
              is now open. Click on the button below to go the voting page.
            </Card.Description>
          </Card.Header>
          <Card.Footer class="flex h-full items-end">
            <Button
              href={votingHref}
              target="_blank"
              rel="noopener noreferrer"
              size="sm"
              class="w-full bg-(--mbo-electric-blue) text-xs text-white hover:border-(--mbo-cardano-blue) hover:bg-(--mbo-cardano-blue)"
            >
              <VoteIcon class="mr-1 size-4" aria-hidden="true" />
              Vote Now!
            </Button>
          </Card.Footer>
        </Card.Root>
      </div>
    {/if}
  </div>
</section>
