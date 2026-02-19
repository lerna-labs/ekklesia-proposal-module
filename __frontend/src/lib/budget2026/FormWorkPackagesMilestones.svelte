<script>
  /**
   * Milestone section for a work package. "How do you plan to deliver this package?"
   * List of milestones with Add Milestone button; dialog form uses Schema.js milestone fields.
   */
  import * as Field from "$lib/components/ui/field/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import FormInput from "$lib/form/Input.svelte";
  import FormTextarea from "$lib/form/Textarea.svelte";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { milestoneSchema } from "./Schema.js";
  import { z } from "zod";
  import Markdown from "$lib/base/Markdown.svelte";

  let {
    value = $bindable([]),
    onvaluechange,
    class: className,
  } = $props();

  const list = $derived(Array.isArray(value) ? value : []);

  let addDialogOpen = $state(false);
  let editingIndex = $state(null);
  let draft = $state({
    milestoneName: "",
    deliverables: "",
    acceptanceCriteria: "",
    duration: "",
  });
  let draftErrors = $state(null);

  function getDefaultDraft() {
    return {
      milestoneName: "",
      deliverables: "",
      acceptanceCriteria: "",
      duration: "",
    };
  }

  function openDialog(index = null) {
    const m = index != null ? list[index] : null;
    if (m) {
      draft = {
        milestoneName: m.milestoneName ?? "",
        deliverables: m.deliverables ?? "",
        acceptanceCriteria: m.acceptanceCriteria ?? "",
        duration: m.duration ?? "",
      };
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
    const next =
      editingIndex != null
        ? list.map((item, i) => (i === editingIndex ? data : item))
        : [...list, data];
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

<Field.Field class="gap-2 {className}">
  <div class="flex items-center gap-1 w-full">
    <Field.Label
      class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit font-medium text-muted-foreground"
    >
      Milestones
    </Field.Label>
    <span class="flex-1 min-w-0" aria-hidden="true"></span>
  </div>
  <p class="text-xs text-muted-foreground mb-2">How do you plan to deliver this package?</p>

  {#if list.length > 0}
    <ul
      class="space-y-3 border border-input rounded-md divide-y divide-input mb-2"
    >
      {#each list as m, i (i)}
        <li class="p-3 first:pt-3 flex items-start gap-2">
          <div class="min-w-0 flex-1">
            <span class="font-medium">{m.milestoneName || "Milestone"}</span>
            {#if m.duration}
              <span class="text-muted-foreground ml-2">— {m.duration}</span>
            {/if}
            {#if m.deliverables}
              <div class="mt-1 text-muted-foreground text-sm">
                <Markdown
                  content={m.deliverables}
                  class="prose-p:my-0 prose-ul:my-1 prose-li:my-0"
                />
              </div>
            {/if}
            {#if m.acceptanceCriteria}
              <div class="mt-1 text-muted-foreground text-xs">
                <span class="font-medium">Acceptance:</span>
                <Markdown
                  content={m.acceptanceCriteria}
                  class="prose-p:my-0 prose-ul:my-1 prose-li:my-0"
                />
              </div>
            {/if}
          </div>
          <div class="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Edit milestone"
              onclick={() => openDialog(i)}
            >
              <PencilIcon class="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              class="size-8 text-muted-foreground hover:text-destructive cursor-pointer"
              aria-label="Remove milestone"
              onclick={() => remove(i)}
            >
              <TrashIcon class="size-4" />
            </Button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  <Button
    type="button"
    variant="outline"
    class="add-item-btn w-fit cursor-pointer gap-1"
    onclick={() => openDialog()}
  >
    <PlusIcon class="size-4" />
    Add Milestone
  </Button>
</Field.Field>

<Dialog.Root bind:open={addDialogOpen}>
  <Dialog.Content
    class="sm:max-w-xl max-h-[90vh] overflow-y-auto flex flex-col"
  >
    <Dialog.Header>
      <Dialog.Title>
        {editingIndex != null ? "Edit Milestone" : "Add Milestone"}
      </Dialog.Title>
      <Dialog.Description>
        {editingIndex != null
          ? "Update the milestone details below."
          : "How do you plan to deliver this package? Add a milestone with name, deliverables, acceptance criteria, and duration."}
      </Dialog.Description>
    </Dialog.Header>
    <div class="grid gap-4 py-4">
      <FormInput
        id="milestoneName"
        bind:value={draft.milestoneName}
        label="Milestone (and reference name)"
        description="You may use labels like 'Milestone 1,' but please include a descriptive name afterward."
        placeholder="e.g. Milestone 1 – Design Approval"
        required
        maxLength={100}
        validationErrors={draftErrors}
      />
      <FormTextarea
        id="deliverables"
        bind:value={draft.deliverables}
        label="Deliverables"
        description="What is produced? Concrete outputs (reports, code, documentation, audits, etc.)."
        placeholder="e.g. Senior Dev"
        required
        maxLength={600}
        validationErrors={draftErrors}
      />
      <FormTextarea
        id="acceptanceCriteria"
        bind:value={draft.acceptanceCriteria}
        label="Acceptance Criteria"
        description="How do you know it's done?"
        placeholder="Enter Description"
        required
        maxLength={600}
        validationErrors={draftErrors}
      />
      <FormInput
        id="duration"
        bind:value={draft.duration}
        label="Duration"
        description="How long do you expect it to take for this milestone to be finished?"
        placeholder="e.g. 2 weeks"
        required
        maxLength={200}
        validationErrors={draftErrors}
      />
    </div>
    <Dialog.Footer class="flex gap-2 shrink-0">
      <Button
        type="button"
        variant="outline"
        class="cursor-pointer"
        onclick={() => (addDialogOpen = false)}
      >
        Cancel
      </Button>
      <Button type="button" class="cursor-pointer" onclick={submitMilestone}>
        {editingIndex != null ? "Save Milestone" : "Add Milestone"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
