<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
</script>

<section class="container mx-auto max-w-4xl py-8 px-4">
  <div>
    <h1 class="text-2xl font-semibold mb-6">
      Intersect pre-onchain Governance votes
    </h1>
    <p>
      This portal exists to support the on-chain Cardano governance by providing
      DReps and general community sentiment check ahead of a governance action
      and also for general community polling.
    </p>
  </div>

  <div class="flex sm:flex-row flex-col gap-4 mt-8">
    <Card.Root class="sm:w-1/2">
      <Card.Header>
        <Card.Title class="pb-4">Budget Process</Card.Title>
        <Card.Description class="text-black">
          This section is dedicated to the Cardano Budget Process facilitated by
          Intersect.
        </Card.Description>
      </Card.Header>
      <Card.Footer>
        <Button
          href="/budget-process"
          size="sm"
          class="w-full text-xs bg-(--mbo-electric-blue) text-white hover:bg-(--mbo-cardano-blue) hover:border-(--mbo-cardano-blue)"
        >
          View Budget Process
        </Button>
      </Card.Footer>
    </Card.Root>

    <Card.Root class="sm:w-1/2">
      <Card.Header>
        <Card.Title class="pb-4">Docs & Guides</Card.Title>
        <Card.Description class="text-black">
          For all the guides related to this tool please check our
          documentation.
        </Card.Description>
      </Card.Header>
      <Card.Footer>
        <Button
          href="https://docs.hydra-voting.intersectmbo.org"
          target="_blank"
          size="sm"
          class="w-full text-xs"
          variant="outline"
        >
          View Docs
        </Button>
      </Card.Footer>
    </Card.Root>
  </div>
</section>
