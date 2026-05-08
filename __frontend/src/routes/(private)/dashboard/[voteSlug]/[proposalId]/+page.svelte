<script>
  import { goto, invalidateAll } from "$app/navigation";
  import { toast } from "svelte-sonner";
  import DelayedFormLoader from "$lib/components/DelayedFormLoader.svelte";
  import { api } from "$stores/sessionManager.js";
  import { fade } from "svelte/transition";

  const FORM_CHUNKS = {
    budget2026: () => import("$lib/forms/budget2026/Form.svelte"),
    ccVote2026: () => import("$lib/forms/ccVote2026/Form.svelte"),
    default: () => import("$lib/forms/default/Form.svelte"),
  };

  let FormComponent = $state(null);
  let formLoading = $state(false);
  let loadedFormKey = $state(null);

  let { data } = $props();
  let proposal = $derived(data.proposal);
  let vote = $derived(data.vote);
  let saving = $state(false);
  let validationErrors = $state(null);
  let formRef = $state({});
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
    if (!proposal?._id) return;
    if (!proposal?.voteId) {
      toast.error("Proposal vote is missing.");
      return;
    }
    saving = true;
    validationErrors = null;
    try {
      const body = { ...payload, voteId: proposal.voteId };
      const res = await api.fetch(fetch, `/proposals/${proposal._id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        if (payload.status === "draft" && options?.fromAutoSave) {
          toast.success("Draft autosaved");
        } else {
          toast.success(payload.status === "live" ? "Proposal submitted." : "Proposal saved.");
        }
        await invalidateAll();
        if (payload.status === "live" || (options?.exitAfterSave && !options?.skipGoto)) goto("/dashboard");
      } else {
        if (json?.errors) validationErrors = json.errors;
        const msg = json?.message ?? "Failed to save proposal.";
        toast.error(msg);
        throw new Error(msg);
      }
    } catch (err) {
      if (err?.body?.errors != null) validationErrors = err.body.errors;
      const msg =
        typeof err?.body === "string"
          ? err.body
          : (err?.body?.message ?? err?.message ?? "Failed to save proposal.");
      toast.error(msg);
      throw err;
    } finally {
      saving = false;
    }
  }
</script>

{#if formLoading}
  <DelayedFormLoader active={formLoading} />
{:else if FormComponent}
  <div class="w-full" in:fade={{ duration: 350 }}>
    <FormComponent
      {vote}
      {proposal}
      {onSave}
      bind:formRef
      bind:validationErrors
      onCancel={() => goto("/dashboard")}
    />
  </div>
{/if}
