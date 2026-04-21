<script>
  /**
   * Pre-form gate for CC Vote proposals. Copy aligned with budget2026/TreasuryDonationAcknowledgmentModal.svelte;
   * treasury amount comes from vote.depositOptions.treasuryDonation (e.g. 10 ADA).
   */
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import Checkbox from "$lib/components/form/Checkbox.svelte";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import { formatAda } from "$lib/utils.js";

  let { open = $bindable(false), onContinue, onCancel, treasuryDonationLovelace = 0 } = $props();

  let acknowledged = $state(false);

  const adaLabel = $derived.by(() => {
    const ada = Number(treasuryDonationLovelace) / 1_000_000;
    return formatAda(ada);
  });
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content
    class="fixed! inset-0! top-0! left-0! translate-x-0! translate-y-0! max-w-none! w-full min-w-0 overflow-y-auto overflow-x-hidden flex! flex-col items-center justify-start p-4 py-8 bg-transparent! rounded-none! border-0! shadow-none! pointer-events-none box-border"
  >
    <div
      class="relative w-full max-w-2xl mx-auto flex flex-col gap-4 rounded-lg border bg-background shadow-lg p-6 my-auto pointer-events-auto shrink-0"
    >
      <AlertDialog.Header>
        <AlertDialog.Title>Submit your CC Vote Proposal</AlertDialog.Title>
      </AlertDialog.Header>

      <div class="space-y-6 pr-2 text-sm">
        <p class="text-muted-foreground mb-3">
          This form is used to submit an application to the Constitutional Committee
          Elections facilitated by Intersect.
        </p>

        <Card.Root
          class="w-full border-2 border-destructive rounded-xl p-4 gap-2"
        >
          <Card.Header class="pb-0 pt-2">
            <Card.Title class="text-red-600">IMPORTANT</Card.Title>
          </Card.Header>
          <Card.Content class="space-y-4 pt-0 text-black!">
            <p class="mb-3">
              To reduce potential spam and confirm proposer commitment, you'll
              need to submit a non-refundable <strong>
                {adaLabel} ADA donation to the treasury
              </strong>
              and be logged in to this portal with
              <strong>the same wallet you used to submit the donation.</strong>
              In the last step of this process you'll be asked to provide proof for
              this donation.
            </p>
            <p class="mb-3">
              A separate donation is required for each proposal.
            </p>
            <p class="mb-4">
              Read how to in
              <a
                href="https://docs.hydra-voting.intersectmbo.org/budget-process/2026-budget-process-guides/budget-proposal-submission/how-to-donate-to-the-cardano-treasury-1-000-ada"
                target="_blank"
                rel="noopener noreferrer"
                class="link"
              >
                this guide.
              </a>
            </p>

            <Separator class="my-4" />
            <Checkbox
              id="cc-vote-disclaimer-ack"
              bind:value={acknowledged}
              label="I agree this donation does not guarantee approval, success on-chain, or that Intersect will raise a governance action on your behalf, even if your proposal hits the 67% threshold."
              class="mb-2"
            />
          </Card.Content>
        </Card.Root>
      </div>

      <AlertDialog.Footer class="flex gap-2 shrink-0 mt-4">
        <AlertDialog.Cancel onclick={() => onCancel?.()}>
          Cancel
        </AlertDialog.Cancel>
        <AlertDialog.Action
          disabled={!acknowledged}
          onclick={() => {
            if (acknowledged) onContinue?.();
          }}
        >
          Continue
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </div>
  </AlertDialog.Content>
</AlertDialog.Root>
