<script>
  import { afterNavigate } from "$app/navigation";
  import { page } from "$app/state";
  import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
  import { Badge } from "$lib/components/ui/badge";
  import Markdown from "$lib/base/Markdown.svelte";
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
    if (
      from?.url &&
      from.url.pathname === listPath &&
      toPath === page.url.pathname
    ) {
      backToVoteUrl = from.url.pathname + (from.url.search || "");
    }
  });

  const voteUrl = $derived(
    backToVoteUrl || (voteSlug ? `/votes/${voteSlug}` : "/votes"),
  );
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
  const withdrawalDetails = $derived(proposal?.withdrawalDetails ?? null);
  const withdrawalDate = $derived.by(() => {
    const d = withdrawalDetails?.date;
    if (!d) return null;
    return new Date(d).toLocaleString(undefined, {
      dateStyle: "long",
      timeStyle: "short",
    });
  });
  const withdrawnByLabel = $derived(
    proposal?.status === "withdrawnByAdmin"
      ? "by an admin"
      : proposal?.status === "withdrawnByProposer"
        ? "by the proposer"
        : "",
  );
  const showComments = $derived(
    proposal &&
      proposal.status !== "draft" &&
      proposal.status !== "archived",
  );

  const ProposalPageComponent = $derived(
    PROPOSAL_PAGE_MAP[vote?.form] ?? DefaultProposalPage,
  );

  const commentsHref = $derived(`${page.url.pathname}#comments`);
</script>

<div class="overflow-x-clip">
  {#if currentVersionHref}
    <a
      href={currentVersionHref}
      class="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] flex w-screen max-w-none items-center bg-(--mbo-orange) py-3 text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-(--mbo-orange)"
    >
      <div
        class="container mx-auto flex max-w-4xl items-center gap-1.5 px-4 font-medium"
      >
        You are looking at an outdated version of this proposal, click here to
        see the current version
        <ArrowRightIcon class="size-4 shrink-0" aria-hidden="true" />
      </div>
    </a>
  {:else if isWithdrawn}
    <div
      class="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] flex w-screen max-w-none items-center bg-destructive py-4 text-destructive-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-white focus-within:ring-offset-2 focus-within:ring-offset-destructive"
      role="banner"
      aria-label="Proposal withdrawn"
    >
      <div
        class="container mx-auto flex max-w-4xl flex-col gap-1 px-4 font-medium text-white"
      >
        <span>
          This proposal has been withdrawn {withdrawnByLabel}
          {#if withdrawalDate}
            on {withdrawalDate}
            <Badge class="bg-white text-destructive border-0 -top-0.5 ml-0.5">
              {withdrawalDetails.category}
            </Badge>
          {/if}
        </span>
        {#if withdrawalDetails?.comment}
          <div
            class="text-xs border-b-2 border-white pb-0.5 inline w-fit mt-2 mb-2"
            >Comment:
          </div>
          <div
            class="text-sm opacity-90 max-w-3xl **:first:mt-0 **:last:mb-0 prose prose-sm prose-invert"
          >
            <Markdown content={withdrawalDetails.comment} />
          </div>
        {/if}
      </div>
    </div>
  {/if}
  <ProposalPageComponent
    {proposal}
    {vote}
    {pillars}
    {commentCount}
    {backToVoteUrl}
    {voteUrl}
    {currentVersionHref}
    {showComments}
    {commentsHref}
    {isWithdrawn}
  />
</div>
