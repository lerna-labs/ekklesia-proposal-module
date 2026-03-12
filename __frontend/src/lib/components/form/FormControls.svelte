<script>
  import { Button } from "$lib/components/ui/button/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { beforeNavigate, goto } from "$app/navigation";

  let {
    formData,
    getPayload,
    onSave,
    /** If set, show "Preview Proposal" button that opens this URL in a new window. */
    previewHref = null,
    /** When true, auto-save interval is paused (e.g. while legal declarations modal is open). */
    autoSavePaused = false,
  } = $props();

  const AUTO_SAVE_INTERVAL_MS = 120 * 1000; // 2 minutes
  const AUTO_SAVE_INTERVAL_MINUTES = AUTO_SAVE_INTERVAL_MS / 60000;

  let lastSaveAt = $state(null);

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

  function saveDraft(exitAfterSave) {
    if (!getPayload || !onSave) return;
    const payload = getPayload("draft");
    Promise.resolve(onSave(payload, { fromAutoSave: false, exitAfterSave: !!exitAfterSave }))
      .then(() => {
        initialSnapshot = JSON.stringify(payload);
        lastSaveAt = Date.now();
      })
      .catch(() => {});
  }

  function submitLive() {
    if (!getPayload || !onSave) return;
    const payload = getPayload("live");
    Promise.resolve(onSave(payload))
      .then(() => {
        initialSnapshot = JSON.stringify(payload);
      })
      .catch(() => {});
  }

  /** Exposed for parent form onsubmit (e.g. Enter key). */
  export function submit() {
    submitLive();
  }

  /** Reset dirty baseline to current form state. Call after loading/prefilling proposal data so the form is not considered dirty on first paint. */
  export function resetDirtyBaseline() {
    if (getPayload)
      initialSnapshot = JSON.stringify(getPayload(formData.status));
  }

  /** Auto-save draft at interval when draft, only when dirty. */
  $effect(() => {
    if (
      autoSavePaused ||
      formData.status !== "draft" ||
      !onSave ||
      !getPayload
    )
      return;
    const id = setInterval(() => {
      if (!isDirty) return;
      const payload = getPayload("draft");
      Promise.resolve(onSave(payload, { fromAutoSave: true }))
        .then(() => {
          initialSnapshot = JSON.stringify(payload);
          lastSaveAt = Date.now();
        })
        .catch(() => {});
    }, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(id);
  });

  function formatLastSaved(ts) {
    if (ts == null) return "—";
    return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
</script>

<section
  class="bg-(--mbo-orange) w-full sticky bottom-0 shadow-lg z-10 shadow-black/50 py-6 px-4"
  id="controls"
>
  <div class="max-w-4xl mx-auto flex flex-col gap-2">
    <div class="flex flex-wrap items-center gap-2">
      {#if formData.status === "draft"}
        <Button type="button" class="cursor-pointer" onclick={() => saveDraft(true)}>
          Save & Exit
        </Button>
      {/if}

      {#if formData.status === "draft"}
        <Button type="button" class="cursor-pointer" onclick={() => saveDraft(false)}>
          Save
        </Button>
      {/if}
      <div class="ml-auto flex flex-wrap items-center gap-2">
        {#if previewHref}
          <Button
            type="button"
            variant="outline"
            class="cursor-pointer bg-white text-black hover:bg-gray-100 border border-gray-300"
            href={previewHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Preview Proposal
          </Button>

          <Button type="button" class="cursor-pointer" onclick={submitLive}>
            {formData.status === "draft"
              ? "Submit Proposal"
              : "Re-Submit Proposal"}
          </Button>
        {/if}
      </div>
    </div>
    {#if formData.status === "draft"}
      <p class="text-sm text-left text-black/80">
        Your changes are saved automatically every {AUTO_SAVE_INTERVAL_MINUTES} minutes (Last saved: {formatLastSaved(lastSaveAt)})
      </p>
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
