<script>
  /**
   * Single work package card for the work packages list: shows name, edit/delete actions, and milestones editor.
   */
  import * as Card from "$lib/components/ui/card/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import BoxIcon from "@lucide/svelte/icons/box";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import FormWorkPackagesMilestones from "./FormWorkPackagesMilestones.svelte";
  import FormWorkPackagesBudget from "./FormWorkPackagesBudget.svelte";

  let {
    name = "",
    milestones = [],
    onMilestonesChange,
    budgetBreakdown = [],
    onBudgetBreakdownChange,
    onEdit,
    onDelete,
  } = $props();

  const displayName = $derived(name || "Unnamed work package");
</script>

<Card.Root class="py-2 pb-0 bg-slate-50">
  <Card.Header class="flex flex-row items-center gap-1 py-1 pl-4 pr-3 text-sm">
    <button
      type="button"
      class="min-w-0 flex-1 font-medium truncate text-left cursor-pointer focus:outline-none text-lg flex items-center gap-2"
      title={displayName}
      onclick={onEdit}
    >
      <BoxIcon class="size-5 shrink-0" />
      {displayName}
    </button>
    <Button
      type="button"
      variant="outline"
      size="icon"
      class="shrink-0 size-8 cursor-pointer"
      aria-label="Edit work package"
      onclick={onEdit}
    >
      <PencilIcon class="size-4" />
    </Button>
    <Button
      type="button"
      variant="outline"
      size="icon"
      class="shrink-0 size-8 cursor-pointer"
      aria-label="Remove work package"
      onclick={onDelete}
    >
      <TrashIcon class="size-4" />
    </Button>
  </Card.Header>
  <Card.Content class="p-4 pt-0">
    <section>
      <h1 class="text-normal font-medium mb-2">
        How will this work package be delivered?
      </h1>
      <p class="text-sm text-muted-foreground">
        Break this Work Package into milestones or delivery phases. This helps
        reviewers understand how progress will be structured and validated, and
        provides a clear basis for contracting and payment if the proposal is
        approved.
      </p>

      <FormWorkPackagesMilestones
        value={milestones}
        onvaluechange={onMilestonesChange}
      />
    </section>

    <section class="mt-8">
      <h1 class="text-normal font-medium mb-2">
        What's the budget estimated for this Work Package?
      </h1>
      <p class="text-sm text-muted-foreground">
        Breakdown your estimated budget into the appropriate categories. Make
        sure to provide context so DReps can understand why each item is added
        and how it is calculated.
      </p>

      <FormWorkPackagesBudget
        value={budgetBreakdown}
        onvaluechange={onBudgetBreakdownChange}
      />
    </section>
  </Card.Content>
</Card.Root>
