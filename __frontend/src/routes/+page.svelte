<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { ExternalLinkIcon } from "lucide-svelte";

  /** Matches [Navigation.svelte]($lib/base/Navigation.svelte) “All Voting Events”. */
  const ALL_VOTING_EVENTS_HREF = "https://intersect.ekklesia.vote/ballots";

  /** Title row auto-sized; description row fills remaining space above the footer. */
  const cardHeaderStretchDescClass =
    "min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]";

  const cardDescriptionClass = "min-h-0 self-stretch text-black text-xs";
</script>

<section class="container mx-auto max-w-4xl py-8 px-4">
  <div>
    <h1 class="mb-6">
      Intersect pre-onchain Governance votes
    </h1>
    <p>
      This portal exists to support the on-chain Cardano governance by providing
      DReps and general community sentiment check ahead of a governance action
      and also for general community polling.
    </p>
  </div>

  <div class="mt-8 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-4">
    <Card.Root class="h-full min-h-0 min-w-0">
      <Card.Header class={cardHeaderStretchDescClass}>
        <Card.Title class="pb-4">Budget Process</Card.Title>
        <Card.Description class={cardDescriptionClass}>
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

    <Card.Root class="h-full min-h-0 min-w-0">
      <Card.Header class={cardHeaderStretchDescClass}>
        <Card.Title class="pb-4">CC Elections</Card.Title>
        <Card.Description class={cardDescriptionClass}>
          This section is dedicated to the Cardano Constitutional Committee elections
          facilitated by Intersect.
        </Card.Description>
      </Card.Header>
      <Card.Footer>
        <Button
          href="/cc-elections"
          size="sm"
          class="w-full text-xs bg-(--mbo-electric-blue) text-white hover:bg-(--mbo-cardano-blue) hover:border-(--mbo-cardano-blue)"
        >
          View CC Elections
        </Button>
      </Card.Footer>
    </Card.Root>

    <Card.Root class="h-full min-h-0 min-w-0">
      <Card.Header class={cardHeaderStretchDescClass}>
        <Card.Title class="pb-4">All Voting Events</Card.Title>
        <Card.Description class={cardDescriptionClass}>
          In this section you can see and filter all voting events.
        </Card.Description>
      </Card.Header>
      <Card.Footer>
        <Button
          href={ALL_VOTING_EVENTS_HREF}
          target="_blank"
          rel="noopener noreferrer"
          size="sm"
          class="w-full text-xs bg-(--mbo-electric-blue) text-white hover:bg-(--mbo-cardano-blue) hover:border-(--mbo-cardano-blue)"
        >
          All Voting Events <ExternalLinkIcon class="size-3" />
        </Button>
      </Card.Footer>
    </Card.Root>

    <Card.Root class="h-full min-h-0 min-w-0">
      <Card.Header class={cardHeaderStretchDescClass}>
        <Card.Title class="pb-4">Docs & Guides</Card.Title>
        <Card.Description class={cardDescriptionClass}>
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
          View Docs <ExternalLinkIcon class="size-3" />
        </Button>
      </Card.Footer>
    </Card.Root>
  </div>
</section>
