<script>
  /**
   * Reusable component for listing, adding, editing, and deleting text objectives (e.g. core objectives).
   * Each item is a string. Add/Edit dialog uses a single Textarea with configurable max length.
   */
  import { z } from "zod";
  import * as Field from "$lib/components/ui/field/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import Textarea from "$lib/components/form/Textarea.svelte";
  import ToolTip from "$lib/components/form/ToolTip.svelte";
  import Markdown from "$lib/base/Markdown.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import PlusIcon from "@lucide/svelte/icons/plus";

  let {
    value = $bindable([]),
    label = "Objectives",
    description = "",
    validationErrors,
    addButtonLabel = "Add Core Objective",
    emptyMessage,
    maxLength = 1000,
    class: className = "",
  } = $props();

  let addDialogOpen = $state(false);
  let deleteDialogOpen = $state(false);
  let indexToDelete = $state(null);
  let editingIndex = $state(null);
  let draftText = $state("");
  let draftError = $state("");

  const objectives = $derived(Array.isArray(value) ? value : []);
  const schemaError = $derived(validationErrors?.errors?.[0]);

  function openAddDialog(index = null) {
    const obj = index != null ? objectives[index] : null;
    if (obj != null) {
      draftText = typeof obj === "string" ? obj : "";
      editingIndex = index;
    } else {
      draftText = "";
      editingIndex = null;
    }
    draftError = "";
    addDialogOpen = true;
  }

  function saveObjective() {
    const len = maxLength;
    const schema = z
      .string()
      .min(1, "Objective is required")
      .max(len, `Objective must be at most ${len} characters`);
    const result = schema.safeParse(draftText.trim());
    if (!result.success) {
      const tree = z.treeifyError(result.error);
      draftError =
        tree.errors?.[0] ??
        tree.properties?._errors?.[0] ??
        "Invalid objective";
      return;
    }
    draftError = "";
    const item = result.data;
    if (editingIndex != null) {
      value = objectives.map((it, i) => (i === editingIndex ? item : it));
      editingIndex = null;
    } else {
      value = [...objectives, item];
    }
    addDialogOpen = false;
  }

  function requestDelete(index) {
    indexToDelete = index;
    deleteDialogOpen = true;
  }

  function confirmDelete() {
    if (indexToDelete != null) {
      value = objectives.filter((_, i) => i !== indexToDelete);
      indexToDelete = null;
    }
    deleteDialogOpen = false;
  }

  function deleteFromDialog() {
    if (editingIndex != null) {
      indexToDelete = editingIndex;
      editingIndex = null;
      addDialogOpen = false;
      deleteDialogOpen = true;
    }
  }
</script>

<div class={[className, "gap-2"].filter(Boolean).join(" ")}>
  {#if label || description}
    <div class="flex flex-row items-center gap-1 pb-2">
      {#if label}
        <span class="text-sm font-medium mb-0">{label}</span>
      {/if}
      {#if description}
        <ToolTip content={description} />
      {/if}
      <span class="flex-1 min-w-0" aria-hidden="true"></span>
    </div>
  {/if}
  <Field.Field class="gap-1">
    {#if objectives.length > 0}
      <ul class="objective-list-editor-list space-y-2 list-none p-0 m-0">
        {#each objectives as objective, index (index)}
          <li>
            <Card.Root class="py-2">
              <Card.Header class="flex flex-row items-start gap-2 py-0 pl-3 pr-2 text-sm">
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
                <div
                  class="min-w-0 flex-1 text-left cursor-pointer focus:outline-none line-clamp-3 overflow-hidden"
                  role="button"
                  tabindex="0"
                  title={typeof objective === "string" ? objective : ""}
                  onclick={() => openAddDialog(index)}
                  onkeydown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openAddDialog(index);
                    }
                  }}
                >
                  <Markdown content={objective ?? ""} class="text-inherit" />
                </div>
                <div class="flex flex-row gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    class="size-8 text-black cursor-pointer"
                    aria-label="Edit objective"
                    onclick={() => openAddDialog(index)}
                  >
                    <PencilIcon class="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    class="size-8 text-black cursor-pointer"
                    aria-label="Remove objective"
                    onclick={() => requestDelete(index)}
                  >
                    <TrashIcon class="size-4" />
                  </Button>
                </div>
              </Card.Header>
            </Card.Root>
          </li>
        {/each}
      </ul>
    {:else if emptyMessage}
      <p class="text-sm text-muted-foreground">{emptyMessage}</p>
    {/if}

    <div class="flex justify-start">
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="add-item-btn text-xs w-fit cursor-pointer gap-1"
        onclick={openAddDialog}
      >
        <PlusIcon class="size-4" />
        {addButtonLabel}
      </Button>
    </div>

    {#if schemaError}
      <Field.Error class="text-xs">{schemaError}</Field.Error>
    {/if}
  </Field.Field>
</div>

<!-- Add / Edit objective dialog -->
<Dialog.Root bind:open={addDialogOpen}>
  <Dialog.Content class="sm:max-w-lg">
    <Dialog.Header class="text-left">
      <Dialog.Title>
        {editingIndex != null ? "Edit Core Objective" : "Add Core Objective"}
      </Dialog.Title>
      <Dialog.Description>
        {editingIndex != null
          ? "Update the Core Objective below."
          : `Enter the Core Objective (max ${maxLength} characters).`}
      </Dialog.Description>
    </Dialog.Header>
    <div class="grid gap-4 py-2">
      <Textarea
        id="objective-list-editor-text"
        label="Core Objective"
        bind:value={draftText}
        placeholder="e.g. Improve node synchronization reliability across the network"
        description="What is this Work Package intended to achieve? Focus on outcomes or improvements, not tasks or activities. "
        required
        {maxLength}
        validationErrors={draftError
          ? {
              properties: {
                "objective-list-editor-text": { errors: [draftError] },
              },
            }
          : null}
      />
    </div>
    <Dialog.Footer class="flex gap-2 flex-wrap">
      {#if editingIndex != null}
        <Button
          type="button"
          variant="destructive"
          class="mr-auto cursor-pointer"
          onclick={deleteFromDialog}
        >
          <TrashIcon class="size-4 mr-1" />
          Delete
        </Button>
      {/if}
      <Button
        type="button"
        variant="outline"
        class="cursor-pointer"
        onclick={() => (addDialogOpen = false)}
      >
        Cancel
      </Button>
      <Button type="button" class="cursor-pointer" onclick={saveObjective}>
        {editingIndex != null ? "Save changes" : "Save"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Delete confirmation -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Remove objective</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to remove this objective? This cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer class="flex gap-2">
      <AlertDialog.Cancel class="cursor-pointer">Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        class="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
        onclick={confirmDelete}
      >
        Delete
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<style>
  :global(form ul.objective-list-editor-list) {
    padding-left: 0;
    list-style: none;
  }
</style>
