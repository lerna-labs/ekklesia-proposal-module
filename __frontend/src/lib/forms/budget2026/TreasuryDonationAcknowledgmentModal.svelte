<script>
  /**
   * Pre-submission gate: Treasury Donation acknowledgment.
   * AlertDialog with two actions only: Continue (enabled when checkbox checked) or Cancel.
   * Parent must call goto("/dashboard") on Cancel.
   * @see docs/treasury-donation-acknowledgment-modal-plan.md
   */
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import Checkbox from "$lib/components/form/Checkbox.svelte";

  let {
    open = $bindable(false),
    onContinue,
    onCancel,
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
        <AlertDialog.Title>Treasury Donation - Required Before Submission</AlertDialog.Title>
        <AlertDialog.Description>
          Please read the requirements below and confirm before continuing to the proposal form.
        </AlertDialog.Description>
      </AlertDialog.Header>

      <div class="space-y-6 pr-2 text-sm">
        <section class="space-y-2">
          <h3 class="text-base font-medium">Why is this required?</h3>
          <p class="text-muted-foreground">
            To participate in the Intersect budget proposal process, proposers are required to make a
            <strong>1,000 ADA non-refundable donation</strong> to the Cardano Treasury. This idea
            originated from DReps and has strong support from both DReps and vendors.
          </p>
          <p class="text-muted-foreground mb-0">This donation:</p>
          <ul class="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Confirms proposer commitment</li>
            <li>Demonstrates control of the submitting wallet</li>
            <li>Helps protect the process from spam or low-effort submissions</li>
          </ul>
        </section>

        <section class="space-y-2">
          <h3 class="text-base font-medium">Important: One donation per proposal</h3>
          <p class="text-muted-foreground">
            Each 1,000 ADA donation applies to a single proposal only. If you intend to submit
            multiple proposals, a separate donation is required for each proposal.
          </p>
        </section>

        <section class="space-y-2">
          <h3 class="text-base font-medium">Important: What this donation does not mean</h3>
          <p class="text-muted-foreground mb-1">Making this donation <strong>does not:</strong></p>
          <ul class="list-disc pl-5 text-muted-foreground space-y-1">
            <li>Guarantee proposal approval</li>
            <li>Guarantee on-chain execution</li>
            <li>Guarantee funding, even if off-chain voting thresholds are met</li>
            <li>
              Guarantee that Intersect will submit or sponsor a Treasury Withdrawal Action
            </li>
          </ul>
          <p class="text-muted-foreground">
            All proposals remain subject to governance review, voting outcomes, and Net Change
            Limit (NCL) constraints.
          </p>
        </section>

        <section class="space-y-2">
          <h3 class="text-base font-medium">Wallet requirement</h3>
          <p class="text-muted-foreground">
            You <strong>must use the same wallet</strong> to:
          </p>
          <ol class="list-decimal pl-5 text-muted-foreground space-y-1">
            <li>Make the 1,000 ADA treasury donation</li>
            <li>Submit your proposal in this application</li>
          </ol>
          <p class="text-muted-foreground">
            This allows reviewers to verify proposer identity and wallet ownership. Proposals
            submitted from a different wallet than the donation is not possible.
          </p>
        </section>

        <div class="pt-2">
          <Checkbox
            id="treasury-acknowledgment"
            bind:value={acknowledged}
            label="I understand the treasury donation requirements and wish to continue."
          />
        </div>
      </div>

      <AlertDialog.Footer class="flex gap-2 shrink-0 mt-4">
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
