<script>
  import ProposalRevisionHistory from "$lib/ProposalRevisionHistory.svelte";
  import { Button } from "$lib/components/ui/button";
  let { proposal, vote } = $props();

  let revisionDrawerOpen = $state(false);

  const showVersionBadge = $derived(
    (proposal?.version != null && proposal.version > 1) ||
      (Array.isArray(proposal?.versions) && proposal.versions.length > 0),
  );
</script>

<h1 class="text-4xl font-medium min-w-0">
  {proposal?.title || proposal?.name || "Untitled Proposal"}
</h1>

<Button
  variant="outline"
  size="sm"
  type="button"
  onclick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    revisionDrawerOpen = true;
  }}
  class="text-xs font-normal shrink-0 align-baseline ml-0 -top-1 relative"
  aria-label="View revision history"
  title="View revision history"
>
  Version {proposal?.version ?? 1}
</Button>

<ProposalRevisionHistory {proposal} {vote} bind:open={revisionDrawerOpen} />
