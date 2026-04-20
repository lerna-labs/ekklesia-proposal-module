<script>
  /**
   * Pre-form gate for CC Vote proposals (placeholder copy — replace with final legal text).
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
        <AlertDialog.Title>CC Vote proposal</AlertDialog.Title>
      </AlertDialog.Header>

      <div class="space-y-6 pr-2 text-sm">
        <p class="text-muted-foreground mb-3">
          Placeholder: this dialog will contain the official CC Vote legal disclaimer
          and process overview. Replace this copy before production.
        </p>
        <p class="text-muted-foreground mb-3">
          By continuing, you confirm you understand how this vote works and any
          requirements that apply to your submission.
        </p>

        <Card.Root
          class="w-full border-2 border-destructive rounded-xl p-4 gap-2"
        >
          <Card.Header class="pb-0 pt-2">
            <Card.Title class="text-red-600">IMPORTANT</Card.Title>
          </Card.Header>
          <Card.Content class="space-y-4 pt-0 text-black!">
            <p class="mb-3">
              Placeholder: describe the required treasury donation (currently
              <strong>{adaLabel} ADA</strong>) and wallet alignment rules for this vote.
            </p>
            <Separator class="my-4" />
            <Checkbox
              id="cc-vote-disclaimer-ack"
              bind:value={acknowledged}
              label="I have read and understood the above (placeholder acknowledgment)."
              class="mb-2"
            />
          </Card.Content>
        </Card.Root>
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
