<script>
  import CcVoteLegalDisclaimerModal from "./CcVoteLegalDisclaimerModal.svelte";
  import CcVoteTrackSelector from "./CcVoteTrackSelector.svelte";
  import FormTrackIndividual from "./FormTrackIndividual.svelte";
  import FormTrackOrganisation from "./FormTrackOrganisation.svelte";
  import FormTrackConsortium from "./FormTrackConsortium.svelte";
  import FormControls from "$lib/components/form/FormControls.svelte";

  let {
    vote,
    proposal,
    onSave,
    validationErrors = $bindable(null),
    formRef = $bindable(),
    onCancel,
  } = $props();

  const formTitle = $derived(proposal?._id ? "Edit proposal" : "New proposal");
  const showDisclaimerModal = $derived(
    vote?.form === "ccVote2026" && !proposal?._id,
  );
  let disclaimerAcknowledged = $state(false);
  let openDisclaimerModal = $state(false);

  $effect(() => {
    if (showDisclaimerModal && !disclaimerAcknowledged) {
      openDisclaimerModal = true;
    }
  });

  function createDefaultMetaData() {
    return {
      track: "",
      individual: {},
      organisation: {},
      consortium: {},
    };
  }

  let formData = $state({
    status: "draft",
    title: "",
    summary: "",
    metaData: createDefaultMetaData(),
  });

  let formControlsRef = $state(null);

  $effect(() => {
    if (formRef && formControlsRef) {
      formRef.clearDirty = () => formControlsRef?.resetDirtyBaseline?.();
    }
  });

  let prefilled = $state(false);
  $effect(() => {
    const p = proposal;
    if (!p || prefilled) return;
    prefilled = true;
    formData.title = p.title ?? "";
    formData.summary = p.summary ?? "";
    formData.status = p.status ?? "draft";
    const md = p.metaData && typeof p.metaData === "object" ? p.metaData : {};
    formData.metaData = {
      ...createDefaultMetaData(),
      ...md,
      individual: { ...createDefaultMetaData().individual, ...(md.individual ?? {}) },
      organisation: {
        ...createDefaultMetaData().organisation,
        ...(md.organisation ?? {}),
      },
      consortium: { ...createDefaultMetaData().consortium, ...(md.consortium ?? {}) },
    };
    queueMicrotask(() => formControlsRef?.resetDirtyBaseline?.());
  });

  /** Live proposals cannot change track; drafts may still switch (with reset warning). */
  const trackLocked = $derived(proposal?.status === "live");

  function hasMeaningfulData() {
    const md = formData.metaData ?? {};
    for (const key of ["individual", "organisation", "consortium"]) {
      const o = md[key];
      if (o && typeof o === "object" && Object.keys(o).length > 0) return true;
    }
    return false;
  }

  /** @param {string} newTrack */
  function resetFormForNewTrack(newTrack) {
    formData.title = "";
    formData.summary = "";
    formData.metaData = {
      ...createDefaultMetaData(),
      track: newTrack,
    };
    validationErrors = null;
    queueMicrotask(() => formControlsRef?.resetDirtyBaseline?.());
  }

  function getPayload(status) {
    return { ...formData, status };
  }

  function handleSubmit(e) {
    e.preventDefault();
    formControlsRef?.submit?.();
  }
</script>

{#if showDisclaimerModal && !disclaimerAcknowledged}
  <CcVoteLegalDisclaimerModal
    bind:open={openDisclaimerModal}
    treasuryDonationLovelace={vote?.depositOptions?.treasuryDonation ?? 0}
    onContinue={() => {
      disclaimerAcknowledged = true;
      openDisclaimerModal = false;
    }}
    onCancel={() => onCancel?.()}
  />
{:else}
  <div class="container mx-auto max-w-4xl py-8 px-4 pb-0">
    <h1 class="mb-4">{formTitle}</h1>
  </div>

  <form onsubmit={handleSubmit} class="flex flex-col" autocomplete="off">
    <div class="max-w-4xl mx-auto px-4 w-full space-y-10 pb-8">
      <CcVoteTrackSelector
        bind:track={formData.metaData.track}
        {trackLocked}
        hasFormData={hasMeaningfulData}
        onResetForNewTrack={resetFormForNewTrack}
      />

      {#if formData.metaData.track === "individual"}
        <FormTrackIndividual bind:formData {vote} {proposal} {validationErrors} />
      {:else if formData.metaData.track === "organisation"}
        <FormTrackOrganisation bind:formData {vote} {proposal} {validationErrors} />
      {:else if formData.metaData.track === "consortium"}
        <FormTrackConsortium bind:formData {vote} {proposal} {validationErrors} />
      {/if}
    </div>

    {#if formData.metaData.track}
      <FormControls
        bind:this={formControlsRef}
        {formData}
        {getPayload}
        {onSave}
        {proposal}
        {vote}
      />
    {/if}
  </form>
{/if}
