<script>
  /**
   * Lists an array of Core Objectives (from prop, or empty). Add opens a dialog;
   * if the input validates, the new objective is appended to the array. Edit/delete per item.
   */
  import * as Field from "$lib/components/ui/field/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import FormInput from "$lib/form/Input.svelte";
  import ToolTip from "$lib/form/ToolTip.svelte";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { z } from "zod";

  let {
    value = $bindable([]),
    onvaluechange,
    validationErrors,
    class: className,
  } = $props();

  const list = $derived(Array.isArray(value) ? value : []);
  const displayList = $derived(
    list
      .map((text, index) => ({ text, index }))
      .filter(({ text }) => (text ?? "").trim() !== ""),
  );

  const objectiveSchema = $derived(
    z.object({ objective: z.string().min(1, "Objective is required").max(400) }),
  );

  let addDialogOpen = $state(false);
  let editingIndex = $state(null);
  let draftObjective = $state("");
  let draftErrors = $state(null);

  /** Error at array level (e.g. "At least one required") or first item error from Zod treeify. */
  const schemaError = $derived.by(() => {
    const core = validationErrors?.properties?.coreObjectives;
    const topError = core?.errors?.[0];
    if (topError) return topError;
    const firstItemError = core?.items?.find((i) => i?.errors?.length)?.errors?.[0];
    return firstItemError ?? "";
  });

  function openDialog(index = null) {
    draftObjective = index != null ? (list[index] ?? "") : "";
    editingIndex = index;
    draftErrors = null;
    addDialogOpen = true;
  }

  function submitObjective() {
    const result = objectiveSchema.safeParse({
      objective: draftObjective.trim(),
    });
    if (!result.success) {
      draftErrors = z.treeifyError(result.error);
      return;
    }
    const text = result.data.objective;
    draftErrors = null;
    const next =
      editingIndex != null
        ? list.map((obj, i) => (i === editingIndex ? text : obj))
        : [...list, text];
    if (onvaluechange) onvaluechange(next);
    else value = next;
    editingIndex = null;
    addDialogOpen = false;
  }

  function remove(i) {
    const next = list.filter((_, idx) => idx !== i);
    if (onvaluechange) onvaluechange(next);
    else value = next;
  }
</script>

<div>
  <Field.Field class="gap-2 {className}">
    <div class="flex items-center gap-1 w-full">
      <Field.Label class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit">
        Core Objectives
        <span class="text-(--mbo-electric-blue)">*</span>
      </Field.Label>
      <ToolTip content="What is this Work Package intended to achieve? Focus on outcomes or improvements, not tasks or activities." />
      <span class="flex-1 min-w-0" aria-hidden="true"></span>
    </div>

    {#if displayList.length > 0}
      <ul
        class="space-y-2 rounded-md border border-input divide-y divide-input"
      >
        {#each displayList as { text, index } (index)}
          <li
            class="flex items-center gap-2 p-2 text-sm bg-(--mbo-sky-blue)/50"
          >
            <span class="min-w-0 flex-1" title={text}>{text}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="shrink-0 size-8 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Edit objective"
              onclick={() => openDialog(index)}
            >
              <PencilIcon class="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="shrink-0 size-8 text-muted-foreground hover:text-destructive cursor-pointer"
              aria-label="Remove objective"
              onclick={() => remove(index)}
            >
              <TrashIcon class="size-4" />
            </Button>
          </li>
        {/each}
      </ul>
    {/if}

    <div class="flex justify-start">
      <Button
        variant="outline"
        class="w-fit cursor-pointer"
        onclick={() => openDialog()}
      >
        <PlusIcon class="size-4 mr-1" />
        Add objective
      </Button>
    </div>

    {#if schemaError}
      <Field.Error class="text-xs">{schemaError}</Field.Error>
    {/if}
  </Field.Field>
</div>

<!-- Add/Edit objective dialog -->
<Dialog.Root bind:open={addDialogOpen}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>
        {editingIndex != null ? "Edit Core Objective" : "Add Core Objective"}
      </Dialog.Title>
      <Dialog.Description>
        What is this Work Package intended to achieve? Focus on outcomes or improvements, not tasks or activities.
      </Dialog.Description>
    </Dialog.Header>
    <div class="grid gap-4 py-2">
      <FormInput
        id="objective"
        bind:value={draftObjective}
        label="Objective"
        description="What is this Work Package intended to achieve? Focus on outcomes or improvements, not tasks or activities."
        placeholder="e.g. Improve node synchronization reliability across the network"
        required
        maxLength={400}
        validationErrors={draftErrors}
      />
    </div>
    <Dialog.Footer class="flex gap-1">
      <Button
        type="button"
        variant="outline"
        class="cursor-pointer"
        onclick={() => (addDialogOpen = false)}
      >
        Cancel
      </Button>
      <Button type="button" class="cursor-pointer" onclick={submitObjective}>
        {editingIndex != null ? "Save changes" : "Add"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
