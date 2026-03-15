<script>
  import { goto, invalidateAll } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import { api } from "$stores/sessionManager.js";

  const FORM_CHUNKS = {
    budget2026: () => import("$lib/forms/budget2026/Form.svelte"),
    default: () => import("$lib/forms/default/Form.svelte"),
  };

  let FormComponent = $state(null);
  let formLoading = $state(false);
  let loadedFormKey = $state(null);

  let { data } = $props();
  let vote = $derived(data.vote);
  let saving = $state(false);
  let validationErrors = $state(null);
  let formRef = $state({});
  /** Set after first successful create (manual or auto-save) so the form can show Preview. */
  let createdProposal = $state(null);

  const formKey = $derived(vote?.form ?? "default");

  $effect(() => {
    if (!formKey) return;
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
        if (payload.status === "draft" && options?.fromAutoSave) {
          toast.success("Draft autosaved");
        } else {
          toast.success(payload.status === "live" ? "Proposal created." : "Draft saved.");
        }
        await invalidateAll();
        if (payload.status === "live" || (options?.exitAfterSave && !options?.skipGoto)) goto("/dashboard");
        return json;
      } else {
        if (json?.errors) validationErrors = json.errors;
        const msg = json?.message ?? "Failed to create proposal.";
        toast.error(msg);
        throw new Error(msg);
      }
    } catch (err) {
      if (err?.body?.errors != null) validationErrors = err.body.errors;
      const msg =
        typeof err?.body === "string"
          ? err.body
          : (err?.body?.message ?? err?.message ?? "Failed to create proposal.");
      toast.error(msg);
      throw err;
    } finally {
      saving = false;
    }
  }
</script>

{#if vote && formKey}
  {#if formLoading}
    <div class="container mx-auto max-w-4xl py-8 px-4 flex items-center justify-center min-h-[200px]">
      <p class="text-muted-foreground">Loading form…</p>
    </div>
  {:else if FormComponent}
    <FormComponent
      {vote}
      proposal={createdProposal}
      {onSave}
      bind:formRef
      bind:validationErrors
      onCancel={() => goto("/dashboard")}
    />
  {/if}
{/if}
