<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import BudgetProcessTimeline from "$lib/components/BudgetProcessTimeline.svelte";
  import { budgetPhases } from "$lib/votes/budget2026/timeline.js";

  /** Pin “now” for the timeline while testing (`undefined` = real time). Example: `"2026-05-26T12:00:00.000Z"` or `1716724800000`. */
  // const timelineTestNow = "2026-07-29T12:00:00.000Z";
</script>

<section class="container mx-auto max-w-4xl py-8 px-4">
  <div>
    <h1 class="text-2xl font-semibold mb-6">Cardano Budget Process</h1>
    <p class="mb-4">
      This portal exists to support the <strong>
        Cardano Ecosystem Budget Process
      </strong>
      facilitated by Intersect.
    </p>

    <p class="mb-4">
      This budget process, designed by the Cardano Budget Committee and
      supported by Cardano DReps, provides a <strong>
        transparent, structured, and strategic way to allocate Treasury funds
      </strong>
      to initiatives that contribute to the long-term growth of the Cardano ecosystem.
    </p>

    <p class="mb-4">
      Proposals submitted through this process will follow the defined budgeting
      workflow, which includes <strong>
        DRep feedback, DRep Hydra voting, ahead of the on-chain treasury
        withdrawals.
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
    class="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 sm:items-stretch sm:gap-6"
  >
    <div class="flex h-full min-w-0 flex-col">
      <BudgetProcessTimeline phases={budgetPhases} />
    </div>

    <Card.Root class="min-h-0 min-w-0 h-full gap-3">
      <Card.Header>
        <Card.Title>Proposals</Card.Title>
        <!-- prettier-ignore -->
        <Card.Description class="text-black mt-3">
          In this section you can <strong>Submit</strong>,
          <strong>View</strong> and <strong>Comment</strong>
          on Proposals.
        </Card.Description>
      </Card.Header>
      <Card.Footer class="h-full flex items-end">
        <Button
          href="/votes/cardano-budget-2026"
          size="sm"
          class="w-full text-xs bg-(--mbo-electric-blue) text-white hover:bg-(--mbo-cardano-blue) hover:border-(--mbo-cardano-blue)"
        >
          View Proposals
        </Button>
      </Card.Footer>
    </Card.Root>
  </div>
</section>
