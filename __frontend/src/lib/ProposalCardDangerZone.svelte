<script>
  import * as Card from "$lib/components/ui/card";
  import { Button } from "$lib/components/ui/button";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import ProposalWithdrawal from "$lib/ProposalWithdrawal.svelte";

  /** @type {{ proposal: object, onSuccess?: () => void, title?: string, description?: string, isProposer?: boolean }} */
  let {
    proposal,
    onSuccess = () => {},
    title = "Danger zone",
    description,
    isProposer = false,
  } = $props();

  const descriptionText = $derived(
    description ??
      (isProposer
        ? "As proposer you can withdraw your own proposal(s). Proceed with caution and make sure you understand the consequences of withdrawing a proposal. Withdrawing a proposal cannot be undone."
        : "As authenticated admin on this vote you can withdraw this proposal. Proceed with caution and make sure you understand the consequences of withdrawing a proposal. Withdrawing a proposal cannot be undone."),
  );

  let withdrawOpen = $state(false);
</script>

<Card.Root class="w-full border-2 border-destructive rounded-xl p-4 gap-0">
  <Card.Header class="p-0 pb-2">
    <Card.Title class="text-sm font-semibold">{title}</Card.Title>
    <Card.Description
      class="text-sm leading-relaxed text-muted-foreground mt-0.5 mb-2"
    >
      {descriptionText}
    </Card.Description>
  </Card.Header>
  <Card.Content class="p-0 px-0 pt-0">
    <Button
      variant="destructive"
      size="sm"
      class="text-xs bg-destructive text-white hover:bg-destructive/90 px-3"
      aria-label="Withdraw proposal"
      title="Withdraw proposal"
      onclick={() => (withdrawOpen = true)}
    >
      <Trash2Icon class="size-4 mr-1" />
      Withdraw Proposal
    </Button>
  </Card.Content>
</Card.Root>

<ProposalWithdrawal bind:open={withdrawOpen} {proposal} {onSuccess} />
