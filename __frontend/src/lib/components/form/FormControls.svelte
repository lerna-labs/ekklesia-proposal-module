<script>
  import { Button } from "$lib/components/ui/button/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { beforeNavigate, goto } from "$app/navigation";

  /** Set to true to log auto-save lifecycle, ticks, and outcomes to the console. */
  const DEBUG_AUTOSAVE = true;

  function autosaveLog(...args) {
    if (DEBUG_AUTOSAVE) {
      console.log("[AUTOSAVE]", ...args);
    }
  }

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

  let prevDirty = $state(undefined);
  $effect(() => {
    if (prevDirty !== isDirty) {
      autosaveLog("dirty state changed", { was: prevDirty, isDirty });
      prevDirty = isDirty;
    }
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
    autosaveLog("manual saveDraft", { exitAfterSave: !!exitAfterSave });
    Promise.resolve(
      onSave(payload, { fromAutoSave: false, exitAfterSave: !!exitAfterSave }),
    )
      .then(() => {
        initialSnapshot = JSON.stringify(payload);
        lastSaveAt = Date.now();
        autosaveLog("manual saveDraft succeeded", {
          exitAfterSave: !!exitAfterSave,
        });
      })
      .catch((err) => {
        autosaveLog("manual saveDraft failed", err);
      });
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
    if (getPayload) {
      initialSnapshot = JSON.stringify(getPayload(formData.status));
      autosaveLog("resetDirtyBaseline called");
    }
  }

  /** Auto-save draft at interval when draft, only when dirty. */
  $effect(() => {
    if (
      autoSavePaused ||
      formData.status !== "draft" ||
      !onSave ||
      !getPayload
    ) {
      autosaveLog("auto-save effect inactive", {
        autoSavePaused,
        status: formData?.status,
        hasOnSave: !!onSave,
        hasGetPayload: !!getPayload,
      });
      return;
    }
    autosaveLog("auto-save interval started", {
      intervalMs: AUTO_SAVE_INTERVAL_MS,
      intervalMinutes: AUTO_SAVE_INTERVAL_MINUTES,
    });
    const id = setInterval(() => {
      if (!isDirty) {
        autosaveLog("auto-save tick: skipped (form not dirty)");
        return;
      }
      const payload = getPayload("draft");
      autosaveLog("auto-save tick: sending save", {
        hasPayload: !!payload,
        titleLength: payload?.title?.length ?? 0,
      });
      Promise.resolve(onSave(payload, { fromAutoSave: true }))
        .then(() => {
          initialSnapshot = JSON.stringify(payload);
          lastSaveAt = Date.now();
          autosaveLog("auto-save succeeded", {
            lastSaveAt: new Date(lastSaveAt).toISOString(),
          });
        })
        .catch((err) => {
          autosaveLog("auto-save failed", {
            message: err?.message,
            error: err,
          });
        });
    }, AUTO_SAVE_INTERVAL_MS);
    return () => {
      clearInterval(id);
      autosaveLog("auto-save interval cleared");
    };
  });

  function formatLastSaved(ts) {
    if (ts == null) return "—";
    return new Date(ts).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<section
  class="bg-(--mbo-orange) w-full sticky bottom-0 shadow-lg z-10 shadow-black/50 py-6 px-4"
  id="controls"
>
  <div class="max-w-4xl mx-auto flex flex-col gap-2 container py-2 px-0 pb-0">
    <div
      class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2"
    >
      {#if formData.status === "draft"}
        <div class="flex gap-2 w-full sm:w-auto">
          <Button
            type="button"
            class="flex-1 min-w-0 cursor-pointer sm:flex-none"
            onclick={() => saveDraft(true)}
          >
            Save & Exit
          </Button>
          <Button
            type="button"
            class="flex-1 min-w-0 cursor-pointer sm:flex-none"
            onclick={() => saveDraft(false)}
          >
            Save
          </Button>
        </div>
      {/if}
      {#if previewHref}
        <div
          class="flex flex-col gap-2 w-full sm:flex-row sm:ml-auto sm:w-auto"
        >
          <Button
            type="button"
            variant="outline"
            class="w-full cursor-pointer bg-white text-black hover:bg-gray-100 border border-gray-300 sm:w-auto"
            href={previewHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Preview Proposal
          </Button>
          <Button
            type="button"
            class="w-full cursor-pointer sm:w-auto"
            onclick={submitLive}
          >
            {formData.status === "draft"
              ? "Submit Proposal"
              : "Re-Submit Proposal"}
          </Button>
        </div>
      {/if}
    </div>
    {#if formData.status === "draft"}
      <p class="text-xs! text-left text-black/80">
        Your changes are saved automatically every {AUTO_SAVE_INTERVAL_MINUTES} minutes
        {#if lastSaveAt != null}
          (Last saved: {formatLastSaved(lastSaveAt)})
        {/if}
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
