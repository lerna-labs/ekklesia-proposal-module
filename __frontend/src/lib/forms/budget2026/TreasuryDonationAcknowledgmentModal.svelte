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

  let {
    open = $bindable(false),
    onContinue,
    onCancel,
    guideUrl = "https://intersectmbo.org",
  } = $props();

  let acknowledged = $state(false);
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content
    class="fixed! inset-0! top-0! left-0! translate-x-0! translate-y-0! max-w-none! w-full min-w-0 overflow-y-auto overflow-x-hidden flex! flex-col items-center justify-start p-4 py-8 bg-transparent! rounded-none! border-0! shadow-none! pointer-events-none box-border"
  >
    <div
      class="relative w-full max-w-2xl mx-auto flex flex-col gap-4 rounded-lg border bg-background shadow-lg p-6 my-auto pointer-events-auto shrink-0"
    >
      <AlertDialog.Header>
        <AlertDialog.Title>Submit your Budget Proposal</AlertDialog.Title>
      </AlertDialog.Header>

      <div class="space-y-6 pr-2 text-sm">
        <p class="text-muted-foreground mb-3">
          This form is used to submit a proposal to the Cardano Ecosystem Budget
          Process facilitated by Intersect.
        </p>
        <p class="text-muted-foreground mb-3">
          This budget process, designed by the Cardano Budget Committee and
          supported by Cardano DReps, provides a
          <strong>
            transparent, structured, and strategic way to allocate Treasury
            funds
          </strong>
          to initiatives that contribute to the long-term growth of the Cardano ecosystem.
        </p>
        <p class="text-muted-foreground">
          Proposals submitted through this form will follow the defined
          budgeting workflow, which includes
          <strong>
            DRep feedback, DRep off-chain voting, ahead of the on-chain treasury
            withdrawals.
          </strong>
        </p>

        <Card.Root class="gap-2">
          <Card.Header class="pb-0">
            <Card.Title>IMPORTANT</Card.Title>
          </Card.Header>
          <Card.Content class="space-y-4 pt-0">
            <p class="text-muted-foreground mb-3">
              To reduce potential spam and confirm proposer commitment, you'll
              need to submit a non-refundable <strong>
                1,000 ADA donation to the treasury
              </strong>
              and be logged in to this portal with
              <strong>the same wallet you used to submit the donation.</strong>
              In the last step of this process you'll be asked to provide proof for
              this donation.
            </p>
            <p class="text-muted-foreground mb-3">
              A separate donation is required for each proposal.
            </p>
            <p class="text-muted-foreground mb-4">
              Read how to in
              <a
                href={guideUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="text-primary underline underline-offset-4 hover:no-underline"
              >
                this guide
              </a>
              .
            </p>
            <Checkbox
              id="treasury-acknowledgment"
              bind:value={acknowledged}
              label="I agree this donation does not guarantee approval, success on-chain, or that Intersect will raise a governance action on your behalf, even if your proposal hits the 67% threshold."
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
