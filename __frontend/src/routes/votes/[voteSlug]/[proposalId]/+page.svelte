<script>
  import { afterNavigate } from "$app/navigation";
  import { page } from "$app/state";
  import Budget2026ProposalPage from "$lib/votes/budget2026/ProposalPage.svelte";
  import DefaultProposalPage from "$lib/votes/default/ProposalPage.svelte";

  const PROPOSAL_PAGE_MAP = {
    budget2026: Budget2026ProposalPage,
  };

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

  const ProposalPageComponent = $derived(
    PROPOSAL_PAGE_MAP[vote?.form] ?? DefaultProposalPage,
  );

  const commentsHref = $derived(`${page.url.pathname}#comments`);
</script>

<div class="container mx-auto max-w-4xl py-8 px-4">
  <ProposalPageComponent
    {proposal}
    {vote}
    pillars={pillars}
    {commentCount}
    {backToVoteUrl}
    {voteUrl}
    {currentVersionHref}
    {showComments}
    {commentsHref}
  />
</div>
