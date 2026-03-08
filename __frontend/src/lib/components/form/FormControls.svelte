<script>
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Switch from "$lib/components/ui/switch/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import * as Popover from "$lib/components/ui/popover/index.js";
  import { beforeNavigate, goto } from "$app/navigation";
  import InfoIcon from "@lucide/svelte/icons/info";

  let {
    formData,
    getPayload,
    onSave,
    autoSaveEnabled = $bindable(true),
    /** If set, show "Preview Proposal" button that opens this URL in a new window. */
    previewHref = null,
    /** True when creating a new proposal (no existing id). Auto-save is off and toggle disabled until title is entered; preference is not overwritten. */
    isNewUnsaved = false,
    /** When true, auto-save interval is paused (e.g. while legal declarations modal is open). */
    autoSavePaused = false,
  } = $props();

  /** On new unsaved proposals we keep auto-save off locally; parent preference is unchanged. */
  let newPageAutoSaveEnabled = $state(false);

  const hasTitle = $derived(
    typeof formData?.title === "string" && formData.title.trim() !== "",
  );
  const effectiveAutoSaveEnabled = $derived(
    isNewUnsaved ? newPageAutoSaveEnabled : autoSaveEnabled,
  );
  const toggleDisabled = $derived(isNewUnsaved && !hasTitle);

  /** Keep toggle in sync with actual state: when title is cleared on a new proposal, auto-save stops so show off. */
  $effect(() => {
    if (isNewUnsaved && !hasTitle) {
      newPageAutoSaveEnabled = false;
    }
  });

  const AUTO_SAVE_INTERVAL_MS = 120 * 1000; // 2 minutes

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
    Promise.resolve(onSave(payload, { fromAutoSave: false }))
      .then(() => {
        initialSnapshot = JSON.stringify(payload);
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

  /** Auto-save draft at interval when enabled and (for new proposals) title is present. */
  $effect(() => {
    if (
      !effectiveAutoSaveEnabled ||
      autoSavePaused ||
      formData.status !== "draft" ||
      !hasTitle ||
      !onSave ||
      !getPayload
    )
      return;
    const id = setInterval(() => {
      const payload = getPayload("draft");
      if (!payload?.title?.trim()) return;
      Promise.resolve(onSave(payload, { fromAutoSave: true }))
        .then(() => {
          initialSnapshot = JSON.stringify(payload);
        })
        .catch(() => {});
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
      {/if}
      {#if formData.status === "draft" && onSave && getPayload}
        <div
          class="flex h-9 items-center gap-1.5 rounded-md border bg-white px-4 py-2 shadow-xs text-sm font-medium"
        >
          {#if isNewUnsaved}
            <Switch.Root
              bind:checked={newPageAutoSaveEnabled}
              disabled={toggleDisabled}
              class="data-disabled:opacity-50"
            />
          {:else}
            <Switch.Root bind:checked={autoSaveEnabled} />
          {/if}
          <span
            class="select-none {toggleDisabled ? 'text-muted-foreground' : ''}"
            >Auto-save</span
          >
          <Popover.Root>
            <Popover.Trigger
              class="rounded p-0.5 cursor-pointer text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
              aria-label="Auto-save info"
            >
              <InfoIcon class="size-4" />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content class="w-72 p-3 text-sm" side="top" align="end">
                <p class="text-muted-foreground">
                  {#if isNewUnsaved && !hasTitle}
                    Enter a title for your proposal to enable auto-save.
                  {:else}
                    When enabled, your draft is saved automatically every 2
                    minutes.
                  {/if}
                </p>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      {/if}
    </div>
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
