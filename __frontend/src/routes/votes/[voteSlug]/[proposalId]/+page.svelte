<script>
  import { afterNavigate } from "$app/navigation";
  import { page } from "$app/state";
  import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
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

<div class="overflow-x-hidden">
  {#if currentVersionHref}
    <a
      href={currentVersionHref}
      class="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] flex w-screen max-w-none items-center bg-(--mbo-orange) py-3 text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-(--mbo-orange)"
    >
      <div class="container mx-auto flex max-w-4xl items-center gap-1.5 px-4 font-medium">
        You are looking at an outdated version of this proposal, click here to see the current version
        <ArrowRightIcon class="size-4 shrink-0" aria-hidden="true" />
      </div>
    </a>
  {/if}
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
</div>
