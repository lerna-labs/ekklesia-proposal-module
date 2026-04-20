<script>
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { cn } from "$lib/utils.js";
  import UserIcon from "@lucide/svelte/icons/user";
  import Building2Icon from "@lucide/svelte/icons/building-2";
  import UsersRoundIcon from "@lucide/svelte/icons/users-round";

  /** @typedef {'individual' | 'organisation' | 'consortium'} CcTrack */

  let {
    track = $bindable(""),
    trackLocked = false,
    /** @returns {boolean} */
    hasFormData = () => false,
    onResetForNewTrack,
  } = $props();

  /** @type {Array<{ id: CcTrack, label: string, icon: typeof UserIcon }>} */
  const TRACKS = [
    { id: "individual", label: "Individual", icon: UserIcon },
    { id: "organisation", label: "Organisation", icon: Building2Icon },
    { id: "consortium", label: "Consortium", icon: UsersRoundIcon },
  ];

  let confirmOpen = $state(false);
  /** @type {CcTrack | ''} */
  let pendingTrack = $state("");

  /** @param {CcTrack} id */
  function requestTrack(id) {
    if (trackLocked) return;
    if (id === track) return;
    if (!hasFormData()) {
      track = id;
      return;
    }
    pendingTrack = id;
    confirmOpen = true;
  }

  function confirmSwitch() {
    const next = pendingTrack;
    pendingTrack = "";
    confirmOpen = false;
    if (!next) return;
    onResetForNewTrack?.(next);
    track = next;
  }

  function cancelSwitch() {
    pendingTrack = "";
    confirmOpen = false;
  }
</script>

<div class="space-y-3">
  <h2>Track Selection</h2>
  <p class="text-sm text-muted-foreground pb-4">Which type of candidate are you applying for?</p>

  <div class="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Track selection">
    {#each TRACKS as t (t.id)}
      {@const Icon = t.icon}
      <button
        type="button"
        role="radio"
        aria-checked={track === t.id}
        disabled={trackLocked}
        class={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border p-4 text-center transition-colors min-h-[5.5rem]",
          trackLocked ? "opacity-80 cursor-not-allowed" : "cursor-pointer",
          track === t.id
            ? "border-(--mbo-electric-blue) bg-(--mbo-light-blue) ring-2 ring-(--mbo-sky-blue)/70 dark:border-(--mbo-electric-blue) dark:bg-(--mbo-primary-surface) dark:ring-(--mbo-tangy-blue)/40"
            : "border-border hover:bg-muted/50",
        )}
        onclick={() => requestTrack(/** @type {CcTrack} */ (t.id))}
      >
        <Icon
          class={cn("size-8 shrink-0", track === t.id ? "text-(--mbo-electric-blue)" : "text-muted-foreground")}
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <span
          class={cn(
            "font-medium text-sm",
            track === t.id ? "text-(--mbo-cardano-blue) dark:text-(--mbo-sky-blue)" : "text-foreground",
          )}
        >
          {t.label}
        </span>
      </button>
    {/each}
  </div>
  {#if trackLocked}
    <p class="text-xs text-muted-foreground">Track cannot be changed for a live proposal.</p>
  {/if}
</div>

<AlertDialog.Root bind:open={confirmOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Change track?</AlertDialog.Title>
      <AlertDialog.Description>
        Switching tracks will clear what you have entered for this proposal (including title, summary, and
        track-specific fields). This cannot be undone from here.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer class="gap-2">
      <AlertDialog.Cancel onclick={cancelSwitch}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action class="bg-destructive text-white hover:bg-destructive/90" onclick={confirmSwitch}>
        Reset and switch track
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
