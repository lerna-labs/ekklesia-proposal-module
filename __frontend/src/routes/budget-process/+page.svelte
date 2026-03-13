<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
</script>

<section class="container mx-auto max-w-4xl py-8 px-4">
  <div>
    <h1 class="text-2xl font-semibold mb-6">Cardano Budget Process</h1>
    <p class="mb-4">
      This portal exists to support the <strong
        >Cardano Ecosystem Budget Process</strong
      >
      facilitated by Intersect.
    </p>

    <p class="mb-4">
      This budget process, designed by the Cardano Budget Committee and
      supported by Cardano DReps, provides a <strong
        >transparent, structured, and strategic way to allocate Treasury funds</strong
      > to initiatives that contribute to the long-term growth of the Cardano ecosystem.
    </p>

    <p class="mb-4">
      Proposals submitted through this process will follow the defined budgeting
      workflow, which includes <strong
        >DRep feedback, DRep off-chain voting, ahead of the on-chain treasury
        withdrawals.</strong
      >
    </p>

    <p>
      You can review the budget process approved by DReps <a
        href="https://miro.com/app/board/uXjVGE0i134=/?moveToWidget=3458764662651633783&cot=14"
        target="_blank"
        class="link">here</a
      >
    </p>
  </div>

  <Card.Root class="mt-8 sm:w-1/2">
    <Card.Header>
      <Card.Title class="pb-4">Proposals</Card.Title>
      <Card.Description class="text-black">
        In this section you can <strong>Submit</strong>, <strong>View</strong>
        and <strong>Comment</strong> on Proposals.
      </Card.Description>
    </Card.Header>
    <Card.Footer>
      <Button
        href="/votes/cardano-budget-2026"
        size="sm"
        class="w-full text-xs bg-(--mbo-electric-blue) text-white hover:bg-(--mbo-cardano-blue) hover:border-(--mbo-cardano-blue)"
        >View Proposals</Button
      >
    </Card.Footer>
  </Card.Root>
</section>
