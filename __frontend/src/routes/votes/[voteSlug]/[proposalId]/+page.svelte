<script>
  import { afterNavigate } from "$app/navigation";
  import { page } from "$app/state";
  import { Button } from "$lib/components/ui/button";
  import ProposalCard from "$lib/ProposalCard.svelte";
  import Comments from "$lib/comments/Comments.svelte";
  let { data } = $props();

  let { vote, proposal, pillars = [], commentCount } = $derived(data);
  const voteSlug = $derived(page.params.voteSlug ?? "");
  const listPath = $derived(voteSlug ? `/votes/${voteSlug}` : "");

  let backToVoteUrl = $state("");

  afterNavigate(({ from, to }) => {
    if (!listPath || !to?.url) return;
    const toPath = to.url.pathname;
    if (from?.url && from.url.pathname === listPath && toPath === page.url.pathname) {
      backToVoteUrl = from.url.pathname + (from.url.search || "");
    }
  });

  const voteUrl = $derived(backToVoteUrl || (voteSlug ? `/votes/${voteSlug}` : "/votes"));
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
    {:else if backToVoteUrl}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onclick={() => history.back()}
      >
        ← Back to vote
      </Button>
    {:else}
      <Button href={voteUrl} variant="ghost" size="sm">
        ← Back to vote
      </Button>
    {/if}
  </div>

  {#if showComments}
    <Comments proposalId={proposal._id} {proposal} {vote} />
  {/if}
</div>
