<script>
  /**
   * Single work package card for the work packages list: shows name, edit/delete actions, milestones or milestone alternative.
   */
  import * as Card from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Checkbox } from "$lib/components/ui/checkbox/index.js";
  import * as Field from "$lib/components/ui/field/index.js";
  import BoxIcon from "@lucide/svelte/icons/box";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import ChevronUpIcon from "@lucide/svelte/icons/chevron-up";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import FormWorkPackagesMilestones from "./FormWorkPackagesMilestones.svelte";
  import FormWorkPackagesBudget from "./FormWorkPackagesBudget.svelte";
  import Textarea from "$lib/components/form/Textarea.svelte";
  import WorkPackageFormFields from "./WorkPackageFormFields.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";

  let {
    workPackage,
    idPrefix = "wp",
    name = "",
    milestones = [],
    onMilestonesChange,
    budgetBreakdown = [],
    onBudgetBreakdownChange,
    conversionRate,
    noMilestonesBreakdown = false,
    milestoneAlternative = "",
    onMilestoneOptionChange,
    validationErrors,
    onDelete,
  } = $props();

  const displayName = $derived(
    (workPackage?.name ?? name ?? "").toString().trim() || "Unnamed work package",
  );

  /** Top-level field keys that can have validation errors; card shows red outline when any have errors. */
  const topLevelErrorKeys = [
    "name",
    "summary",
    "coreObjectives",
    "expectedValue",
    "metric",
    "initiativeType",
    "proposalType",
    "supportingDocuments",
  ];
  const hasTopLevelErrors = $derived(
    validationErrors?.properties &&
      topLevelErrorKeys.some(
        (key) => (validationErrors.properties[key]?.errors?.length ?? 0) > 0,
      ),
  );
  const cardRingClass = $derived(
    hasTopLevelErrors ? "ring-2 ring-destructive rounded-md" : "",
  );

  let expanded = $state(true);
  let confirmRemoveMilestonesOpen = $state(false);
  let confirmClearAlternativeOpen = $state(false);
  let localMilestoneAlternative = $state("");

  $effect(() => {
    localMilestoneAlternative = milestoneAlternative ?? "";
  });

  const hasMilestonesError = $derived(
    !noMilestonesBreakdown &&
      validationErrors?.properties?.milestones?.errors?.length > 0,
  );
  const hasMilestoneAlternativeError = $derived(
    noMilestonesBreakdown &&
      validationErrors?.properties?.milestoneAlternative?.errors?.length > 0,
  );
  const sectionRingClass = $derived(
    hasMilestonesError || hasMilestoneAlternativeError
      ? "ring-2 ring-destructive rounded-md p-3"
      : "",
  );
  const milestoneSectionError = $derived(
    hasMilestonesError
      ? validationErrors?.properties?.milestones?.errors?.[0]
      : hasMilestoneAlternativeError
        ? validationErrors?.properties?.milestoneAlternative?.errors?.[0]
        : undefined,
  );
  /** Pass to milestone-alternative Textarea so it doesn't show the section error (we show it below the outline). */
  const validationErrorsWithoutMilestoneAlternativeError = $derived(
    validationErrors?.properties?.milestoneAlternative != null
      ? {
          ...validationErrors,
          properties: {
            ...validationErrors?.properties,
            milestoneAlternative: {
              ...validationErrors.properties.milestoneAlternative,
              errors: [],
            },
          },
        }
      : validationErrors,
  );

  const hasBudgetBreakdownError = $derived(
    (validationErrors?.properties?.budgetBreakdown?.errors?.length ?? 0) > 0,
  );
  const budgetBreakdownError = $derived(
    validationErrors?.properties?.budgetBreakdown?.errors?.[0],
  );
  const budgetSectionRingClass = $derived(
    hasBudgetBreakdownError ? "ring-2 ring-destructive rounded-md p-3" : "",
  );

  function handleNoMilestonesBreakdownChange(checked) {
    if (checked) {
      if (milestones.length > 0) {
        confirmRemoveMilestonesOpen = true;
      } else {
        onMilestoneOptionChange?.({
          noMilestonesBreakdown: true,
          milestoneAlternative,
        });
      }
    } else {
      if ((milestoneAlternative ?? "").trim().length > 0) {
        confirmClearAlternativeOpen = true;
      } else {
        onMilestoneOptionChange?.({
          noMilestonesBreakdown: false,
          milestoneAlternative: "",
        });
      }
    }
  }

  function confirmRemoveMilestones() {
    onMilestoneOptionChange?.({
      noMilestonesBreakdown: true,
      milestoneAlternative,
    });
    confirmRemoveMilestonesOpen = false;
  }

  function confirmClearAlternative() {
    onMilestoneOptionChange?.({
      noMilestonesBreakdown: false,
      milestoneAlternative: "",
    });
    confirmClearAlternativeOpen = false;
  }

  $effect(() => {
    if (
      noMilestonesBreakdown &&
      localMilestoneAlternative !== (milestoneAlternative ?? "")
    ) {
      onMilestoneOptionChange?.({
        noMilestonesBreakdown: true,
        milestoneAlternative: localMilestoneAlternative,
      });
    }
  });
</script>

<Card.Root class="py-2 {expanded ? 'pb-0' : 'pb-2'} bg-slate-50 {cardRingClass}">
  <Card.Header class="flex flex-row items-center gap-1 py-1 pl-4 pr-3 text-sm">
    <span
      class="min-w-0 flex-1 font-medium truncate text-left text-lg flex items-center gap-2"
      title={displayName}
    >
      <BoxIcon class="size-5 shrink-0" />
      {displayName}
    </span>
    <Button
      type="button"
      variant="outline"
      size="icon"
      class="shrink-0 size-8 cursor-pointer"
      title={expanded ? "Collapse work package" : "Expand work package"}
      aria-label={expanded ? "Collapse work package" : "Expand work package"}
      onclick={() => (expanded = !expanded)}
    >
      {#if expanded}
        <ChevronUpIcon class="size-4" />
      {:else}
        <ChevronDownIcon class="size-4" />
      {/if}
    </Button>
    <Button
      type="button"
      variant="outline"
      size="icon"
      class="shrink-0 size-8 cursor-pointer"
      title="Remove work package"
      aria-label="Remove work package"
      onclick={onDelete}
    >
      <TrashIcon class="size-4" />
    </Button>
  </Card.Header>
  {#if expanded}
    <Card.Content class="p-4 pt-0">
      {#if workPackage}
        <div class="mb-6">
          <WorkPackageFormFields
            bind:draft={workPackage}
            draftErrors={validationErrors}
            {idPrefix}
          />
        </div>
      {/if}
      <section>
        <div class={sectionRingClass}>
          <h3 class="text-normal font-medium mb-2">
            How will this work package be delivered?
          </h3>
          <p class="text-sm text-muted-foreground">
            Break this Work Package into milestones or delivery phases. This
            helps reviewers understand how progress will be structured and
            validated, and provides a clear basis for contracting and payment if
            the proposal is approved.
          </p>

          <Field.Field class="gap-2 mb-4">
            <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
            <div
              class="flex items-start gap-2 cursor-pointer"
              role="button"
              tabindex="0"
              onclick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleNoMilestonesBreakdownChange(!noMilestonesBreakdown);
              }}
              onkeydown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleNoMilestonesBreakdownChange(!noMilestonesBreakdown);
                }
              }}
            >
              <Checkbox
                id="noMilestonesBreakdown"
                checked={noMilestonesBreakdown}
                class="shrink-0 mt-0.5 pointer-events-none"
              />
              <Field.Label
                for="noMilestonesBreakdown"
                class="text-sm cursor-pointer mb-0 pb-0 pointer-events-none"
              >
                I can't break down my work in Milestones
              </Field.Label>
            </div>
          </Field.Field>

          {#if noMilestonesBreakdown}
            <Textarea
              id="milestoneAlternative"
              label="Milestone Alternative"
              bind:value={localMilestoneAlternative}
              placeholder="Provide a rationale and alternative way to track progress..."
              description="Provide a rationale and alternative to track progress"
              required
              maxLength={4000}
              validationErrors={validationErrorsWithoutMilestoneAlternativeError}
            />
          {:else}
            <FormWorkPackagesMilestones
              value={milestones}
              onvaluechange={onMilestonesChange}
              validationErrors={validationErrors?.properties?.milestones}
              hideSectionError
            />
          {/if}
        </div>
        {#if milestoneSectionError}
          <Field.Error class="text-xs mt-3">{milestoneSectionError}</Field.Error
          >
        {/if}
      </section>

      <section class="mt-8">
        <div class={budgetSectionRingClass}>
          <h3 class="text-normal font-medium mb-2">
            What's the budget estimated for this Work Package?
          </h3>
          <p class="text-sm text-muted-foreground">
            Breakdown your estimated budget into the appropriate categories.
            Make sure to provide context so DReps can understand why each item
            is added and how it is calculated.
          </p>

          <FormWorkPackagesBudget
            value={budgetBreakdown}
            onvaluechange={onBudgetBreakdownChange}
            {conversionRate}
          />
        </div>
        {#if budgetBreakdownError}
          <Field.Error class="text-xs mt-3">{budgetBreakdownError}</Field.Error>
        {/if}
      </section>
    </Card.Content>
  {/if}
</Card.Root>

<AlertDialog.Root bind:open={confirmRemoveMilestonesOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Remove milestones?</AlertDialog.Title>
      <AlertDialog.Description>
        All existing milestones in this work package will be deleted if you
        proceed. This cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer class="flex gap-2">
      <AlertDialog.Cancel class="cursor-pointer">Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        class="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
        onclick={confirmRemoveMilestones}
      >
        Proceed
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<AlertDialog.Root bind:open={confirmClearAlternativeOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Clear milestone alternative?</AlertDialog.Title>
      <AlertDialog.Description>
        The rationale and alternative text you entered will be removed if you
        proceed.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer class="flex gap-2">
      <AlertDialog.Cancel class="cursor-pointer">Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        class="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
        onclick={confirmClearAlternative}
      >
        Proceed
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
