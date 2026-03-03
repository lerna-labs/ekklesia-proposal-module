<script>
  /**
   * Work packages list editor: list of work packages with add, edit (dialog), and delete.
   * Pattern matches LinkListEditor: list of items, click title or pencil to edit, trash to remove, Add button.
   */
  import { z } from "zod";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import Input from "$lib/components/form/Input.svelte";
  import Textarea from "$lib/components/form/Textarea.svelte";
  import LinkListEditor from "$lib/components/form/LinkListEditor.svelte";
  import ToolTip from "$lib/components/form/ToolTip.svelte";
  import FormWorkPackagesCard from "./FormWorkPackagesCard.svelte";
  import FormWorkPackagesObjectives from "./FormWorkPackagesObjectives.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { workPackageSchema } from "./Schema.js";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import PlusIcon from "@lucide/svelte/icons/plus";

  let {
    value = $bindable([]),
    label = "Work Packages",
    description = "Break down the work into packages: summary, objectives, milestones, and budget per package.",
    validationErrors,
    addButtonLabel = "Add Work Package",
    emptyMessage,
    class: className = "",
  } = $props();

  let addDialogOpen = $state(false);
  let deleteDialogOpen = $state(false);
  let indexToDelete = $state(null);
  let editingIndex = $state(null);

  /** Work package shape (matches workPackageSchema in Schema.js). */
  function getDefaultDraft() {
    return {
      name: "",
      summary: "",
      supportingDocuments: [],
      coreObjectives: [],
      expectedValue: "",
      metric: "",
      milestones: [],
      budgetBreakdown: [],
    };
  }

  /** Normalize a work package from API/prefill into the shape used by the form (e.g. links as { title, url }). */
  function normalizeWorkPackage(pkg) {
    if (!pkg || typeof pkg !== "object") return getDefaultDraft();
    return {
      name: (pkg.name ?? "").toString(),
      summary: (pkg.summary ?? pkg.scope ?? "").toString(),
      supportingDocuments: Array.isArray(pkg.supportingDocuments)
        ? pkg.supportingDocuments.map((l) => ({
            title: (l?.title ?? "").trim(),
            url: (l?.url ?? "").trim(),
          }))
        : [],
      estimatedDuration: pkg.estimatedDuration ?? "",
      coreObjectives:
        Array.isArray(pkg.coreObjectives) && pkg.coreObjectives.length > 0
          ? pkg.coreObjectives.map((o) => (o ?? "").trim())
          : [],
      expectedValue: pkg.expectedValue ?? "",
      metric: pkg.metric ?? "",
      milestones: Array.isArray(pkg.milestones) ? [...pkg.milestones] : [],
      budgetBreakdown: Array.isArray(pkg.budgetBreakdown)
        ? [...pkg.budgetBreakdown]
        : [],
    };
  }

  let draft = $state(getDefaultDraft());
  let draftErrors = $state(null);

  const packages = $derived(Array.isArray(value) ? value : []);
  const schemaError = $derived(
    validationErrors?.properties?.workPackages?.errors?.[0],
  );

  function openAddDialog(index = null) {
    const pkg = index != null ? packages[index] : null;
    if (pkg) {
      draft = normalizeWorkPackage(pkg);
      editingIndex = index;
    } else {
      draft = getDefaultDraft();
      editingIndex = null;
    }
    draftErrors = null;
    addDialogOpen = true;
  }

  function saveWorkPackage() {
    const linksFiltered = (draft.supportingDocuments ?? []).filter(
      (l) => (l?.title ?? "").trim() || (l?.url ?? "").trim(),
    );
    const toValidate = {
      ...draft,
      supportingDocuments: linksFiltered,
    };
    const result = workPackageSchema.safeParse(toValidate);
    if (!result.success) {
      draftErrors = z.treeifyError(result.error);
      return;
    }
    const data = result.data;
    const final = normalizeWorkPackage({
      ...data,
      summary: data.summary ?? "",
      estimatedDuration: data.estimatedDuration ?? "",
    });
    draftErrors = null;
    if (editingIndex != null) {
      value = packages.map((item, i) => (i === editingIndex ? final : item));
      editingIndex = null;
    } else {
      value = [...packages, final];
    }
    addDialogOpen = false;
  }

  function requestDelete(index) {
    indexToDelete = index;
    deleteDialogOpen = true;
  }

  function confirmDelete() {
    if (indexToDelete != null) {
      value = packages.filter((_, i) => i !== indexToDelete);
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

  const supportingDocsValidationErrors = $derived(
    draftErrors?.properties?.supportingDocuments
      ? {
          errors: draftErrors.properties.supportingDocuments.errors ?? [],
        }
      : null,
  );

  /** First validation error message for display at top of dialog when validation fails. */
  const firstValidationError = $derived.by(() => {
    const e = draftErrors;
    if (!e) return null;
    const first = e.errors?.[0];
    if (first) return first;
    const firstProp = e.properties && Object.values(e.properties)[0];
    return typeof firstProp === "object" && firstProp?.errors?.[0]
      ? firstProp.errors[0]
      : null;
  });
</script>

<div class={[className, "gap-2 mb-8"].filter(Boolean).join(" ")}>
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
    {#if packages.length > 0}
      <ul class="work-package-list space-y-2 list-none p-0 mb-1!">
        {#each packages as pkg, index (index)}
          <li>
            <FormWorkPackagesCard
              name={pkg.name}
              onEdit={() => openAddDialog(index)}
              onDelete={() => requestDelete(index)}
            />
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

<!-- Add / Edit work package dialog -->
<Dialog.Root bind:open={addDialogOpen}>
  <Dialog.Content
    class="sm:max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col"
  >
    <Dialog.Header class="text-left">
      <Dialog.Title>
        {editingIndex != null ? "Edit Work Package" : "Add Work Package"}
      </Dialog.Title>
      <Dialog.Description>
        This section breaks down the proposed work and the value it delivers to
        Cardano.
      </Dialog.Description>
    </Dialog.Header>
    <div class="grid gap-4 py-4">
      {#if firstValidationError}
        <p class="text-sm text-destructive font-medium" role="alert">
          {firstValidationError}
        </p>
      {/if}
      <Input
        id="name"
        label="Work Package Name"
        bind:value={draft.name}
        placeholder="e.g. WP1 Node Performance Improvements"
        description="A descriptive name for this specific work package."
        required
        maxLength={100}
        validationErrors={draftErrors}
        class="mb-4"
      />

      <h2>Please describe this Work Package at a high level</h2>
      <p class="text-sm text-muted-foreground">
        Describe the main activities and, where relevant, the key outputs or
        deliverables. The goal is to give reviewers enough context to understand
        what this work covers, without requiring a detailed delivery plan.
      </p>

      <Textarea
        id="summary"
        label="Work Package Summary"
        bind:value={draft.summary}
        placeholder="Describe the main activities and, where applicable, the key outputs or deliverables associated with this work package"
        description="Provide a high-level description of the work involved. This may include activities, approaches, or key outputs, but does not need to be a detailed delivery plan. The goal is to give reviewers enough context to understand how the stated objectives will be achieved."
        required
        maxLength={10000}
        validationErrors={draftErrors}
      />

      <h2>What is this work package intended to achieve?</h2>

      <FormWorkPackagesObjectives
        bind:value={draft.coreObjectives}
        validationErrors={draftErrors?.properties?.coreObjectives}
      />

      <h2>
        Why does this work matter to Cardano, and how will success be measured?
      </h2>
      <p class="text-sm text-muted-foreground">
        Describe what will change or improve for Cardano as a result of this
        work package, and why that change justifies the investment. Then define
        one or more metrics that will be used to assess whether the expected
        value has been achieved.
      </p>

      <Textarea
        id="expectedValue"
        label="Expected Value (ROI)"
        bind:value={draft.expectedValue}
        placeholder="e.g. Faster onboarding for developers integrating with Cardano"
        description="Describe what will change or improve as a result of this Work Package. This may be qualitative or quantitative and does not need to be financial."
        required
        maxLength={1000}
        validationErrors={draftErrors}
      />

      <Textarea
        id="metric"
        label="Metric"
        bind:value={draft.metric}
        placeholder="e.g. Average time to first successful deployment reduced by 30%"
        description="How will success be measured? Provide one or more metrics that demonstrate whether the expected value has been achieved."
        required
        maxLength={600}
        validationErrors={draftErrors}
      />

      <h2>
        Is there any extra material you would like to share about this work
        package?
      </h2>

      <LinkListEditor
        bind:value={draft.supportingDocuments}
        label="Supporting Documentation"
        description="Link any relevant diagrams, technical specs, or planning documents (PDF, PNG, JPG)."
        addButtonLabel="Add link"
        validationErrors={supportingDocsValidationErrors}
      />
    </div>
    <Dialog.Footer class="flex gap-2 shrink-0 flex-wrap">
      {#if editingIndex != null}
        <Button
          type="button"
          variant="destructive"
          class="mr-auto"
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
      <Button type="button" class="cursor-pointer" onclick={saveWorkPackage}>
        {editingIndex != null ? "Save changes" : "Save Work Package"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Delete confirmation -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Remove work package</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to remove this work package? This cannot be
        undone.
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
  :global(form ul.work-package-list) {
    padding-left: 0;
    list-style: none;
  }
</style>
