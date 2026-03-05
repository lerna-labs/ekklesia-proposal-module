<script>
  import { goto } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import Budget2026Form from "$lib/forms/budget2026/Form.svelte";
  import DefaultForm from "$lib/forms/default/Form.svelte";
  import TreasuryDonationAcknowledgmentModal from "$lib/forms/budget2026/TreasuryDonationAcknowledgmentModal.svelte";
  import { api } from "$stores/sessionManager.js";

  const FORM_MAP = {
    budget2026: Budget2026Form,
    default: DefaultForm,
  };

  /** Count all errors in validation error tree (errors array + recursive properties + items). */
  function countErrorsInTree(node) {
    if (node == null) return 0;
    let n = (node.errors?.length ?? 0);
    if (node.properties) {
      for (const child of Object.values(node.properties)) {
        n += countErrorsInTree(child);
      }
    }
    if (node.items) {
      for (const item of node.items) {
        n += countErrorsInTree(item);
      }
    }
    return n;
  }

  /** True if validation errors exist and are exclusively under metaData.legalDeclarations. */
  function areErrorsOnlyLegal(errors) {
    if (errors == null) return false;
    const total = countErrorsInTree(errors);
    if (total === 0) return false;
    const legalNode = errors?.properties?.metaData?.properties?.legalDeclarations;
    const legalCount = countErrorsInTree(legalNode);
    return total === legalCount;
  }

  let { data } = $props();
  let proposal = $derived(data.proposal);
  let vote = $derived(data.vote);
  let categories = $derived(data.categories ?? []);
  let saving = $state(false);
  let validationErrors = $state(null);
  let openLegalDialog = $state(false);
  let showLegalErrors = $state(false);
  let openTreasuryModal = $state(false);
  let treasuryAcknowledged = $state(false);
  let FormComponent = $derived(FORM_MAP[vote?.form] ?? DefaultForm);

  const showForm = $derived(
    vote?.form !== "budget2026" || treasuryAcknowledged,
  );

  $effect(() => {
    if (vote?.form === "budget2026" && !treasuryAcknowledged) {
      openTreasuryModal = true;
    }
  });

  async function onSave(payload, options) {
    if (!proposal?._id) return;
    if (!proposal?.voteId) {
      toast.error("Proposal vote is missing.");
      return;
    }
    saving = true;
    validationErrors = null;
    if (!options?.fromLegalModal) openLegalDialog = false;
    try {
      const body = { ...payload, voteId: proposal.voteId };
      const res = await api.fetch(fetch, `/proposals/${proposal._id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(payload.status === "live" ? "Proposal submitted." : "Proposal saved.");
        if (payload.status === "live") goto("/dashboard");
      } else {
        if (json?.errors) validationErrors = json.errors;
        const onlyLegalErrors =
          payload.status === "live" && validationErrors && areErrorsOnlyLegal(validationErrors);
        if (!onlyLegalErrors) {
          const msg = json?.message ?? "Failed to save proposal.";
          toast.error(msg);
        }
        if (onlyLegalErrors) {
          openLegalDialog = true;
          showLegalErrors = options?.fromLegalModal === true;
        }
        throw new Error(json?.message ?? "Failed to save proposal.");
      }
    } catch (err) {
      if (err?.body?.errors != null) validationErrors = err.body.errors;
      const onlyLegalErrors =
        payload?.status === "live" && validationErrors && areErrorsOnlyLegal(validationErrors);
      if (!onlyLegalErrors) {
        const msg =
          typeof err?.body === "string"
            ? err.body
            : (err?.body?.message ?? err?.message ?? "Failed to save proposal.");
        toast.error(msg);
      }
      if (onlyLegalErrors) {
        openLegalDialog = true;
        showLegalErrors = options?.fromLegalModal === true;
      }
      throw err;
    } finally {
      saving = false;
    }
  }
</script>

<div class="container mx-auto max-w-4xl py-8 px-4">
  <h1 class="text-2xl font-semibold mb-6">Edit proposal</h1>
</div>

{#if vote?.form === "budget2026"}
  <TreasuryDonationAcknowledgmentModal
    bind:open={openTreasuryModal}
    onContinue={() => {
      treasuryAcknowledged = true;
      openTreasuryModal = false;
    }}
    onCancel={() => goto("/dashboard")}
  />
{/if}

{#if vote && showForm}
  <FormComponent
    {vote}
    {categories}
    {proposal}
    {onSave}
    {showLegalErrors}
    bind:validationErrors
    bind:openLegalDialog
  />
{/if}
