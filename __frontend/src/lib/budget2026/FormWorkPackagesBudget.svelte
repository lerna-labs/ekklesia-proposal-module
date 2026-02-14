<script>
  /**
   * Budget breakdown section for a work package. List of budget positions with
   * "Add Budget Position" opening a dialog: cost category (select), item description,
   * quantity, unit cost in ADA. All fields mandatory.
   */
  import * as Field from "$lib/components/ui/field/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import FormTextarea from "$lib/form/Textarea.svelte";
  import * as Select from "$lib/components/ui/select/index.js";
  import TrashIcon from "@lucide/svelte/icons/trash-2";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import PlusIcon from "@lucide/svelte/icons/plus";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import {
    budgetRowSchema,
    budgetRowInputSchema,
    COST_CATEGORIES_LIST,
  } from "./Schema.js";
  import { z } from "zod";
  import Markdown from "$lib/base/Markdown.svelte";

  let {
    value = $bindable([]),
    onvaluechange,
    formSchema,
    class: className,
  } = $props();

  const list = $derived(Array.isArray(value) ? value : []);
  const meta = $derived(formSchema?.shape?.budgetRows?.meta?.() ?? {});
  const sectionLabel = $derived(meta?.label ?? "Budget");
  const sectionDescription = $derived(
    meta?.description ?? "Budget breakdown for this work package.",
  );

  let addDialogOpen = $state(false);
  let selectOpen = $state(false);
  let editingIndex = $state(null);
  let draft = $state({
    costCategory: "",
    itemDescription: "",
    qty: "",
    unitCostAda: "",
  });
  let draftErrors = $state(null);

  const draftTotalAda = $derived.by(() => {
    const q = Number(draft.qty);
    const u = Number(draft.unitCostAda);
    if (!Number.isFinite(q) || !Number.isFinite(u) || q < 0 || u < 0)
      return null;
    return Math.round(q * u * 1000) / 1000;
  });

  function getDefaultDraft() {
    return {
      costCategory: "",
      itemDescription: "",
      qty: "",
      unitCostAda: "",
    };
  }

  function openDialog(index = null) {
    const row = index != null ? list[index] : null;
    if (row) {
      draft = {
        costCategory: row.costCategory ?? "",
        itemDescription: row.itemDescription ?? "",
        qty: row.qty != null ? String(row.qty) : "",
        unitCostAda: row.unitCostAda != null ? String(row.unitCostAda) : "",
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
      itemDescription: draft.itemDescription,
      qty: draft.qty,
      unitCostAda: draft.unitCostAda,
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

  function formatAda(n) {
    return n != null && Number.isFinite(n)
      ? n.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })
      : "—";
  }
</script>

<Field.Field class="gap-2 {className}">
  <div class="flex items-center gap-1 w-full">
    <Field.Label
      class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit font-medium text-muted-foreground"
    >
      {sectionLabel}
    </Field.Label>
    <span class="flex-1 min-w-0" aria-hidden="true"></span>
  </div>
  {#if sectionDescription}
    <p class="text-xs text-muted-foreground mb-2">{sectionDescription}</p>
  {/if}

  {#if list.length > 0}
    <div class="overflow-x-auto rounded-md border border-input mb-2">
      <table class="w-full text-left text-sm [&_th]:align-top [&_td]:align-top">
        <thead class="bg-muted">
          <tr class="border-b border-input">
            <th class="p-2 font-medium whitespace-nowrap">Category</th>
            <th class="p-2 font-medium whitespace-nowrap">Description</th>
            <th class="p-2 font-medium text-right whitespace-nowrap">Qty</th>
            <th class="p-2 font-medium text-right whitespace-nowrap">
              Unit Cost (ADA)
            </th>
            <th class="p-2 font-medium text-right whitespace-nowrap">
              Total (ADA)
            </th>
            <th class="p-2 w-20"></th>
          </tr>
        </thead>
        <tbody>
          {#each list as row, i (i)}
            <tr class="border-b border-input last:border-0">
              <td class="p-2">{row.costCategory ?? "—"}</td>
              <td class="p-2 align-top">
                <Markdown
                  content={row.itemDescription}
                  class="prose-p:my-0 prose-ul:my-1 prose-li:my-0"
                />
              </td>
              <td class="p-2 text-right">{row.qty ?? "—"}</td>
              <td class="p-2 text-right tabular-nums">
                {formatAda(row.unitCostAda)}
              </td>
              <td class="p-2 text-right tabular-nums">
                {formatAda(row.totalAda)}
              </td>
              <td class="p-2">
                <div class="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="size-8 text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label="Edit budget position"
                    onclick={() => openDialog(i)}
                  >
                    <PencilIcon class="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="size-8 text-muted-foreground hover:text-destructive cursor-pointer"
                    aria-label="Remove budget position"
                    onclick={() => remove(i)}
                  >
                    <TrashIcon class="size-4" />
                  </Button>
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  <Button
    type="button"
    variant="outline"
    class="add-item-btn w-fit cursor-pointer gap-2"
    onclick={() => openDialog()}
  >
    <PlusIcon class="size-4" />
    Add Budget Position
  </Button>
</Field.Field>

<Dialog.Root bind:open={addDialogOpen}>
  <Dialog.Content
    class="sm:max-w-xl max-h-[90vh] overflow-y-auto flex flex-col"
  >
    <Dialog.Header>
      <Dialog.Title>
        {editingIndex != null ? "Edit Budget Position" : "Add Budget Position"}
      </Dialog.Title>
      <Dialog.Description>
        {editingIndex != null
          ? "Update the budget position details below."
          : "Add a budget line: cost category, item description, quantity, and unit cost in ADA. All fields are required."}
      </Dialog.Description>
    </Dialog.Header>
    <div class="grid gap-4 py-4">
      <div class="grid grid-cols-1 sm:grid-cols-[2fr_0.6fr_1fr] gap-1">
        <Field.Field class="gap-2">
          <Field.Label
            for="costCategory"
            class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit"
          >
            Cost Category
            <span class="text-(--mbo-electric-blue)">*</span>
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

        <Field.Field class="gap-2">
          <Field.Label
            for="qty"
            class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit"
          >
            Quantity
            <span class="text-(--mbo-electric-blue)">*</span>
          </Field.Label>
          <Input
            id="qty"
            type="number"
            min="0"
            step="any"
            bind:value={draft.qty}
            aria-invalid={draftErrors?.properties?.qty?.errors?.[0]
              ? true
              : false}
            class="aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-[3px] bg-white w-full"
          />
          {#if draftErrors?.properties?.qty?.errors?.[0]}
            <Field.Error class="text-xs">
              {draftErrors.properties.qty.errors[0]}
            </Field.Error>
          {/if}
        </Field.Field>

        <Field.Field class="gap-2">
          <Field.Label
            for="unitCostAda"
            class="flex gap-0 mb-0 pb-0 text-sm shrink-0 w-fit"
          >
            Unit Cost (ADA)
            <span class="text-(--mbo-electric-blue)">*</span>
          </Field.Label>
          <Input
            id="unitCostAda"
            type="number"
            min="0"
            step="any"
            bind:value={draft.unitCostAda}
            aria-invalid={draftErrors?.properties?.unitCostAda?.errors?.[0]
              ? true
              : false}
            class="aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-[3px] bg-white w-full"
          />
          {#if draftErrors?.properties?.unitCostAda?.errors?.[0]}
            <Field.Error class="text-xs">
              {draftErrors.properties.unitCostAda.errors[0]}
            </Field.Error>
          {/if}
        </Field.Field>
      </div>

      <FormTextarea
        id="itemDescription"
        bind:value={draft.itemDescription}
        formSchema={z.object({
          itemDescription: budgetRowInputSchema.shape.itemDescription,
        })}
        validationErrors={draftErrors}
      />
    </div>
    <Dialog.Footer>
      <div
        class="flex w-full items-center justify-between gap-4 shrink-0"
        role="presentation"
      >
        <div
          class="flex items-center h-9 rounded-md px-3 text-sm text-white font-medium bg-(--mbo-electric-blue)"
          aria-live="polite"
        >
          Total Budget Position{draftTotalAda != null
            ? `: ${draftTotalAda.toLocaleString()} ADA`
            : ": — ADA"}
        </div>
        <div class="flex gap-1">
          <Button
            type="button"
            variant="outline"
            class="cursor-pointer"
            onclick={() => (addDialogOpen = false)}
          >
            Cancel
          </Button>
          <Button type="button" class="cursor-pointer" onclick={submitRow}>
            {editingIndex != null ? "Save changes" : "Save"}
          </Button>
        </div>
      </div>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
