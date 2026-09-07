<script>
  import Budget2026ProposalCard from "$lib/votes/budget2026/ProposalCard.svelte";
  import CcVote2026ProposalCard from "$lib/votes/ccVote2026/ProposalCard.svelte";
  import DefaultProposalCard from "$lib/votes/default/ProposalCard.svelte";

  const PROPOSAL_CARD_MAP = {
    budget2026: Budget2026ProposalCard,
    ccVote2026: CcVote2026ProposalCard,
  };

  let { proposal, vote, showLink = true, class: className, policyNow = new Date() } = $props();

  const ProposalCardComponent = $derived(PROPOSAL_CARD_MAP[vote?.form] ?? DefaultProposalCard);
</script>

<ProposalCardComponent {proposal} {vote} {showLink} {policyNow} class={className} />
