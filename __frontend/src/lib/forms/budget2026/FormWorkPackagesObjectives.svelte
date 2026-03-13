<script>
  /**
   * Core objectives list for a work package. List, add, edit, delete text objectives.
   */
  import { z } from "zod";
  import * as Field from "$lib/components/ui/field/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import Textarea from "$lib/components/form/Textarea.svelte";
  import ToolTip from "$lib/components/form/ToolTip.svelte";
  import Markdown from "$lib/base/Markdown.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import PlusIcon from "@lucide/svelte/icons/plus";

  let {
    value = $bindable([]),
    validationErrors,
    class: className = "",
  } = $props();

  const label = "Core Objectives";
  const description =
    "List the main objectives this work package is intended to achieve.";
  const addButtonLabel = "Add Core Objective";
  const maxLength = 1000;

  let addDialogOpen = $state(false);
  let deleteDialogOpen = $state(false);
  let indexToDelete = $state(null);
  let editingIndex = $state(null);
  let draftText = $state("");
  let draftError = $state("");

  const objectives = $derived(Array.isArray(value) ? value : []);
  const schemaError = $derived(validationErrors?.errors?.[0]);
  const sectionOutlineClass = $derived(
    schemaError
      ? "rounded-md border border-destructive ring-[3px] ring-destructive/20 p-3"
      : "",
  );

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
  <div class={sectionOutlineClass} aria-invalid={schemaError || undefined}>
    {#if label || description}
      <div class="flex flex-row items-center gap-1 pb-2">
        {#if label}
          <span class="text-sm font-medium mb-0">
            {label}
            <span class="text-(--mbo-electric-blue)">*</span>
          </span>
        {/if}
        {#if description}
          <ToolTip content={description} />
        {/if}
        <span class="flex-1 min-w-0" aria-hidden="true"></span>
      </div>
    {/if}
    <Field.Field class="gap-1">
      {#if objectives.length > 0}
        <ul class="objective-list-editor-list space-y-2 list-none p-0 m-0 mb-1">
          {#each objectives as objective, index (index)}
            <li>
              <Card.Root class="py-2">
                <Card.Header
                  class="flex flex-row items-start gap-2 py-0 pl-3 pr-2 text-sm"
                >
                  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
                  <div
                    class="objective-text min-w-0 flex-1 min-h-8 flex items-center text-left cursor-pointer focus:outline-none line-clamp-3 overflow-hidden"
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
    </Field.Field>
  </div>
  {#if schemaError}
    <Field.Error class="text-xs mt-1.5">{schemaError}</Field.Error>
  {/if}
</div>

<!-- Add / Edit objective (AlertDialog: doesn't close without user action) -->
<AlertDialog.Root bind:open={addDialogOpen}>
  <AlertDialog.Content class="sm:max-w-lg max-h-[90dvh] flex flex-col min-h-0">
    <AlertDialog.Header class="text-left shrink-0">
      <AlertDialog.Title>
        {editingIndex != null ? "Edit Core Objective" : "Add Core Objective"}
      </AlertDialog.Title>
      <AlertDialog.Description>
        {editingIndex != null
          ? "Update the Core Objective below."
          : `Enter the Core Objective (max ${maxLength} characters).`}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <div class="grid gap-4 py-2 overflow-y-auto min-h-0 flex-1">
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
    <AlertDialog.Footer class="flex gap-2 shrink-0 flex-wrap">
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
      <AlertDialog.Cancel class="cursor-pointer">Cancel</AlertDialog.Cancel>
      <Button type="button" class="cursor-pointer" onclick={saveObjective}>
        {editingIndex != null ? "Save changes" : "Save"}
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

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
