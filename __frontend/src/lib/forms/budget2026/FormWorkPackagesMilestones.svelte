<script>
  /**
   * Milestones list for a work package. List, add, edit, delete with dialog.
   * Fields: Milestone (and reference name), Deliverables, Acceptance Criteria, Duration.
   */
  import { z } from "zod";
  import * as Field from "$lib/components/ui/field/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import Input from "$lib/components/form/Input.svelte";
  import InputNumber from "$lib/components/form/InputNumber.svelte";
  import Textarea from "$lib/components/form/Textarea.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { milestoneSchema } from "./Schema.js";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import PlusIcon from "@lucide/svelte/icons/plus";

  let {
    value = $bindable([]),
    onvaluechange,
    validationErrors,
    class: className = "",
    /** When true, parent shows the section-level error below the outline; do not show it here. */
    hideSectionError = false,
  } = $props();

  let addDialogOpen = $state(false);
  let deleteDialogOpen = $state(false);
  let indexToDelete = $state(null);
  let editingIndex = $state(null);
  let draft = $state({
    name: "",
    deliverables: "",
    acceptanceCriteria: "",
    duration: "",
  });
  let draftErrors = $state(null);

  const milestones = $derived(Array.isArray(value) ? value : []);
  const schemaError = $derived(validationErrors?.errors?.[0]);

  function getDefaultDraft() {
    return {
      name: "",
      deliverables: "",
      acceptanceCriteria: "",
      duration: "",
    };
  }

  function normalizeMilestone(m) {
    if (!m || typeof m !== "object") return getDefaultDraft();
    return {
      name: (m.name ?? "").toString(),
      deliverables: (m.deliverables ?? "").toString(),
      acceptanceCriteria: (m.acceptanceCriteria ?? "").toString(),
      duration: (m.duration ?? "").toString(),
    };
  }

  function openDialog(index = null) {
    const m = index != null ? milestones[index] : null;
    if (m) {
      draft = normalizeMilestone(m);
      editingIndex = index;
    } else {
      draft = getDefaultDraft();
      editingIndex = null;
    }
    draftErrors = null;
    addDialogOpen = true;
  }

  function submitMilestone() {
    const result = milestoneSchema.safeParse(draft);
    if (!result.success) {
      draftErrors = z.treeifyError(result.error);
      return;
    }
    const data = result.data;
    draftErrors = null;
    let next;
    if (editingIndex != null) {
      next = milestones.map((item, i) => (i === editingIndex ? data : item));
      value = next;
      editingIndex = null;
    } else {
      next = [...milestones, data];
      value = next;
    }
    onvaluechange?.(next);
    addDialogOpen = false;
  }

  function requestDelete(index) {
    indexToDelete = index;
    deleteDialogOpen = true;
  }

  function confirmDelete() {
    if (indexToDelete != null) {
      const next = milestones.filter((_, i) => i !== indexToDelete);
      value = next;
      onvaluechange?.(next);
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
  <Field.Field class="gap-1">
    {#if milestones.length > 0}
      <ul class="milestone-list-editor-list m-0 mb-1! list-none space-y-2 p-0">
        {#each milestones as milestone, index (index)}
          {@const m = normalizeMilestone(milestone)}
          <li>
            <Card.Root class="py-2">
              <Card.Header class="flex flex-row items-start gap-2 py-0 pr-2 pl-3 text-sm">
                <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
                <div
                  class="flex min-h-8 min-w-0 flex-1 cursor-pointer flex-col justify-center text-left focus:outline-none"
                  role="button"
                  tabindex="0"
                  title={m.name || "Milestone"}
                  onclick={() => openDialog(index)}
                  onkeydown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openDialog(index);
                    }
                  }}
                >
                  <span class="inline">
                    <span class="font-medium text-black">
                      {m.name || "Unnamed milestone"}
                    </span>
                    {#if m.duration}
                      <span class="text-muted-foreground">— {m.duration} weeks</span>
                    {/if}
                  </span>
                </div>
                <div class="flex shrink-0 flex-row gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    class="size-8 cursor-pointer text-black"
                    aria-label="Edit milestone"
                    onclick={() => openDialog(index)}
                  >
                    <PencilIcon class="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    class="size-8 cursor-pointer text-black"
                    aria-label="Remove milestone"
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
        class="add-item-btn w-fit cursor-pointer gap-1 text-xs"
        onclick={() => openDialog()}
      >
        <PlusIcon class="size-4" />
        Add Milestone
      </Button>
    </div>

    {#if !hideSectionError && schemaError}
      <Field.Error class="text-xs">{schemaError}</Field.Error>
    {/if}
  </Field.Field>
</div>

<!-- Add / Edit milestone (AlertDialog: doesn't close without user action) -->
<AlertDialog.Root bind:open={addDialogOpen}>
  <AlertDialog.Content class="flex max-h-[90vh] min-h-0 flex-col sm:max-w-xl">
    <AlertDialog.Header class="shrink-0 text-left">
      <AlertDialog.Title>
        {editingIndex != null ? "Edit Milestone" : "Add Milestone"}
      </AlertDialog.Title>
      <AlertDialog.Description>
        {editingIndex != null
          ? "Update the milestone details below."
          : "Add a milestone with name, deliverables, acceptance criteria, and duration (in weeks)."}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <div class="grid min-h-0 flex-1 gap-6 overflow-y-auto px-2 py-4">
      <div class="flex flex-col gap-3">
        <Input
          id="name"
          label="Milestone (and reference name)"
          bind:value={draft.name}
          placeholder="e.g. Milestone 1 – Design Approval"
          description="You may use labels like “Milestone 1,” but please include a descriptive name afterward (e.g., “Milestone 1 – Design Approval”)."
          required
          maxLength={100}
          validationErrors={draftErrors}
        />
      </div>

      <div class="flex flex-col gap-3">
        <h5>What will you deliver in this milestone?</h5>
        <Textarea
          id="deliverables"
          label="Deliverables"
          bind:value={draft.deliverables}
          placeholder="e.g. Architectural diagram and MVP"
          description="Concrete outputs produced in this milestone (reports, code, documentation, audits, etc.)."
          required
          maxLength={4000}
          validationErrors={draftErrors}
        />
      </div>

      <div class="flex flex-col gap-3">
        <h5>How do you know it's "done"?</h5>
        <Textarea
          id="acceptanceCriteria"
          label="Acceptance Criteria"
          bind:value={draft.acceptanceCriteria}
          placeholder="e.g. The architectural diagram file has been shared, the MVP is accessible via a simple URL"
          description="Define the objective conditions that must be met for this milestone to be considered complete and eligible for approval or payment."
          required
          maxLength={4000}
          validationErrors={draftErrors}
        />
      </div>

      <div class="flex flex-col gap-3">
        <h5>How many weeks will you need to complete this milestone?</h5>
        <InputNumber
          id="duration"
          label="Duration"
          type="number"
          bind:value={draft.duration}
          placeholder="e.g. 2"
          description="How long do you expect it to take for this milestone to be finished?"
          required
          suffix="weeks"
          min="1"
          max="240"
          step="1"
          maxDecimals={0}
          class="w-1/4"
          validationErrors={draftErrors}
        />
      </div>

      <div>
        <p class="text-muted-foreground text-xs">
          If Intersect is chosen and agrees to act as an Administrator, milestones and payments
          submitted will be adjusted to a monthly cycle for smart contracting.
        </p>
      </div>
    </div>
    <AlertDialog.Footer class="flex shrink-0 flex-wrap gap-2">
      {#if editingIndex != null}
        <Button
          type="button"
          variant="destructive"
          class="mr-auto cursor-pointer"
          onclick={deleteFromDialog}
        >
          <TrashIcon class="mr-1 size-4" />
          Delete
        </Button>
      {/if}
      <AlertDialog.Cancel class="cursor-pointer">Cancel</AlertDialog.Cancel>
      <Button type="button" class="cursor-pointer" onclick={submitMilestone}>
        {editingIndex != null ? "Save changes" : "Add Milestone"}
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Delete confirmation -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Remove milestone</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to remove this milestone? This cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer class="flex gap-2">
      <AlertDialog.Cancel class="cursor-pointer">Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        class="bg-destructive hover:bg-destructive/90 cursor-pointer text-white"
        onclick={confirmDelete}
      >
        Delete
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<style>
  :global(form ul.milestone-list-editor-list) {
    padding-left: 0;
    list-style: none;
  }
</style>
