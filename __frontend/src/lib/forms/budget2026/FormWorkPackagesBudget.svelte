<script>
  /**
   * FormWorkPackagesBudget: budget breakdown list for a work package. Table list, add, edit, delete with dialog.
   * Fields: Cost category (from costCategories.json), item name, item description, quantity, unit cost (ADA).
   * Table columns: Item name, Category, Quantity, Total (ADA).
   */
  import { z } from "zod";
  import * as Field from "$lib/components/ui/field/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import Input from "$lib/components/form/Input.svelte";
  import Textarea from "$lib/components/form/Textarea.svelte";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { budgetRowSchema, COST_CATEGORIES_LIST } from "./Schema.js";
  import { formatAda, formatUsd } from "$lib/utils.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import Markdown from "$lib/base/Markdown.svelte";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import ToolTip from "$lib/components/form/ToolTip.svelte";
  import { fade } from "svelte/transition";

  let {
    value = $bindable([]),
    onvaluechange,
    conversionRate,
    validationErrors,
    class: className = "",
  } = $props();

  let addDialogOpen = $state(false);
  let deleteDialogOpen = $state(false);
  let indexToDelete = $state(null);
  let editingIndex = $state(null);
  let selectOpen = $state(false);
  let draft = $state({
    costCategory: "",
    name: "",
    description: "",
    quantity: "",
    unitPrice: "",
  });
  let draftErrors = $state(null);

  const rows = $derived(Array.isArray(value) ? value : []);
  const schemaError = $derived(validationErrors?.errors?.[0]);

  /** Total ADA for this work package (sum of all row totals). */
  const totalPackageAda = $derived.by(() => {
    let sum = 0;
    for (const row of rows) {
      const t = row.total ?? Number(row.quantity) * Number(row.unitPrice);
      if (Number.isFinite(t)) sum += t;
    }
    return sum;
  });

  /** Current budget item total (ADA) in the add/edit dialog (from draft quantity × unit price). */
  const draftItemAda = $derived.by(() => {
    const q = Number(draft.quantity);
    const p = Number(draft.unitPrice);
    if (!Number.isFinite(q) || !Number.isFinite(p) || q < 0 || p < 0)
      return null;
    return Math.round(q * p * 1000) / 1000;
  });

  /** Conversion rate as number (handles string from InputNumber); null if not set or invalid. */
  const conversionRateNum = $derived.by(() => {
    const v = conversionRate;
    if (v == null || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  });

  /** Current budget item total in USD when conversion rate is set. */
  const draftItemUsd = $derived.by(() => {
    const ada = draftItemAda;
    const rate = conversionRateNum;
    if (ada == null || rate == null) return null;
    return ada * rate;
  });

  function getDefaultDraft() {
    return {
      costCategory: "",
      name: "",
      description: "",
      quantity: "",
      unitPrice: "",
    };
  }

  function openDialog(index = null) {
    const row = index != null ? rows[index] : null;
    if (row) {
      draft = {
        costCategory: row.costCategory ?? "",
        name: (row.name ?? row.itemName ?? "").toString(),
        description: row.description ?? "",
        quantity: row.quantity != null ? String(row.quantity) : "",
        unitPrice: row.unitPrice != null ? String(row.unitPrice) : "",
      };
      editingIndex = index;
    } else {
      draft = getDefaultDraft();
      editingIndex = null;
    }
    draftErrors = null;
    selectOpen = false;
    addDialogOpen = true;
  }

  function submitRow() {
    const toParse = {
      costCategory: draft.costCategory || undefined,
      name: draft.name,
      description: draft.description,
      quantity: draft.quantity,
      unitPrice: draft.unitPrice,
    };
    const result = budgetRowSchema.safeParse(toParse);
    if (!result.success) {
      draftErrors = z.treeifyError(result.error);
      return;
    }
    const data = result.data;
    draftErrors = null;
    const next =
      editingIndex != null
        ? rows.map((item, i) => (i === editingIndex ? data : item))
        : [...rows, data];
    value = next;
    onvaluechange?.(next);
    editingIndex = null;
    addDialogOpen = false;
  }

  function requestDelete(index) {
    indexToDelete = index;
    deleteDialogOpen = true;
  }

  function confirmDelete() {
    if (indexToDelete != null) {
      const next = rows.filter((_, i) => i !== indexToDelete);
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
    {#if rows.length > 0}
      <div class="rounded-md border overflow-x-auto mb-2 bg-white">
        <table class="w-full caption-bottom text-xs border-collapse">
          <thead>
            <tr class="border-b transition-colors hover:bg-muted/50">
              <th
                class="h-9 px-3 text-left align-middle font-medium w-[min(120px,15%)]"
              >
                Category
              </th>
              <th
                class="h-9 px-3 text-left align-middle font-medium w-[min(160px,20%)]"
              >
                Item Name
              </th>
              <th
                class="h-9 px-3 text-left align-middle font-medium max-w-[180px]"
              >
                Description
              </th>
              <th
                class="h-9 px-3 text-right align-middle font-medium tabular-nums w-[56px]"
              >
                Qty
              </th>
              <th
                class="h-9 px-3 text-right align-middle font-medium tabular-nums w-[72px] whitespace-nowrap"
              >
                Unit Price
              </th>
              <th
                class="h-9 px-3 text-right align-middle font-medium tabular-nums w-[80px] whitespace-nowrap"
              >
                Total (ADA)
              </th>
              <th
                class="h-9 px-3 text-right align-middle font-medium w-[72px]"
                aria-label="Actions"
              >
              </th>
            </tr>
          </thead>
          <tbody>
            {#each rows as row, index (index)}
              {@const totalAda =
                row.total ?? Number(row.quantity) * Number(row.unitPrice)}
              <tr class="border-b transition-colors hover:bg-muted/50">
                <td class="p-3 align-top text-black">
                  {row.costCategory ?? "—"}
                </td>
                <td class="p-3 align-top font-medium">
                  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
                  <button
                    type="button"
                    class="text-left cursor-pointer focus:outline-none hover:underline"
                    onclick={() => openDialog(index)}
                  >
                    {(row.name ?? row.itemName) || row.costCategory || "—"}
                  </button>
                </td>
                <td class="p-3 align-top text-muted-foreground max-w-[180px]">
                  <div
                    class="line-clamp-2 overflow-hidden [&_.markdown]:!text-inherit"
                  >
                    <Markdown
                      content={row.description ?? ""}
                      class="text-xs!"
                    />
                  </div>
                </td>
                <td class="p-3 text-right align-top tabular-nums">
                  {row.quantity ?? "—"}
                </td>
                <td class="p-3 text-right align-top tabular-nums">
                  {formatAda(row.unitPrice)}
                </td>
                <td class="p-3 text-right align-top tabular-nums">
                  {formatAda(totalAda)}
                </td>
                <td class="p-3 text-right align-top">
                  <div class="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      class="shrink-0 size-8 cursor-pointer"
                      aria-label="Edit budget item"
                      onclick={() => openDialog(index)}
                    >
                      <PencilIcon class="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      class="shrink-0 size-8 cursor-pointer"
                      aria-label="Remove budget item"
                      onclick={() => requestDelete(index)}
                    >
                      <TrashIcon class="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
          <tfoot>
            <tr class="bg-(--mbo-cardano-blue) text-white font-medium">
              <td colspan="5" class="p-3 text-right">Total (ADA)</td>
              <td class="p-3 text-right tabular-nums">
                {formatAda(totalPackageAda)}
              </td>
              <td class="p-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    {/if}

    <div class="flex justify-start">
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="add-item-btn text-xs w-fit cursor-pointer gap-1"
        onclick={() => openDialog()}
      >
        <PlusIcon class="size-4" />
        Add Budget Item
      </Button>
    </div>

    {#if schemaError}
      <Field.Error class="text-xs">{schemaError}</Field.Error>
    {/if}
  </Field.Field>
</div>

<!-- Add / Edit budget item -->
<AlertDialog.Root bind:open={addDialogOpen}>
  <AlertDialog.Content
    class="sm:max-w-xl max-h-[90vh] overflow-y-auto flex flex-col"
  >
    <AlertDialog.Header
      class="text-left flex flex-row items-center justify-between gap-4"
    >
      <AlertDialog.Title>
        {editingIndex != null ? "Edit Budget Item" : "Add Budget Item"}
      </AlertDialog.Title>
      {#if draftItemAda != null && draftItemAda > 0}
        <span in:fade={{ duration: 400 }} class="shrink-0 inline-block">
          <Badge
            variant="secondary"
            class="tabular-nums bg-(--mbo-electric-blue) text-white border-0 px-3 py-1.5"
          >
            Total: {formatAda(draftItemAda)} ADA
            {#if draftItemUsd != null}
              <span class="opacity-90">· {formatUsd(draftItemUsd)} USD</span>
            {/if}
          </Badge>
        </span>
      {/if}
    </AlertDialog.Header>
    <div class="grid gap-4 pb-4">
      <Input
        id="name"
        label="Item Name"
        bind:value={draft.name}
        placeholder="e.g. Senior developer (3 months)"
        description="A short, descriptive name for this budget line item."
        required
        maxLength={100}
        validationErrors={draftErrors}
      />

      <Field.Field class="gap-2">
        <Field.Label
          for="costCategory"
          class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit"
        >
          Cost Category
          <span class="text-(--mbo-electric-blue) mr-1">*</span>
          <ToolTip
            content="Select the category that best describes this cost (e.g. Labor, Development, Infrastructure, Security, Operations, Governance)."
          />
        </Field.Label>
        <Select.Root
          type="single"
          bind:value={draft.costCategory}
          bind:open={selectOpen}
        >
          <Select.Trigger
            class="w-full justify-between data-placeholder:text-muted-foreground"
          >
            {draft.costCategory || "Select category…"}
          </Select.Trigger>
          <Select.Content>
            {#each COST_CATEGORIES_LIST as cat (cat.name)}
              <Select.Item
                value={cat.name}
                label={cat.name}
                title={cat.description || undefined}
              >
                {cat.name}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
        {#if draftErrors?.properties?.costCategory?.errors?.[0]}
          <Field.Error class="text-xs">
            {draftErrors.properties.costCategory.errors[0]}
          </Field.Error>
        {/if}
      </Field.Field>

      <Textarea
        id="description"
        label="Item Description"
        bind:value={draft.description}
        placeholder="Describe this budget item..."
        description="Briefly explain what this cost covers and why it is required for this work package."
        required
        maxLength={600}
        validationErrors={draftErrors}
      />

      <div class="grid grid-cols-2 gap-4">
        <Input
          id="quantity"
          label="Quantity"
          description="Number of units for this cost (e.g. people, months, licenses, items)."
          type="number"
          min="0"
          step="any"
          bind:value={draft.quantity}
          placeholder="e.g. 1"
          required
          validationErrors={draftErrors}
        />
        <Input
          id="unitPrice"
          label="Unit Cost (ADA)"
          description="Cost per unit, expressed in ADA."
          type="number"
          min="0"
          step="any"
          bind:value={draft.unitPrice}
          placeholder="e.g. 1000"
          required
          validationErrors={draftErrors}
        />
      </div>
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
      <Button type="button" class="cursor-pointer" onclick={submitRow}>
        {editingIndex != null ? "Save changes" : "Add Budget Item"}
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Delete confirmation -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Remove budget item</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to remove this budget item? This cannot be undone.
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
