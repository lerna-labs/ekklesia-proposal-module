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
  let vote = $derived(data.vote);
  let saving = $state(false);
  let validationErrors = $state(null);
  let formRef = $state({});
  /** Set after first successful create (manual or auto-save) so the form can show Preview. */
  let createdProposal = $state(null);

  /** Serialize saves so autosave / manual save / submit cannot overlap (ordering + correct method/path). */
  let saveQueueTail = Promise.resolve();

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

  async function runSave(payload, options) {
    if (!vote?._id) return;
    saving = true;
    validationErrors = null;
    try {
      const body = { ...payload, voteId: vote._id };
      const hasPersistedId = Boolean(createdProposal?._id);
      const res = await api.fetch(
        fetch,
        hasPersistedId ? `/proposals/${createdProposal._id}` : "/proposals",
        {
          method: hasPersistedId ? "PUT" : "POST",
          body: JSON.stringify(body),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        if (json?._id) createdProposal = json;
        if (payload.status === "draft" && options?.fromAutoSave) {
          toast.success("Draft autosaved");
        } else {
          toast.success(payload.status === "live" ? "Proposal submitted." : "Draft saved.");
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

  function onSave(payload, options) {
    let resolveOuter;
    let rejectOuter;
    const outer = new Promise((resolve, reject) => {
      resolveOuter = resolve;
      rejectOuter = reject;
    });

    saveQueueTail = saveQueueTail.then(async () => {
      try {
        const result = await runSave(payload, options);
        resolveOuter(result);
      } catch (e) {
        rejectOuter(e);
      }
    });
    saveQueueTail = saveQueueTail.catch(() => {});

    return outer;
  }
</script>

{#if vote && formKey}
  {#if formLoading}
    <DelayedFormLoader active={formLoading} />
  {:else if FormComponent}
    <div class="w-full" in:fade={{ duration: 350 }}>
      <FormComponent
        {vote}
        proposal={createdProposal}
        {onSave}
        bind:formRef
        bind:validationErrors
        onCancel={() => goto("/dashboard")}
      />
    </div>
  {/if}
{/if}
