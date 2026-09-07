<script>
  import { afterNavigate, beforeNavigate } from "$app/navigation";
  import { page } from "$app/state";
  import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
  import { Badge } from "$lib/components/ui/badge";
  import { formatUtcInstant } from "$lib/formatUtc.js";
  import Markdown from "$lib/base/Markdown.svelte";
  import PageMetadata from "$lib/components/PageMetadata.svelte";
  import Budget2026ProposalPage from "$lib/votes/budget2026/ProposalPage.svelte";
  import CcVote2026ProposalPage from "$lib/votes/ccVote2026/ProposalPage.svelte";
  import DefaultProposalPage from "$lib/votes/default/ProposalPage.svelte";
  import { readPreviewPayload, clearPreviewStorage } from "$lib/previewProposalStorage.js";

  const PROPOSAL_PAGE_MAP = {
    budget2026: Budget2026ProposalPage,
  };

  let { data } = $props();

  const vote = $derived(data.vote);
  const pillars = $derived(data.pillars ?? []);
  const commentCount = $derived(data.commentCount ?? 0);
  const preview = $derived(data.preview ?? false);

  let previewProposal = $state(null);
  let previewLoadAttempted = $state(false);

  $effect(() => {
    if (!preview || typeof window === "undefined") return;
    previewLoadAttempted = true;
    const parsed = readPreviewPayload();
    if (
      parsed != null &&
      String(parsed.proposalId ?? "") === String(page.params.proposalId ?? "")
    ) {
      previewProposal = parsed.proposal;
    }
  });

  const proposal = $derived(preview ? previewProposal : data.proposal);

  // Clear in beforeNavigate when leaving preview; we do not clear on beforeunload/pagehide (tab close).
  // Clear in beforeNavigate (while still on preview page); afterNavigate can run after the page unmounts so its callback may not fire.

  const voteSlug = $derived(page.params.voteSlug ?? "");
  const listPath = $derived(voteSlug ? `/votes/${voteSlug}` : "");

  let backToVoteUrl = $state("");

  beforeNavigate(({ to }) => {
    // Use window.location: from.url can omit search params (SvelteKit #10122)
    const currentHasPreview =
      typeof window !== "undefined" && new URL(window.location.href).searchParams.has("preview");
    if (currentHasPreview && to?.url && !to.url.searchParams.has("preview")) {
      clearPreviewStorage();
    }
  });

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
    proposal?.status === "withdrawnByAdmin" || proposal?.status === "withdrawnByProposer",
  );
  const withdrawalDetails = $derived(proposal?.withdrawalDetails ?? null);
  const withdrawalDate = $derived.by(() => {
    const d = withdrawalDetails?.date;
    if (!d) return null;
    return formatUtcInstant(d, {
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
    proposal && proposal.status !== "draft" && proposal.status !== "archived",
  );
  let policyNow = $derived(new Date(data.policyNowMs ?? Date.now()));

  const ProposalPageComponent = $derived(PROPOSAL_PAGE_MAP[vote?.form] ?? DefaultProposalPage);

  const commentsHref = $derived(`${page.url.pathname}#comments`);

  const isUnpublishedDraft = $derived(!preview && proposal != null && proposal.status === "draft");

  const pageMeta = $derived.by(() => {
    if (preview || !proposal || !vote) return null;

    const proposalTitle = String(proposal?.title ?? proposal?.name ?? "Untitled Proposal").trim();
    const withPrefix = (prefix, value) => {
      const clean = String(value ?? "").trim();
      return clean ? `${prefix} - ${clean}` : prefix;
    };

    if (vote?.form === "ccVote2026") {
      const track = String(proposal?.metaData?.track ?? "").trim();
      const motivation = String(proposal?.metaData?.[track]?.motivation ?? "").trim();
      const candidateName = String(
        proposal?.metaData?.[track]?.applicantName ?? proposalTitle,
      ).trim();
      return {
        title: withPrefix("CC Elections 2026", candidateName),
        description: motivation,
      };
    }

    if (vote?.form === "budget2026") {
      const executiveSummary = String(proposal?.summary ?? "").trim();
      return {
        title: withPrefix("Budget Process 2026", proposalTitle),
        description: executiveSummary,
      };
    }

    return {
      title: proposalTitle,
      description: String(proposal?.summary ?? "").trim(),
    };
  });
</script>

<div class="overflow-x-clip">
  {#if pageMeta}
    <PageMetadata
      title={pageMeta.title}
      description={pageMeta.description}
      url={page.url.href}
      type="article"
      image="https://hydra-voting.intersectmbo.org/images/social.png"
    />
  {/if}
  {#if preview}
    <div
      class="relative right-1/2 left-1/2 -mr-[50vw] -ml-[50vw] flex w-screen max-w-none items-center justify-center bg-(--mbo-orange) py-2 text-sm font-medium text-white"
      role="banner"
      aria-label="Preview mode"
    >
      You are viewing a preview of your proposal
    </div>
  {:else if isUnpublishedDraft}
    <div
      class="relative right-1/2 left-1/2 -mr-[50vw] -ml-[50vw] flex w-screen max-w-none items-center justify-center bg-(--mbo-orange) py-2 text-sm font-medium text-white"
      role="banner"
      aria-label="Draft proposal"
    >
      You are viewing an unpublished draft proposal
    </div>
  {/if}
  {#if preview && !previewLoadAttempted}
    <div class="text-muted-foreground container mx-auto max-w-4xl px-4 py-8 text-center">
      Loading preview…
    </div>
  {:else if preview && !proposal}
    <div class="text-muted-foreground container mx-auto max-w-4xl px-4 py-8 text-center">
      Preview data not found. Close this window and click Preview again from the form.
    </div>
  {:else if currentVersionHref}
    <a
      href={currentVersionHref}
      class="relative right-1/2 left-1/2 -mr-[50vw] -ml-[50vw] flex w-screen max-w-none items-center bg-(--mbo-orange) py-3 text-white focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-(--mbo-orange) focus:outline-none"
    >
      <div class="container mx-auto flex max-w-4xl items-center gap-1.5 px-4 font-medium">
        You are looking at an outdated version of this proposal, click here to see the current
        version
        <ArrowRightIcon class="size-4 shrink-0" aria-hidden="true" />
      </div>
    </a>
  {:else if isWithdrawn}
    <div
      class="bg-destructive text-destructive-foreground focus-within:ring-offset-destructive relative right-1/2 left-1/2 -mr-[50vw] -ml-[50vw] flex w-screen max-w-none items-center py-4 focus-within:ring-2 focus-within:ring-white focus-within:ring-offset-2 focus-within:outline-none"
      role="banner"
      aria-label="Proposal withdrawn"
    >
      <div class="container mx-auto flex max-w-4xl flex-col gap-1 px-4 font-medium text-white">
        <span>
          This proposal has been withdrawn {withdrawnByLabel}
          {#if withdrawalDate}
            on {withdrawalDate}
            <Badge class="text-destructive -top-0.5 ml-0.5 border-0 bg-white">
              {withdrawalDetails.category}
            </Badge>
          {/if}
        </span>
        {#if withdrawalDetails?.comment}
          <div class="mt-2 mb-2 inline w-fit border-b-2 border-white pb-0.5 text-xs">Comment:</div>
          <div
            class="prose prose-sm prose-invert max-w-3xl text-sm opacity-90 **:first:mt-0 **:last:mb-0"
          >
            <Markdown content={withdrawalDetails.comment} />
          </div>
        {/if}
      </div>
    </div>
  {/if}
  {#if vote?.form === "ccVote2026"}
    <CcVote2026ProposalPage
      {proposal}
      {vote}
      {backToVoteUrl}
      {voteUrl}
      {currentVersionHref}
      {showComments}
      {commentCount}
      {commentsHref}
      {isWithdrawn}
      {policyNow}
    />
  {:else}
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
      {policyNow}
    />
  {/if}
</div>
