<script>
  /**
   * Work packages list editor: list of work packages with add, edit (dialog), and delete.
   * Pattern matches LinkListEditor: list of items, click title or pencil to edit, trash to remove, Add button.
   * @see __frontend/docs/budget2026/form-work-packages.md Version: 1.0.0
   */
  import { z } from "zod";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import Input from "$lib/components/form/Input.svelte";
  import Textarea from "$lib/components/form/Textarea.svelte";
  import RadioGroup from "$lib/components/form/RadioGroup.svelte";
  import LinkListEditor from "$lib/components/form/LinkListEditor.svelte";
  import ToolTip from "$lib/components/form/ToolTip.svelte";
  import FormWorkPackagesCard from "./FormWorkPackagesCard.svelte";
  import FormWorkPackagesObjectives from "./FormWorkPackagesObjectives.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { workPackageSchema } from "./Schema.js";
  import { getDefaultDraft, normalizeWorkPackage } from "./workPackageUtils.js";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import PlusIcon from "@lucide/svelte/icons/plus";

  let {
    value = $bindable([]),
    label = "Work Packages",
    description = "Break down the work into packages: summary, objectives, milestones, and budget per package.",
    conversionRate,
    validationErrors,
    addButtonLabel = "Add Work Package",
    emptyMessage,
    class: className = "",
    /** When true, parent shows the section-level error (e.g. "At least one work package is required") below the ring, so we do not render it here. */
    hideSectionLevelError = false,
  } = $props();

  let addDialogOpen = $state(false);
  let deleteDialogOpen = $state(false);
  let indexToDelete = $state(null);
  let editingIndex = $state(null);

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
      console.log("[FormWorkPackages] Zod validation failed:", result.error);
      console.log("[FormWorkPackages] Zod issues:", result.error.issues);
      draftErrors = z.treeifyError(result.error);
      return;
    }
    const data = result.data;
    const final = normalizeWorkPackage({
      ...data,
      summary: data.summary ?? "",
    });
    console.log("[FormWorkPackages] Validation passed, saving work package:", final);
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

  function updatePackageMilestones(pkgIndex, newMilestones) {
    value = packages.map((p, i) =>
      i === pkgIndex ? { ...p, milestones: newMilestones ?? [] } : p,
    );
  }

  function updatePackageBudgetBreakdown(pkgIndex, newBudgetBreakdown) {
    value = packages.map((p, i) =>
      i === pkgIndex ? { ...p, budgetBreakdown: newBudgetBreakdown ?? [] } : p,
    );
  }

  function updatePackageMilestoneOption(pkgIndex, { noMilestonesBreakdown, milestoneAlternative }) {
    value = packages.map((p, i) => {
      if (i !== pkgIndex) return p;
      const next = {
        ...p,
        noMilestonesBreakdown: !!noMilestonesBreakdown,
        milestoneAlternative: milestoneAlternative ?? p.milestoneAlternative ?? "",
      };
      if (noMilestonesBreakdown) next.milestones = [];
      return next;
    });
  }

  function deleteFromDialog() {
    if (editingIndex != null) {
      indexToDelete = editingIndex;
      editingIndex = null;
      addDialogOpen = false;
      deleteDialogOpen = true;
    }
  }

  /** Pass full supportingDocuments error tree so LinkListEditor gets section-level errors and any per-item errors (items[i]). */
  const supportingDocsValidationErrors = $derived(
    draftErrors?.properties?.supportingDocuments ?? null,
  );
</script>

<div class="flex justify-start {packages.length > 0 ? 'mb-8' : 'mb-2'}">
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

<div class={[className, "gap-2", packages.length > 0 ? "mb-8" : ""].filter(Boolean).join(" ")}>
  <Field.Field class="gap-1">
    {#if packages.length > 0}
      <div class="flex flex-row items-center gap-1 pb-2">
        {#if label}
          <span class="text-sm font-medium mb-0">{label}</span>
        {/if}
        {#if description}
          <ToolTip content={description} />
        {/if}
        <span class="flex-1 min-w-0" aria-hidden="true"></span>
      </div>
      <ul class="work-package-list space-y-2 list-none p-0 mb-1!">
        {#each packages as pkg, index (index)}
          <li>
            <FormWorkPackagesCard
              name={pkg.name}
              milestones={pkg.milestones ?? []}
              onMilestonesChange={(milestones) =>
                updatePackageMilestones(index, milestones)}
              budgetBreakdown={pkg.budgetBreakdown ?? []}
              onBudgetBreakdownChange={(budgetBreakdown) =>
                updatePackageBudgetBreakdown(index, budgetBreakdown)}
              conversionRate={conversionRate}
              noMilestonesBreakdown={pkg.noMilestonesBreakdown ?? false}
              milestoneAlternative={pkg.milestoneAlternative ?? ""}
              onMilestoneOptionChange={(opts) =>
                updatePackageMilestoneOption(index, opts)}
              validationErrors={validationErrors?.properties?.workPackages?.items?.[index]}
              onEdit={() => openAddDialog(index)}
              onDelete={() => requestDelete(index)}
            />
          </li>
        {/each}
      </ul>
    {:else if emptyMessage}
      <p class="text-sm text-muted-foreground">{emptyMessage}</p>
    {/if}

    {#if !hideSectionLevelError && schemaError}
      <Field.Error class="text-xs">{schemaError}</Field.Error>
    {/if}
  </Field.Field>
</div>

<!-- Add / Edit work package (AlertDialog: doesn't close without user action) -->
<AlertDialog.Root bind:open={addDialogOpen}>
  <AlertDialog.Content
    class="sm:max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col"
  >
    <AlertDialog.Header class="text-left">
      <AlertDialog.Title>
        {editingIndex != null ? "Edit Work Package" : "Add Work Package"}
      </AlertDialog.Title>
      <AlertDialog.Description>
        This section breaks down the proposed work and the value it delivers to
        Cardano.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <div class="grid gap-4 py-4">
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

      <h2 class="font-medium">
        Please describe this Work Package at a high level
      </h2>
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
        class="mb-4"
      />

      <h2 class="font-medium">
        What is this work package intended to achieve?
      </h2>

      <FormWorkPackagesObjectives
        bind:value={draft.coreObjectives}
        validationErrors={draftErrors?.properties?.coreObjectives}
      />

      <h2 class="mt-4 font-medium">
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

      <h2 class="mt-4 font-medium">
        Is this a new initiative or a continuation of existing work?
      </h2>
      <p class="text-sm text-muted-foreground">
        Select the option that best describes the nature of this work package.
      </p>
      <RadioGroup
        id="initiativeType"
        bind:value={draft.initiativeType}
        label="Initiative Type"
        description="Is this a brand new project or the continuation/maintenance of an existing one?"
        required
        options={[
          { value: "New Initiative", label: "New Initiative" },
          { value: "Maintenance", label: "Maintenance" },
        ]}
        validationErrors={draftErrors ? { properties: { initiativeType: draftErrors.properties?.initiativeType } } : undefined}
      />

      <h2 class="mt-4 font-medium">
        How would you classify the primary nature of this work proposal?
      </h2>
      <p class="text-sm text-muted-foreground">
        This helps reviewers understand whether the work is primarily technical or non-technical.
      </p>
      <RadioGroup
        id="proposalType"
        bind:value={draft.proposalType}
        label="Type of Proposal"
        description="Classification of the proposal type."
        required
        options={[
          { value: "Technical (software/IT)", label: "Technical (software/IT)" },
          { value: "Non-technical", label: "Non-technical" },
        ]}
        validationErrors={draftErrors ? { properties: { proposalType: draftErrors.properties?.proposalType } } : undefined}
      />

      <h2 class="mt-4 font-medium">
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
    <AlertDialog.Footer class="flex gap-2 shrink-0 flex-wrap">
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
      <AlertDialog.Cancel class="cursor-pointer">Cancel</AlertDialog.Cancel>
      <Button type="button" class="cursor-pointer" onclick={saveWorkPackage}>
        {editingIndex != null ? "Save changes" : "Save Work Package"}
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

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
