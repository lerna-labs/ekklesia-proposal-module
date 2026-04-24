<script>
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";

  let { open = $bindable(false), onContinue, onCancel } = $props();
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
        <p class="text-muted-foreground mb-3">
          You will be asked to select your applicant type between individual,
          organization and consortium. After your application is submitted you
          will be able to edit your application but not applicant type.
        </p>
      </div>

      <AlertDialog.Footer class="flex gap-2 shrink-0 mt-4">
        <AlertDialog.Cancel onclick={() => onCancel?.()}>
          Cancel
        </AlertDialog.Cancel>
        <AlertDialog.Action
          onclick={() => {
            onContinue?.();
          }}
        >
          Continue
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </div>
  </AlertDialog.Content>
</AlertDialog.Root>
