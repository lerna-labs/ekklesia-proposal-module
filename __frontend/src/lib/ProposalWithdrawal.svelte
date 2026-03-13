<script>
  import { z } from "zod";
  import { toast } from "svelte-sonner";
  import { api } from "$stores/sessionManager.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import * as Label from "$lib/components/ui/label";
  import * as Select from "$lib/components/ui/select";
  import * as Field from "$lib/components/ui/field";
  import Textarea from "$lib/components/form/Textarea.svelte";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";

  let {
    open = $bindable(false),
    proposal = null,
    onSuccess = () => {},
  } = $props();

  let category = $state("");
  let comment = $state("");
  let submitting = $state(false);
  let validationErrors = $state(null);

  const WITHDRAWAL_CATEGORIES = [
    "Inappropriate content",
    "Spam",
    "Policy violation",
    "Duplicate submission",
    "Other",
  ];

  const withdrawSchema = z.object({
    category: z
      .enum(
        [
          "Inappropriate content",
          "Spam",
          "Policy violation",
          "Duplicate submission",
          "Other",
        ],
        {
          message: "Please select a reason.",
        },
      )
      .meta({ label: "Reason", required: true }),
    comment: z
      .string()
      .min(1, "Comment is required.")
      .max(1000, "Comment must be at most 1000 characters.")
      .meta({ label: "Comment", required: true }),
  });

  const triggerContent = $derived(category || "Select Reason for Withdrawal");

  $effect(() => {
    if (open && proposal) {
      category = "";
      comment = "";
      validationErrors = null;
    }
  });

  async function confirmWithdraw() {
    if (!proposal?._id) return;
    const result = withdrawSchema.safeParse({ category, comment });
    if (!result.success) {
      validationErrors = z.treeifyError(result.error);
      toast.error("Please fix the errors below.");
      return;
    }
    validationErrors = null;
    submitting = true;
    try {
      const res = await api.fetch(
        fetch,
        `/proposals/${proposal._id}/withdraw`,
        {
          method: "PUT",
          body: JSON.stringify({
            category: result.data.category,
            comment: result.data.comment,
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.message ?? "Failed to withdraw proposal");
        return;
      }
      toast.success("Proposal withdrawn");
      open = false;
      onSuccess();
    } catch (e) {
      toast.error(e?.message ?? "Failed to withdraw proposal");
    } finally {
      submitting = false;
    }
  }
</script>

<AlertDialog.Root bind:open>
  <AlertDialog.Content class="sm:max-w-md max-h-[90dvh] flex flex-col min-h-0">
    <AlertDialog.Header class="shrink-0">
      <AlertDialog.Title>Withdraw Proposal</AlertDialog.Title>
      <AlertDialog.Description>
        {#if proposal}
          <div
            class="mt-2 outline-destructive p-2 rounded-md border-destructive border-2 text-destructive text-medium"
          >
            You are about to withdraw Proposal "{proposal.title ??
              proposal._id}". This proposal will be marked as withdrawn and
            removed from the vote. For transparency reasons withdrawn proposals
            remain visible to the public including your withdrawal reason and
            comment. Proceed with caution, withdrawing a proposal cannot be
            undone.
          </div>
        {/if}
      </AlertDialog.Description>
    </AlertDialog.Header>
    <div class="grid gap-4 overflow-y-auto min-h-0 flex-1">
      <div class="grid gap-2">
        <Label.Root for="withdraw-reason" class="gap-0">
          Withdrawal Reason
          <span class="text-(--mbo-electric-blue)">*</span>
        </Label.Root>
        <Select.Root
          type="single"
          value={category}
          onValueChange={(v) => v != null && (category = v)}
        >
          <Select.Trigger
            id="withdraw-reason"
            class="w-full aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-[3px]"
            aria-invalid={validationErrors?.properties?.category?.errors
              ?.length > 0}
            aria-label="Withdrawal reason"
          >
            <span class="line-clamp-1">{triggerContent}</span>
          </Select.Trigger>
          <Select.Content>
            {#each WITHDRAWAL_CATEGORIES as cat (cat)}
              <Select.Item value={cat}>{cat}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
        {#if validationErrors?.properties?.category?.errors?.[0]}
          <Field.Error class="text-xs">
            {validationErrors.properties.category.errors[0]}
          </Field.Error>
        {/if}
      </div>
      <div class="grid gap-0">
        <Textarea
          id="comment"
          label="Withdrawal Comment"
          description="Explain why you are withdrawing this proposal. This comment will be visible to the public."
          required
          maxLength={1000}
          bind:value={comment}
          formSchema={withdrawSchema}
          {validationErrors}
          placeholder="Explain why you are withdrawing this proposal."
        />
      </div>
    </div>
    <AlertDialog.Footer class="gap-1 shrink-0">
      <AlertDialog.Cancel disabled={submitting} class="cursor-pointer">
        Cancel
      </AlertDialog.Cancel>
      <AlertDialog.Action
        disabled={submitting}
        class="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
        onclick={confirmWithdraw}
      >
        <Trash2Icon class="size-4" />
        {submitting ? "Withdrawing…" : "Withdraw proposal"}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
