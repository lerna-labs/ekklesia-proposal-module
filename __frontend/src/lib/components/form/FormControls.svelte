<script>
  import { Button, buttonVariants } from "$lib/components/ui/button/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { beforeNavigate, goto } from "$app/navigation";
  import EyeIcon from "@lucide/svelte/icons/eye";
  import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
  import { writePreviewPayload, clearPreviewStorage } from "$lib/previewProposalStorage.js";
  import { formatUtcInstant } from "$lib/formatUtc.js";

  /** Set to true to log auto-save lifecycle, ticks, and outcomes to the console. */
  const DEBUG_AUTOSAVE = false;

  function autosaveLog(...args) {
    if (DEBUG_AUTOSAVE) {
      console.log("[AUTOSAVE]", ...args);
    }
  }

  let {
    formData,
    getPayload,
    onSave,
    /** When set with vote, enables "Preview Proposal" (writes to storage and opens preview tab). */
    proposal = null,
    /** When set with proposal, enables preview (previewHref = /votes/{slug}/{id}?preview). */
    vote = null,
    /** When true, auto-save interval is paused (e.g. while legal declarations modal is open). */
    autoSavePaused = false,
  } = $props();

  const previewHref = $derived(
    proposal?._id && vote?.slug ? `/votes/${vote.slug}/${proposal._id}?preview` : null,
  );

  async function onPreviewClick() {
    if (!vote?.slug || !getPayload) return;
    const payload = getPayload(formData.status);
    if (!payload) return;

    let proposalId = proposal?._id;
    if (!proposalId && formData.status === "draft" && onSave) {
      try {
        const saved = await onSave(payload, {
          fromAutoSave: false,
          exitAfterSave: false,
        });
        proposalId = saved?._id ?? null;
      } catch (_) {
        return;
      }
    }

    if (!proposalId) return;
    writePreviewPayload(proposalId, payload);
    setTimeout(() => {
      window.open(`/votes/${vote.slug}/${proposalId}?preview`, "_blank", "noopener,noreferrer");
    }, 0);
  }

  const AUTO_SAVE_INTERVAL_MS = 120 * 1000; // 2 minutes
  const AUTO_SAVE_INTERVAL_MINUTES = AUTO_SAVE_INTERVAL_MS / 60000;

  let lastSaveAt = $state(null);

  /** Blocks double-submit and shows loading until live/re-submit onSave settles (local, synchronous on click). */
  let submitInFlight = $state(false);

  /** Snapshot of current form data for dirty check (serialized payload). */
  let formDataSnapshot = $derived(getPayload ? JSON.stringify(getPayload(formData.status)) : "");

  let initialSnapshot = $state(null);

  $effect(() => {
    if (initialSnapshot !== null) return;
    initialSnapshot = formDataSnapshot;
  });

  let isDirty = $derived(initialSnapshot !== null && formDataSnapshot !== initialSnapshot);

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

  function saveAndLeave() {
    const url = pendingNavigateUrl;
    leaveConfirmOpen = false;
    pendingNavigateUrl = null;
    if (!url || !getPayload || !onSave || formData.status !== "draft") return;
    const payload = getPayload("draft");
    autosaveLog("saveAndLeave", { url });
    Promise.resolve(
      onSave(payload, {
        fromAutoSave: false,
        exitAfterSave: true,
        skipGoto: true,
      }),
    )
      .then(() => {
        initialSnapshot = JSON.stringify(getPayload(formData.status));
        dirtyRef.current = false;
        lastSaveAt = Date.now();
        if (proposal?._id) writePreviewPayload(proposal._id, getPayload(formData.status));
        clearPreviewStorage();
        goto(url);
      })
      .catch((err) => {
        autosaveLog("saveAndLeave failed", err);
        pendingNavigateUrl = url;
        leaveConfirmOpen = true;
      });
  }

  function saveDraft(exitAfterSave) {
    if (!getPayload || !onSave) return;
    const payload = getPayload("draft");
    autosaveLog("manual saveDraft", { exitAfterSave: !!exitAfterSave });
    if (exitAfterSave) {
      // Mark not dirty immediately so when the page's goto() triggers beforeNavigate,
      // we don't show "unsaved changes". If save fails we revert so the form is dirty again.
      initialSnapshot = JSON.stringify(payload);
    }
    Promise.resolve(onSave(payload, { fromAutoSave: false, exitAfterSave: !!exitAfterSave }))
      .then(() => {
        initialSnapshot = JSON.stringify(getPayload(formData.status));
        lastSaveAt = Date.now();
        if (payload?.status === "draft" && proposal?._id) {
          writePreviewPayload(proposal._id, getPayload(formData.status));
        }
        if (exitAfterSave) clearPreviewStorage();
        autosaveLog("manual saveDraft succeeded", {
          exitAfterSave: !!exitAfterSave,
        });
      })
      .catch((err) => {
        autosaveLog("manual saveDraft failed", err);
        if (exitAfterSave) {
          // Save failed; mark dirty again so leave-confirm works if they navigate away.
          initialSnapshot = "";
        }
      });
  }

  function submitLive() {
    if (!getPayload || !onSave || submitInFlight) return;
    const payload = getPayload("live");
    submitInFlight = true;
    Promise.resolve(onSave(payload))
      .then(() => {
        initialSnapshot = JSON.stringify(getPayload(formData.status));
        clearPreviewStorage();
      })
      .catch(() => {})
      .finally(() => {
        submitInFlight = false;
      });
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
    if (autoSavePaused || formData.status !== "draft" || !onSave || !getPayload) {
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
          initialSnapshot = JSON.stringify(getPayload(formData.status));
          lastSaveAt = Date.now();
          if (payload?.status === "draft" && proposal?._id) {
            writePreviewPayload(proposal._id, getPayload(formData.status));
          }
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

  /** Debounced write of current form payload to preview storage (so preview tab reload stays in sync). */
  const PREVIEW_DEBOUNCE_MS = 800;
  $effect(() => {
    if (typeof window === "undefined" || !proposal?._id || !vote?.slug || !getPayload) return;
    const proposalId = proposal._id;
    const payload = getPayload(formData.status);
    const payloadJson = JSON.stringify(payload);
    const id = setTimeout(() => {
      try {
        const p = JSON.parse(payloadJson);
        writePreviewPayload(proposalId, p);
      } catch (_) {}
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(id);
  });

  function formatLastSaved(ts) {
    return formatUtcInstant(ts, { hour: "2-digit", minute: "2-digit" });
  }
</script>

<section
  class="sticky bottom-0 z-10 w-full bg-(--mbo-orange) py-6 shadow-lg shadow-black/50"
  id="controls"
>
  <div class="container mx-auto flex max-w-4xl flex-col gap-2 px-4 py-2 pb-0">
    <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
      {#if formData.status === "draft"}
        <div class="flex w-full gap-2 sm:w-auto">
          <Button
            type="button"
            variant="outline"
            class="min-w-0 flex-1 cursor-pointer sm:flex-none"
            onclick={() => saveDraft(true)}
          >
            Save & Exit
          </Button>
          <Button
            type="button"
            variant="outline"
            class="min-w-0 flex-1 cursor-pointer sm:flex-none"
            onclick={() => saveDraft(false)}
          >
            Save
          </Button>
        </div>
      {/if}
      <div class="flex w-full flex-col gap-2 sm:ml-auto sm:w-auto sm:flex-row">
        <Button
          type="button"
          variant="outline"
          class="inline-flex w-full cursor-pointer items-center gap-2 border border-gray-300 bg-white text-black hover:bg-gray-100 sm:w-auto"
          onclick={onPreviewClick}
        >
          <EyeIcon class="size-4 shrink-0" aria-hidden="true" />
          Preview Proposal
        </Button>
        <Button
          type="button"
          class="inline-flex w-full cursor-pointer items-center justify-center gap-2 sm:w-auto"
          disabled={submitInFlight}
          aria-busy={submitInFlight}
          onclick={submitLive}
        >
          {#if submitInFlight}
            <LoaderCircleIcon class="size-4 shrink-0 animate-spin" aria-hidden="true" />
            <span>Submitting…</span>
          {:else}
            {formData.status === "draft" ? "Submit Proposal" : "Re-Submit Proposal"}
          {/if}
        </Button>
      </div>
    </div>
    {#if formData.status === "draft"}
      <p class="mb-0! text-left text-xs! text-white">
        <strong>Auto-saved</strong>
        every 2 minutes
      </p>
    {:else}
      <p class="mb-0! text-right text-xs! text-white">
        <strong>Auto-save</strong>
        is disabled for live proposals.
      </p>
    {/if}
  </div>
</section>

<AlertDialog.Root bind:open={leaveConfirmOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title class="text-destructive"
        >Are you sure you want to leave this form?</AlertDialog.Title
      >
      <AlertDialog.Description
        >You have unsaved changes. Are you sure you want to leave?</AlertDialog.Description
      >
    </AlertDialog.Header>
    <AlertDialog.Footer>
      {#if formData.status === "draft"}
        <AlertDialog.Action class={buttonVariants({ variant: "secondary" })} onclick={saveAndLeave}>
          Yes, save & exit
        </AlertDialog.Action>
      {/if}
      <AlertDialog.Action class={buttonVariants({ variant: "destructive" })} onclick={confirmLeave}>
        Yes, discard unsaved changes
      </AlertDialog.Action>
      <AlertDialog.Cancel
        class={buttonVariants({
          variant: "default",
          class: "hover:text-white",
        })}
        onclick={stayOnPage}
      >
        No, stay
      </AlertDialog.Cancel>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
