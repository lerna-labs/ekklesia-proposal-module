<script>
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Switch from "$lib/components/ui/switch/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { beforeNavigate, goto } from "$app/navigation";
  import { toast } from "svelte-sonner";

  let { formData, onSave, autoSaveEnabled } = $props();

  function saveDraft() {
    if (onSave) {
      const payload = formDataToApiPayload({ ...formData, status: "draft" });
      Promise.resolve(onSave(payload))
        .then(() => {
          initialSnapshot = formDataSnapshot;
        })
        .catch(() => {});
    }
  }

  let leaveConfirmOpen = $state(false);
</script>

<section
  class="bg-(--mbo-orange) w-full sticky bottom-0 shadow-lg z-10 shadow-black/50 py-6 px-4"
  id="controls"
>
  <div class="max-w-4xl mx-auto flex flex-wrap items-center gap-2">
    {#if formData.status === "draft"}
      <Button type="button" class="cursor-pointer" onclick={saveDraft}>
        Save Draft
      </Button>
    {/if}
    <Button type="submit" class="cursor-pointer">
      {formData.status === "draft" ? "Submit Proposal" : "Re-Submit Proposal"}
    </Button>
    {#if formData.status === "draft" && onSave}
      <label
        class="ml-auto flex h-9 items-center gap-2 rounded-md border bg-white px-4 py-2 shadow-xs cursor-pointer select-none text-sm font-medium"
      >
        <Switch.Root bind:checked={autoSaveEnabled} />
        <span>Auto-save</span>
      </label>
    {/if}
  </div>
</section>

<AlertDialog.Root bind:open={leaveConfirmOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Unsaved changes</AlertDialog.Title>
      <AlertDialog.Description>
        You have unsaved changes. Are you sure you want to leave?
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer class="flex gap-2">
      <AlertDialog.Cancel class="cursor-pointer" onclick={stayOnPage}>
        Stay
      </AlertDialog.Cancel>
      <AlertDialog.Action class="cursor-pointer" onclick={confirmLeave}>
        Leave
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
