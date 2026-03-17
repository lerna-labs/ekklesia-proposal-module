<script>
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
  import ProposalPageTitle from "./ProposalPageTitle.svelte";
  import ProposalPageKeyDetails from "./ProposalPageKeyDetails.svelte";
  import ProposalPageStrategyFramework from "./ProposalPageStrategyFramework.svelte";
  import ProposalPageWorkPackages from "./ProposalPageWorkPackages.svelte";
  import ProposalPageBudgetSummary from "./ProposalPageBudgetSummary.svelte";
  import ProposalPageSupportingInfo from "./ProposalPageSupportingInfo.svelte";
  import ProposalPageExecutiveSummary from "./ProposalPageExecutiveSummary.svelte";
  import ProposalPageBudgetAdministration from "./ProposalPageBudgetAdministration.svelte";
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
    isWithdrawn = false,
  } = $props();

  function goBackToList() {
    if (backToVoteUrl) {
      window.history.back();
    } else {
      goto(voteUrl);
    }
  }
</script>

<div class="bg-white box-shadow-lg shadow-lg">
  <div class="space-y-6 container mx-auto max-w-4xl py-8 px-4">
    {#if !currentVersionHref}
      <!-- Back to list (above title): history.back() when coming from list, else goto vote -->
      <div class="mb-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onclick={goBackToList}
          class="pl-0! gap-1.5 hover:bg-transparent hover:text-black dark:hover:bg-transparent dark:hover:text-foreground text-muted-foreground"
        >
          <ArrowLeftIcon class="size-4 shrink-0" aria-hidden="true" />
          Back to {vote?.title ?? vote?.name ?? "vote"}
        </Button>
      </div>
    {/if}
    <ProposalPageTitle {proposal} {vote} />

    <ProposalPageKeyDetails {proposal} {vote} {pillars} />

    <ProposalPageExecutiveSummary {proposal} />

    <ProposalPageStrategyFramework {proposal} {pillars} />

    <ProposalPageWorkPackages {proposal} />

    <ProposalPageBudgetSummary {proposal} />

    <ProposalPageBudgetAdministration {proposal} />

    <ProposalPageSupportingInfo {proposal} />
  </div>
</div>

<ProposalPageComments {proposal} {vote} {showComments} readOnly={isWithdrawn} />
