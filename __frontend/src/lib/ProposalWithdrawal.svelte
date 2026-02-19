<script>
  import { z } from "zod";
  import { toast } from "svelte-sonner";
  import { api } from "$stores/sessionManager.js";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Label from "$lib/components/ui/label";
  import * as Select from "$lib/components/ui/select";
  import * as Button from "$lib/components/ui/button";
  import * as Field from "$lib/components/ui/field";
  import Textarea from "$lib/form/Textarea.svelte";

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
      .enum(["Inappropriate content", "Spam", "Policy violation", "Duplicate submission", "Other"], {
        message: "Please select a reason.",
      })
      .meta({ label: "Reason", required: true }),
    comment: z
      .string()
      .min(1, "Comment is required.")
      .max(2000, "Comment must be at most 2000 characters.")
      .meta({ label: "Comment", required: true }),
  });

  $effect(() => {
    if (open && proposal) {
      category = WITHDRAWAL_CATEGORIES[0] ?? "";
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
      const res = await api.fetch(fetch, `/proposals/${proposal._id}/withdraw`, {
        method: "PUT",
        body: JSON.stringify({ category: result.data.category, comment: result.data.comment }),
      });
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

<Dialog.Root bind:open>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title>Withdraw proposal</Dialog.Title>
      <Dialog.Description>
        {#if proposal}
          Choose a reason and add a comment. This will withdraw "{proposal.title ?? proposal._id}".
        {/if}
      </Dialog.Description>
    </Dialog.Header>
    <div class="grid gap-4 py-4">
      <div class="grid gap-2">
        <Label.Root for="withdraw-reason">Reason <span class="text-(--mbo-electric-blue)">*</span></Label.Root>
        <Select.Root
          type="single"
          value={category}
          onValueChange={(v) => v != null && (category = v)}
        >
          <Select.Trigger
            id="withdraw-reason"
            class="w-full aria-invalid:border-destructive aria-invalid:ring-destructive/20"
            aria-invalid={validationErrors?.properties?.category?.errors?.length > 0}
            aria-label="Withdrawal reason"
          >
            <span class="line-clamp-1">{category || "Select reason"}</span>
          </Select.Trigger>
          <Select.Content>
            {#each WITHDRAWAL_CATEGORIES as cat (cat)}
              <Select.Item value={cat}>{cat}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
        {#if validationErrors?.properties?.category?.errors?.[0]}
          <Field.Error class="text-xs">{validationErrors.properties.category.errors[0]}</Field.Error>
        {/if}
      </div>
      <Textarea
        id="comment"
        bind:value={comment}
        formSchema={withdrawSchema}
        validationErrors={validationErrors}
        placeholder="Explain why you are withdrawing this proposal."
      />
    </div>
    <Dialog.Footer class="gap-2">
      <Button.Root
        variant="outline"
        disabled={submitting}
        onclick={() => (open = false)}
      >
        Cancel
      </Button.Root>
      <Button.Root
        variant="destructive"
        disabled={submitting}
        onclick={confirmWithdraw}
      >
        {submitting ? "Withdrawing…" : "Withdraw proposal"}
      </Button.Root>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
