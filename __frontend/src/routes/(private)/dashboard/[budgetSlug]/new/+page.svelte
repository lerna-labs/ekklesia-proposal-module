<script>
  import { goto, invalidateAll } from "$app/navigation";
  import { tick } from "svelte";
  import { toast } from "svelte-sonner";
  import TreasuryDonationAcknowledgmentModal from "$lib/forms/budget2026/TreasuryDonationAcknowledgmentModal.svelte";
  import { api } from "$stores/sessionManager.js";

  const FORM_CHUNKS = {
    budget2026: () => import("$lib/forms/budget2026/Form.svelte"),
    default: () => import("$lib/forms/default/Form.svelte"),
  };

  let FormComponent = $state(null);
  let formLoading = $state(false);
  let loadedFormKey = $state(null);

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
  let vote = $derived(data.vote);
  let pillars = $derived(data.pillars ?? []);
  let saving = $state(false);
  let validationErrors = $state(null);
  let openLegalDialog = $state(false);
  let showLegalErrors = $state(false);
  let openTreasuryModal = $state(false);
  let treasuryAcknowledged = $state(false);
  let formRef = $state({});
  /** Set after first successful create (manual or auto-save) so the form can show Preview. */
  let createdProposal = $state(null);

  const formKey = $derived(vote?.form ?? "default");
  const showForm = $derived(
    vote?.form !== "budget2026" || treasuryAcknowledged,
  );

  $effect(() => {
    if (vote?.form === "budget2026" && !treasuryAcknowledged) {
      openTreasuryModal = true;
    }
  });

  $effect(() => {
    if (!showForm || !formKey) return;
    const loader = FORM_CHUNKS[formKey] ?? FORM_CHUNKS.default;
    if (loadedFormKey === formKey && FormComponent) return;
    const keyAtLoad = formKey;
    loadedFormKey = null;
    FormComponent = null;
    formLoading = true;
    loader()
      .then((m) => {
        if (keyAtLoad !== (vote?.form ?? "default")) return;
        FormComponent = m.default;
        loadedFormKey = formKey;
      })
      .finally(() => {
        if (keyAtLoad === (vote?.form ?? "default")) formLoading = false;
      });
  });

  async function onSave(payload, options) {
    if (!vote?._id) return;
    saving = true;
    validationErrors = null;
    if (!options?.fromLegalModal) openLegalDialog = false;
    try {
      const body = { ...payload, voteId: vote._id };
      const isUpdate = createdProposal?._id && payload.status === "draft";
      const res = await api.fetch(
        fetch,
        isUpdate ? `/proposals/${createdProposal._id}` : "/proposals",
        {
          method: isUpdate ? "PUT" : "POST",
          body: JSON.stringify(body),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        if (json?._id) createdProposal = json;
        toast.success(payload.status === "live" ? "Proposal created." : "Draft saved.");
        formRef?.clearDirty?.();
        await tick();
        await invalidateAll();
        if (payload.status === "live" || (payload.status === "draft" && !options?.fromAutoSave))
          goto("/dashboard");
      } else {
        if (json?.errors) validationErrors = json.errors;
        const onlyLegalErrors =
          payload.status === "live" && validationErrors && areErrorsOnlyLegal(validationErrors);
        if (!onlyLegalErrors) {
          const msg = json?.message ?? "Failed to create proposal.";
          toast.error(msg);
          openLegalDialog = false;
        }
        if (onlyLegalErrors) {
          openLegalDialog = true;
          showLegalErrors = options?.fromLegalModal === true;
        }
        throw new Error(json?.message ?? "Failed to create proposal.");
      }
    } catch (err) {
      if (err?.body?.errors != null) validationErrors = err.body.errors;
      const onlyLegalErrors =
        payload?.status === "live" && validationErrors && areErrorsOnlyLegal(validationErrors);
      if (!onlyLegalErrors) {
        const msg =
          typeof err?.body === "string"
            ? err.body
            : (err?.body?.message ?? err?.message ?? "Failed to create proposal.");
        toast.error(msg);
        openLegalDialog = false;
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
  <h1 class="text-2xl font-semibold mb-6">New proposal</h1>
  <p>Introduction text here...</p>
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
  {#if formLoading}
    <div class="container mx-auto max-w-4xl py-8 px-4 flex items-center justify-center min-h-[200px]">
      <p class="text-muted-foreground">Loading form…</p>
    </div>
  {:else if FormComponent}
    <FormComponent
      {vote}
      {pillars}
      proposal={createdProposal}
      {onSave}
      {showLegalErrors}
      bind:formRef
      bind:validationErrors
      bind:openLegalDialog
    />
  {/if}
{/if}
