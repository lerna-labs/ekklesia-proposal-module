<script>
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";

  let { open = $bindable(false), onContinue, onCancel } = $props();
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content
    class="pointer-events-none fixed! inset-0! top-0! left-0! box-border flex! w-full max-w-none! min-w-0 translate-x-0! translate-y-0! flex-col items-center justify-start overflow-x-hidden overflow-y-auto rounded-none! border-0! bg-transparent! p-4 py-8 shadow-none!"
  >
    <div
      class="bg-background pointer-events-auto relative mx-auto my-auto flex w-full max-w-2xl shrink-0 flex-col gap-4 rounded-lg border p-6 shadow-lg"
    >
      <AlertDialog.Header>
        <AlertDialog.Title>Submit your CC Vote Proposal</AlertDialog.Title>
      </AlertDialog.Header>

      <div class="space-y-6 pr-2 text-sm">
        <p class="text-muted-foreground mb-3">
          This form is used to submit an application to the Constitutional Committee Elections
          facilitated by Intersect.
        </p>
        <p class="text-muted-foreground mb-3">
          You will be asked to select your applicant type between individual, organization and
          consortium. After your application is submitted you will be able to edit your application
          but not applicant type.
        </p>
      </div>

      <AlertDialog.Footer class="mt-4 flex shrink-0 gap-2">
        <AlertDialog.Cancel onclick={() => onCancel?.()}>Cancel</AlertDialog.Cancel>
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
