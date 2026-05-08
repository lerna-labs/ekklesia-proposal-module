<script>
  /**
   * Work packages list editor: list of work packages with add (inline card) and delete.
   * Each card shows inline form fields; no modal. Data lives in the proposal.
   * @see __frontend/docs/budget2026/form-work-packages.md Version: 1.0.0
   */
  import * as Field from "$lib/components/ui/field/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import ToolTip from "$lib/components/form/ToolTip.svelte";
  import FormWorkPackagesCard from "./FormWorkPackagesCard.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { getDefaultDraft } from "./workPackageUtils.js";
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

  let deleteDialogOpen = $state(false);
  let indexToDelete = $state(null);

  const packages = $derived(Array.isArray(value) ? value : []);
  const schemaError = $derived(validationErrors?.properties?.workPackages?.errors?.[0]);

  function addWorkPackage() {
    value = [...packages, getDefaultDraft()];
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
    value = packages.map((p, i) => (i === pkgIndex ? { ...p, milestones: newMilestones ?? [] } : p));
  }

  function updatePackageBudgetBreakdown(pkgIndex, newBudgetBreakdown) {
    value = packages.map((p, i) => (i === pkgIndex ? { ...p, budgetBreakdown: newBudgetBreakdown ?? [] } : p));
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
</script>

<div class={[className, "gap-2", packages.length > 0 ? "mb-0" : ""].filter(Boolean).join(" ")}>
  <Field.Field class="gap-1">
    {#if packages.length > 0}
      <div class="flex flex-row items-center gap-1 pb-2">
        {#if label}
          <span class="text-sm font-medium mb-0">{label}</span>
        {/if}
        {#if description}
          <ToolTip content={description} fieldLabel={label} />
        {/if}
        <span class="flex-1 min-w-0" aria-hidden="true"></span>
      </div>
      <ul class="work-package-list space-y-2 list-none p-0 mb-1!">
        {#each packages as pkg, index (index)}
          <li>
            <FormWorkPackagesCard
              workPackage={pkg}
              idPrefix={"wp-" + index}
              name={pkg.name}
              milestones={pkg.milestones ?? []}
              onMilestonesChange={(milestones) => updatePackageMilestones(index, milestones)}
              budgetBreakdown={pkg.budgetBreakdown ?? []}
              onBudgetBreakdownChange={(budgetBreakdown) => updatePackageBudgetBreakdown(index, budgetBreakdown)}
              {conversionRate}
              noMilestonesBreakdown={pkg.noMilestonesBreakdown ?? false}
              milestoneAlternative={pkg.milestoneAlternative ?? ""}
              onMilestoneOptionChange={(opts) => updatePackageMilestoneOption(index, opts)}
              validationErrors={validationErrors?.properties?.workPackages?.items?.[index]}
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

<div class="flex justify-start mt-1 mb-8">
  <Button
    type="button"
    variant="outline"
    size="sm"
    class="add-item-btn text-xs w-fit cursor-pointer gap-1"
    onclick={addWorkPackage}
  >
    <PlusIcon class="size-4" />
    {addButtonLabel}
  </Button>
</div>

<!-- Delete confirmation -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Remove work package</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to remove this work package? This cannot be undone.
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
