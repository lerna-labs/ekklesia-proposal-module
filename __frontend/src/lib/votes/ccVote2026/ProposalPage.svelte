<script>
  import { goto } from "$app/navigation";
  import { Button } from "$lib/components/ui/button";
  import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
  import ProposalPageTitle from "$lib/votes/budget2026/ProposalPageTitle.svelte";
  import ProposalPageComments from "$lib/votes/budget2026/ProposalPageComments.svelte";
  import ProposalPageKeyDetails from "./ProposalPageKeyDetails.svelte";
  import ProposalPageTrackIndividual from "./ProposalPageTrackIndividual.svelte";
  import ProposalPageTrackOrganisation from "./ProposalPageTrackOrganisation.svelte";
  import ProposalPageTrackConsortium from "./ProposalPageTrackConsortium.svelte";

  let {
    proposal,
    vote,
    backToVoteUrl = "",
    voteUrl = "",
    currentVersionHref = null,
    showComments = false,
    commentCount = null,
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

  const track = $derived(
    typeof proposal?.metaData?.track === "string" ? proposal.metaData.track : "",
  );
</script>

<div class="bg-white box-shadow-lg shadow-lg">
  <div class="space-y-6 container mx-auto max-w-4xl py-8 px-4">
    {#if !currentVersionHref}
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

    <ProposalPageTitle {proposal} {vote} {commentCount} {commentsHref} {showComments} />

    {#if proposal}
      <ProposalPageKeyDetails {proposal} {vote} />
    {/if}

    {#if track === "individual"}
      <ProposalPageTrackIndividual {proposal} />
    {:else if track === "organisation"}
      <ProposalPageTrackOrganisation {proposal} />
    {:else if track === "consortium"}
      <ProposalPageTrackConsortium {proposal} />
    {/if}
  </div>
</div>

<ProposalPageComments {proposal} {vote} {showComments} readOnly={isWithdrawn} />
