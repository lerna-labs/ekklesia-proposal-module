<script>
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Switch from "$lib/components/ui/switch/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { beforeNavigate, goto } from "$app/navigation";

  let {
    formData,
    getPayload,
    onSave,
    autoSaveEnabled = $bindable(true),
  } = $props();

  const AUTO_SAVE_INTERVAL_MS = 1 * 60 * 1000; // 1 minute

  /** Snapshot of current form data for dirty check (serialized payload). */
  let formDataSnapshot = $derived(
    getPayload ? JSON.stringify(getPayload(formData.status)) : "",
  );

  let initialSnapshot = $state(null);

  $effect(() => {
    if (initialSnapshot !== null) return;
    initialSnapshot = formDataSnapshot;
  });

  let isDirty = $derived(
    initialSnapshot !== null && formDataSnapshot !== initialSnapshot,
  );

  const dirtyRef = { current: false };
  $effect(() => {
    dirtyRef.current = isDirty;
  });

  /** Leave-confirm: intercept in-app navigation when dirty. */
  let leaveConfirmOpen = $state(false);
  let pendingNavigateUrl = $state(null);

  beforeNavigate(({ to, cancel }) => {
    if (!to || !dirtyRef.current) return;
    cancel();
    pendingNavigateUrl = to.url.href;
    leaveConfirmOpen = true;
  });

  $effect(() => {
    if (!isDirty) return;
    const handler = (e) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  });

  function stayOnPage() {
    leaveConfirmOpen = false;
    pendingNavigateUrl = null;
  }

  function confirmLeave() {
    const url = pendingNavigateUrl;
    leaveConfirmOpen = false;
    pendingNavigateUrl = null;
    if (!url) return;
    dirtyRef.current = false;
    initialSnapshot = formDataSnapshot;
    goto(url);
  }

  function saveDraft() {
    if (!getPayload || !onSave) return;
    const payload = getPayload("draft");
    Promise.resolve(onSave(payload))
      .then(() => {
        initialSnapshot = formDataSnapshot;
      })
      .catch(() => {});
  }

  function submitLive() {
    if (!getPayload || !onSave) return;
    const payload = getPayload("live");
    Promise.resolve(onSave(payload))
      .then(() => {
        initialSnapshot = formDataSnapshot;
      })
      .catch(() => {});
  }

  /** Exposed for parent form onsubmit (e.g. Enter key). */
  export function submit() {
    submitLive();
  }

  /** Auto-save draft at interval when enabled. */
  $effect(() => {
    if (!autoSaveEnabled || formData.status !== "draft" || !onSave || !getPayload)
      return;
    const id = setInterval(() => {
      console.log("Auto-save running", new Date().toISOString());
      const payload = getPayload("draft");
      Promise.resolve(onSave(payload)).catch(() => {});
    }, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(id);
  });
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
    <Button type="button" class="cursor-pointer" onclick={submitLive}>
      {formData.status === "draft" ? "Submit Proposal" : "Re-Submit Proposal"}
    </Button>
    {#if formData.status === "draft" && onSave && getPayload}
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
