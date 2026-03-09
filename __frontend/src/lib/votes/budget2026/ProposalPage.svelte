<script>
  import ProposalPageTitle from "./ProposalPageTitle.svelte";
  import ProposalPageProposalDetails from "./ProposalPageProposalDetails.svelte";
  import ProposalPageSummary from "./ProposalPageSummary.svelte";
  import ProposalPageStrategyFramework from "./ProposalPageStrategyFramework.svelte";
  import ProposalPageWorkPackages from "./ProposalPageWorkPackages.svelte";
  import ProposalPageBudgetSummary from "./ProposalPageBudgetSummary.svelte";
  import ProposalPageSupportingInfo from "./ProposalPageSupportingInfo.svelte";
  import ProposalPageComments from "./ProposalPageComments.svelte";

  let {
    proposal,
    vote,
    pillars = [],
    commentCount = null,
    backToVoteUrl = "",
    voteUrl = "",
    currentVersionHref = null,
    showComments = false,
    commentsHref = "",
  } = $props();
</script>

<div class="bg-white box-shadow-lg shadow-lg">
  <div class="space-y-6 container mx-auto max-w-4xl py-8 px-4">
    <ProposalPageTitle {proposal} {vote} {pillars} />

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      <div class="space-y-6">
        <ProposalPageSummary {proposal} />
        <ProposalPageStrategyFramework {proposal} />
      </div>
      <ProposalPageProposalDetails {proposal} {vote} {pillars} />
    </div>

    <ProposalPageBudgetSummary {proposal} />
    <ProposalPageWorkPackages {proposal} />
    <ProposalPageSupportingInfo {proposal} />
  </div>
</div>

<ProposalPageComments {proposal} {vote} {showComments} />
