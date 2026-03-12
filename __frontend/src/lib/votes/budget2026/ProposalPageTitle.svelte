<script>
  import ProposalRevisionHistory from "$lib/ProposalRevisionHistory.svelte";

  let { proposal, vote } = $props();

  let revisionDrawerOpen = $state(false);

  const showVersionBadge = $derived(
    (proposal?.version != null && proposal.version > 1) ||
      (Array.isArray(proposal?.versions) && proposal.versions.length > 0),
  );
</script>

<h1 class="text-4xl font-medium min-w-0">
  <span class="inline min-w-0">
    <span>{proposal?.title || proposal?.name || "Untitled Proposal"}</span>
    {#if showVersionBadge}
      <button
        type="button"
        onclick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          revisionDrawerOpen = true;
        }}
        class="inline-flex items-center rounded-md border border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 px-2 py-0.5 text-xs font-normal shrink-0 cursor-pointer transition-colors align-baseline ml-0 -top-1 relative"
        aria-label="View revision history"
        title="View revision history"
      >
        Version {proposal?.version ?? 1}
      </button>
    {/if}
  </span>
</h1>

<ProposalRevisionHistory
  {proposal}
  {vote}
  bind:open={revisionDrawerOpen}
/>
