<script>
  import { toast } from "svelte-sonner";
  import { api } from "$stores/sessionManager.js";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Button from "$lib/components/ui/button";

  let {
    open = $bindable(false),
    proposal = null,
    onSuccess = () => {},
  } = $props();

  let submitting = $state(false);

  async function confirmDelete() {
    if (!proposal?._id) return;
    submitting = true;
    try {
      const res = await api.fetch(fetch, `/proposals/${proposal._id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.message ?? "Failed to delete proposal");
        return;
      }
      toast.success("Proposal deleted");
      open = false;
      onSuccess();
    } catch (e) {
      toast.error(e?.message ?? "Failed to delete proposal");
    } finally {
      submitting = false;
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Delete proposal</Dialog.Title>
      <Dialog.Description>
        {#if proposal}
          This will permanently delete the draft proposal "{proposal.title ?? proposal._id}". This cannot be undone.
        {/if}
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer class="gap-2">
      <Button.Root
        variant="outline"
        disabled={submitting}
        onclick={() => (open = false)}
      >
        Cancel
      </Button.Root>
      <Button.Root
        variant="destructive"
        disabled={submitting}
        onclick={confirmDelete}
      >
        {submitting ? "Deleting…" : "Delete proposal"}
      </Button.Root>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
