<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import FormInput from "$lib/form/Input.svelte";
  import FormTextarea from "$lib/form/Textarea.svelte";
  import FormLinks from "$lib/budget2026/FormLinks.svelte";
  import FormWorkPackagesObjectives from "$lib/budget2026/FormWorkPackagesObjectives.svelte";
  import FormWorkPackagesMilestones from "$lib/budget2026/FormWorkPackagesMilestones.svelte";
  import FormWorkPackagesBudget from "$lib/budget2026/FormWorkPackagesBudget.svelte";
  import Markdown from "$lib/base/Markdown.svelte";
  import * as Card from "$lib/components/ui/card/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import ToolTip from "$lib/form/ToolTip.svelte";
  import { tick } from "svelte";
  import { workPackageSchema } from "./Schema.js";
  import { formatAda } from "$lib/utils.js";
  import { z } from "zod";

  /** Schema shape FormLinks expects: formSchema.shape.supportingInfoLinks */
  const dialogSupportingLinksSchema = z.object({
    supportingInfoLinks: workPackageSchema.shape.supportingDocumentationLinks,
  });

  let {
    formSchema,
    validationErrors,
    value = $bindable([]),
    class: className,
  } = $props();

  const schemaMeta = $derived(formSchema?.shape?.workPackages?.meta?.());
  const label = $derived(schemaMeta?.label ?? "Work Package Breakdown");
  const description = $derived(
    schemaMeta?.description ??
      "Add work packages. Copy the table for each work package.",
  );

  let addDialogOpen = $state(false);
  let deleteDialogOpen = $state(false);
  let indexToDelete = $state(null);
  let editingIndex = $state(null);
  /** Set of work package indices that are expanded (collapsed by default). */
  let expandedPackages = $state(new Set());

  function togglePackage(index) {
    const next = new Set(expandedPackages);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    expandedPackages = next;
  }

  function getDefaultDraft() {
    return {
      name: "",
      scopeOfWork: "",
      supportingDocumentationLinks: [],
      coreObjectives: [""],
      expectedValueRoi: "",
      metric: "",
      milestones: [],
      budgetRows: [],
    };
  }

  let draft = $state(getDefaultDraft());
  let draftErrors = $state(null);

  const packages = $derived(Array.isArray(value) ? value : []);
  const schemaError = $derived(
    validationErrors?.properties?.workPackages?.errors?.[0],
  );
  const supportingLinksValidationErrors = $derived(
    draftErrors
      ? {
          properties: {
            supportingInfoLinks:
              draftErrors.properties?.supportingDocumentationLinks,
          },
        }
      : null,
  );

  function openAddDialog(index = null) {
    const pkg = index != null ? packages[index] : null;
    if (pkg) {
      draft = {
        name: pkg.name ?? "",
        scopeOfWork: pkg.scopeOfWork ?? "",
        supportingDocumentationLinks: Array.isArray(
          pkg.supportingDocumentationLinks,
        )
          ? [...pkg.supportingDocumentationLinks]
          : [],
        coreObjectives:
          Array.isArray(pkg.coreObjectives) && pkg.coreObjectives.length > 0
            ? [...pkg.coreObjectives]
            : [""],
        expectedValueRoi: pkg.expectedValueRoi ?? "",
        metric: pkg.metric ?? "",
        milestones: Array.isArray(pkg.milestones) ? [...pkg.milestones] : [],
        budgetRows: Array.isArray(pkg.budgetRows) ? [...pkg.budgetRows] : [],
      };
      editingIndex = index;
    } else {
      draft = getDefaultDraft();
      editingIndex = null;
    }
    draftErrors = null;
    addDialogOpen = true;
  }

  function saveWorkPackage() {
    const coreObjectivesFiltered = draft.coreObjectives
      .map((s) => s.trim())
      .filter(Boolean);
    const linksFiltered = (draft.supportingDocumentationLinks ?? []).filter(
      (l) => (l.title ?? "").trim() || (l.url ?? "").trim(),
    );
    const toValidate = {
      ...draft,
      coreObjectives:
        coreObjectivesFiltered.length > 0 ? coreObjectivesFiltered : [""],
      supportingDocumentationLinks: linksFiltered,
    };
    const result = workPackageSchema.safeParse(toValidate);
    if (!result.success) {
      draftErrors = z.treeifyError(result.error);
      tick().then(() => {
        scrollToFirstError(document.getElementById("work-package-dialog-body"));
      });
      return;
    }
    const data = result.data;
    const finalCoreObjectives = data.coreObjectives.filter(Boolean);
    if (finalCoreObjectives.length === 0) {
      draftErrors = {
        properties: {
          coreObjectives: {
            errors: ["At least one Core Objective is required"],
          },
        },
      };
      tick().then(() => {
        scrollToFirstError(document.getElementById("work-package-dialog-body"));
      });
      return;
    }
    const final = {
      ...data,
      coreObjectives: finalCoreObjectives,
    };
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
      const removed = indexToDelete;
      value = packages.filter((_, i) => i !== removed);
      // Keep expanded state in sync: remove deleted index, shift down indices above it
      const next = new Set();
      expandedPackages.forEach((i) => {
        if (i < removed) next.add(i);
        else if (i > removed) next.add(i - 1);
      });
      expandedPackages = next;
      indexToDelete = null;
    }
    deleteDialogOpen = false;
  }

  function updatePackageMilestones(index, milestones) {
    value = packages.map((p, i) =>
      i === index
        ? { ...p, milestones: Array.isArray(milestones) ? milestones : [] }
        : p,
    );
  }

  function updatePackageBudgetRows(index, budgetRows) {
    value = packages.map((p, i) =>
      i === index
        ? { ...p, budgetRows: Array.isArray(budgetRows) ? budgetRows : [] }
        : p,
    );
  }

  /** Total ADA for a work package (sum of budget rows). */
  function packageTotalAda(pkg) {
    const rows = Array.isArray(pkg?.budgetRows) ? pkg.budgetRows : [];
    return rows.reduce((sum, row) => sum + (Number(row?.totalAda) || 0), 0);
  }

  function scrollToFirstError(containerEl) {
    const firstInvalid = containerEl?.querySelector?.("[aria-invalid='true']");
    firstInvalid?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }
</script>

<Field.Field class="gap-2 {className}">
  <div class="flex items-center gap-1 w-full">
    <Field.Label class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit">
      {label}
    </Field.Label>
    {#if description}
      <ToolTip content={description} />
    {/if}
    <span class="flex-1 min-w-0" aria-hidden="true"></span>
  </div>

  {#if packages.length > 0}
    <ul class="space-y-4 list-none p-0 m-0">
      {#each packages as pkg, index (index)}
        {@const objectives = (
          Array.isArray(pkg.coreObjectives) ? pkg.coreObjectives : []
        ).filter((o) => (o ?? "").trim() !== "")}
        {@const links = Array.isArray(pkg.supportingDocumentationLinks)
          ? pkg.supportingDocumentationLinks
          : []}
        {@const hasLinks = links.some(
          (l) => (l?.title ?? "").trim() || (l?.url ?? "").trim(),
        )}
        {@const totalAda = packageTotalAda(pkg)}
        <li>
          <Card.Root class="gap-4 py-4">
            <Card.Header class="flex flex-row items-center gap-2">
              <button
                type="button"
                class="flex flex-1 min-w-0 items-center gap-2 text-left cursor-pointer rounded-md hover:bg-muted/50 -m-1 p-1 transition-colors"
                onclick={() => togglePackage(index)}
                aria-expanded={expandedPackages.has(index)}
                aria-controls="wp-content-{index}"
                id="wp-header-{index}"
              >
                <ChevronDownIcon
                  class="size-5 shrink-0 text-muted-foreground transition-transform duration-200 {expandedPackages.has(
                    index,
                  )
                    ? 'rotate-0'
                    : '-rotate-90'}"
                  aria-hidden="true"
                />
                <Card.Title class="text-lg font-semibold truncate">
                  {pkg.name ?? "Unnamed work package"}
                </Card.Title>
                <Badge
                  variant="secondary"
                  class="shrink-0 font-normal bg-black text-white border-(--mbo-tangy-blue)"
                >
                  {formatAda(totalAda)} ADA
                </Badge>
              </button>
              <Card.Action class="flex gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Edit work package"
                  onclick={() => openAddDialog(index)}
                >
                  <PencilIcon class="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  class="size-8 text-muted-foreground hover:text-destructive cursor-pointer"
                  aria-label="Remove work package"
                  onclick={() => requestDelete(index)}
                >
                  <TrashIcon class="size-4" />
                </Button>
              </Card.Action>
            </Card.Header>
            {#if expandedPackages.has(index)}
              <Card.Content
                id="wp-content-{index}"
                role="region"
                aria-labelledby="wp-header-{index}"
                class="flex flex-col gap-4 text-sm"
              >
                {#if pkg.scopeOfWork}
                  <div>
                    <span class="font-medium text-muted-foreground block mb-1">
                      Scope of Work
                    </span>
                    <Markdown content={pkg.scopeOfWork} />
                  </div>
                {/if}
                {#if objectives.length > 0}
                  <div>
                    <span class="font-medium text-muted-foreground block mb-1">
                      Core Objectives
                    </span>
                    <ul class="list-disc pl-4 space-y-1">
                      {#each objectives as obj}
                        <li>{obj}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}
                {#if pkg.expectedValueRoi}
                  <div>
                    <span class="font-medium text-muted-foreground block mb-1">
                      Expected Value (ROI)
                    </span>
                    <Markdown content={pkg.expectedValueRoi} />
                  </div>
                {/if}
                {#if pkg.metric}
                  <div>
                    <span class="font-medium text-muted-foreground block mb-1">
                      Metric
                    </span>
                    <Markdown content={pkg.metric} />
                  </div>
                {/if}
                <FormWorkPackagesMilestones
                  value={pkg.milestones ?? []}
                  onvaluechange={(milestones) =>
                    updatePackageMilestones(index, milestones)}
                  formSchema={workPackageSchema}
                />
                <FormWorkPackagesBudget
                  value={pkg.budgetRows ?? []}
                  onvaluechange={(budgetRows) =>
                    updatePackageBudgetRows(index, budgetRows)}
                  formSchema={workPackageSchema}
                />
                {#if hasLinks}
                  <div>
                    <span class="font-medium text-muted-foreground block mb-1">
                      Supporting documentation
                    </span>
                    <ul class="list-none space-y-1">
                      {#each links as link}
                        {@const hasLink =
                          (link?.title ?? "").trim() ||
                          (link?.url ?? "").trim()}
                        {#if hasLink}
                          <li>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              class="text-(--mbo-electric-blue) underline hover:no-underline"
                            >
                              {(link.title ?? "").trim() || link.url || "Link"}
                            </a>
                          </li>
                        {/if}
                      {/each}
                    </ul>
                  </div>
                {/if}
              </Card.Content>
            {/if}
          </Card.Root>
        </li>
      {/each}
    </ul>
  {/if}

  <div class="flex justify-start">
    <Button
      variant="outline"
      class="add-item-btn w-fit cursor-pointer gap-2"
      onclick={openAddDialog}
    >
      <PlusIcon class="size-4" />
      Add Work Package
    </Button>
  </div>

  {#if schemaError}
    <Field.Error class="text-xs">{schemaError}</Field.Error>
  {/if}
</Field.Field>

<!-- Add/Edit work package dialog -->
<Dialog.Root bind:open={addDialogOpen}>
  <Dialog.Content
    class="sm:max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col"
  >
    <Dialog.Header>
      <Dialog.Title>
        {editingIndex != null ? "Edit Work Package" : "Add Work Package"}
      </Dialog.Title>
      <Dialog.Description>
        {editingIndex != null
          ? "Update the work package details below."
          : "Fill in the work package details. All fields marked with * are required."}
      </Dialog.Description>
    </Dialog.Header>
    <div id="work-package-dialog-body" class="grid gap-4 py-4">
      <FormInput
        id="name"
        bind:value={draft.name}
        formSchema={workPackageSchema}
        validationErrors={draftErrors}
      />

      <FormTextarea
        id="scopeOfWork"
        bind:value={draft.scopeOfWork}
        formSchema={workPackageSchema}
        validationErrors={draftErrors}
      />

      <FormWorkPackagesObjectives
        value={draft.coreObjectives}
        onvaluechange={(v) => (draft = { ...draft, coreObjectives: v })}
        formSchema={workPackageSchema}
        validationErrors={draftErrors}
      />

      <FormTextarea
        id="expectedValueRoi"
        bind:value={draft.expectedValueRoi}
        formSchema={workPackageSchema}
        validationErrors={draftErrors}
      />

      <FormTextarea
        id="metric"
        bind:value={draft.metric}
        formSchema={workPackageSchema}
        validationErrors={draftErrors}
      />

      <FormLinks
        bind:value={draft.supportingDocumentationLinks}
        formSchema={dialogSupportingLinksSchema}
        validationErrors={supportingLinksValidationErrors}
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
      <Button
        type="button"
        class="cursor-pointer bg-(--mbo-electric-blue)"
        onclick={saveWorkPackage}
      >
        {editingIndex != null ? "Save Work Package" : "Save Work Package"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

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
