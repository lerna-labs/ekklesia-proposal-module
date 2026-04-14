<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import { draftSubmissionOpen } from "$lib/voteWindowPolicy.js";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import UserIcon from "@lucide/svelte/icons/user";

  let { voteSlug = "", vote = null } = $props();

  const closedSubmissionTitle =
    "The submission period for this vote has ended (submission end date in UTC).";

  let canCreateNew = $derived(
    vote ? draftSubmissionOpen(vote, new Date()) : true,
  );
</script>

<Card.Root class="min-h-0 min-w-0 h-full gap-3">
  <Card.Header>
    <Card.Title class="text-base">Submit your proposal</Card.Title>
    <Card.Description class="text-black mt-1.5">
      Create and manage your proposals for the Cardano Budget 2026 process.
    </Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-wrap gap-2 pt-0! h-full items-end">
    {#if canCreateNew}
      <Button
        href="/dashboard/{voteSlug}/new"
        data-walletsigner-action="navigateAfterLogin"
        variant="default"
        size="sm"
        class="add-item-btn w-fit cursor-pointer gap-1 text-xs text-white"
      >
        <PlusIcon class="size-4 shrink-0" aria-hidden="true" />
        Create New Proposal
      </Button>
    {:else}
      <Button
        disabled
        variant="default"
        size="sm"
        title={closedSubmissionTitle}
        aria-label="Create New Proposal unavailable: submission period ended"
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
</Card.Root>
