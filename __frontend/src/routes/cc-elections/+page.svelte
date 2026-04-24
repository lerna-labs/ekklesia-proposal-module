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
    <h1 class="mb-6">Cardano Constitutional Committee Elections 2026</h1>
    <p class="mb-4">
      In 2026, the Cardano ecosystem will elect new members to the Constitutional Committee (CC), a core governance body
      responsible for interpreting and upholding the Constitution.
    </p>

    <p class="mb-4">
      This election provides ada holders, through Delegated Representatives (DReps), with the ability to select
      candidates who will play a critical role in safeguarding the constitutional integrity of Cardano’s governance
      system.
    </p>

    <p class="mb-4">
      The process is facilitated by Intersect using its Hydra-based voting platform and is designed to ensure
      transparency, fairness, and informed participation across the ecosystem.
    </p>
  </div>

  <div class="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 sm:items-stretch sm:gap-6">
    <div class="flex h-full min-w-0 flex-col">
      <BudgetProcessTimeline phases={budgetPhases} />
    </div>

    <Card.Root class="min-h-0 min-w-0 h-full gap-3">
      <Card.Header>
        <Card.Title>Candidates</Card.Title>
        <!-- prettier-ignore -->
        <Card.Description class="text-black mt-3">
          In this section you can <strong>Submit</strong>,
          <strong>View</strong> and <strong>Comment</strong>
          on Candidates.
        </Card.Description>
      </Card.Header>
      <Card.Footer class="h-full flex items-end">
        <Button
          href="/votes/cc-vote-2026"
          size="sm"
          class="w-full text-xs bg-(--mbo-electric-blue) text-white hover:bg-(--mbo-cardano-blue) hover:border-(--mbo-cardano-blue)"
        >
          View Candidates
        </Button>
      </Card.Footer>
    </Card.Root>
  </div>
</section>
