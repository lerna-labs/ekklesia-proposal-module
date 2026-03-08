<script>
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button";
  import ProposalCard from "$lib/ProposalCard.svelte";
  import Comments from "$lib/comments/Comments.svelte";
  let { data } = $props();

  let { vote, proposal, pillars = [], commentCount } = $derived(data);
  const voteSlug = $derived(page.params.voteSlug ?? "");
  const voteUrl = $derived(voteSlug ? `/votes/${voteSlug}` : "/votes");
  const isArchived = $derived(proposal?.status === "archived");
  const currentVersionHref = $derived(
    isArchived && proposal?.currentProposalId && voteSlug
      ? `/votes/${voteSlug}/${proposal.currentProposalId}`
      : null,
  );

  const isWithdrawn = $derived(
    proposal?.status === "withdrawnByAdmin" ||
      proposal?.status === "withdrawnByProposer",
  );
  const showComments = $derived(
    proposal &&
      proposal.status !== "draft" &&
      proposal.status !== "archived" &&
      (!isWithdrawn || (commentCount ?? 0) > 0),
  );
</script>

<div class="container mx-auto max-w-4xl py-8 px-4">
  <div class="mb-6">
    {#if currentVersionHref}
      <Button href={currentVersionHref} variant="ghost" size="sm">
        See current version of this proposal
      </Button>
    {:else}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onclick={() => goto(voteUrl)}
      >
        ← Back to vote
      </Button>
    {/if}
  </div>

  {#if showComments}
    <Comments proposalId={proposal._id} {proposal} {vote} />
  {/if}
</div>
