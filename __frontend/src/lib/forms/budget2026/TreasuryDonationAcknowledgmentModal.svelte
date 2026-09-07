<script>
  /**
   * Pre-submission gate: Treasury Donation acknowledgment.
   * AlertDialog with two actions only: Continue (enabled when checkbox checked) or Cancel.
   * Parent must call goto("/dashboard") on Cancel.
   * @see docs/treasury-donation-acknowledgment-modal-plan.md
   */
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import Checkbox from "$lib/components/form/Checkbox.svelte";
  import { Separator } from "$lib/components/ui/separator/index.js";

  let { open = $bindable(false), onContinue, onCancel } = $props();

  let acknowledged = $state(false);
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content
    class="pointer-events-none fixed! inset-0! top-0! left-0! box-border flex! w-full max-w-none! min-w-0 translate-x-0! translate-y-0! flex-col items-center justify-start overflow-x-hidden overflow-y-auto rounded-none! border-0! bg-transparent! p-4 py-8 shadow-none!"
  >
    <div
      class="bg-background pointer-events-auto relative mx-auto my-auto flex w-full max-w-2xl shrink-0 flex-col gap-4 rounded-lg border p-6 shadow-lg"
    >
      <AlertDialog.Header>
        <AlertDialog.Title>Submit your Budget Proposal</AlertDialog.Title>
      </AlertDialog.Header>

      <div class="space-y-6 pr-2 text-sm">
        <p class="text-muted-foreground mb-3">
          This form is used to submit a proposal to the Cardano Ecosystem Budget Process facilitated
          by Intersect.
        </p>
        <p class="text-muted-foreground mb-3">
          This budget process, designed by the Cardano Budget Committee and supported by Cardano
          DReps, provides a
          <strong> transparent, structured, and strategic way to allocate Treasury funds </strong>
          to initiatives that contribute to the long-term growth of the Cardano ecosystem.
        </p>
        <p class="text-muted-foreground">
          Proposals submitted through this form will follow the defined budgeting workflow, which
          includes
          <strong>
            DRep feedback, DRep Hydra voting, ahead of the on-chain treasury withdrawals.
          </strong>
        </p>

        <Card.Root class="border-destructive w-full gap-2 rounded-xl border-2 p-4">
          <Card.Header class="pt-2 pb-0">
            <Card.Title class="text-red-600">IMPORTANT</Card.Title>
          </Card.Header>
          <Card.Content class="space-y-4 pt-0 text-black!">
            <p class="mb-3">
              To reduce potential spam and confirm proposer commitment, you'll need to submit a
              non-refundable <strong> 1,000 ADA donation to the treasury </strong>
              and be logged in to this portal with
              <strong>the same wallet you used to submit the donation.</strong>
              In the last step of this process you'll be asked to provide proof for this donation.
            </p>
            <p class="mb-3">A separate donation is required for each proposal.</p>
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
              id="treasury-acknowledgment"
              bind:value={acknowledged}
              label="I agree this donation does not guarantee approval, success on-chain, or that Intersect will raise a governance action on your behalf, even if your proposal hits the 67% threshold."
              class="mb-2"
            />
          </Card.Content>
        </Card.Root>
      </div>

      <AlertDialog.Footer class="mt-4 flex shrink-0 gap-2">
        <AlertDialog.Cancel onclick={() => onCancel?.()}>Cancel</AlertDialog.Cancel>
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
