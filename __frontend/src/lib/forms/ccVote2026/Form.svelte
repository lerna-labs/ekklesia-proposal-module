<script>
  import "./form.css";
  import CcVoteLegalDisclaimerModal from "./CcVoteLegalDisclaimerModal.svelte";
  import CcVoteTrackSelector from "./CcVoteTrackSelector.svelte";
  import FormTrackIndividual from "./FormTrackIndividual.svelte";
  import FormTrackOrganisation from "./FormTrackOrganisation.svelte";
  import FormTrackConsortium from "./FormTrackConsortium.svelte";
  import FormControls from "$lib/components/form/FormControls.svelte";
  import { getDefaultConsortiumMember, normalizeConsortiumMember } from "./consortiumMemberUtils.js";

  let { vote, proposal, onSave, validationErrors = $bindable(null), formRef = $bindable(), onCancel } = $props();

  const formTitle = $derived(proposal?._id ? "Edit Candidate Application" : "New Candidate Application");
  const showDisclaimerModal = $derived(vote?.form === "ccVote2026" && !proposal?._id);
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
      coldCredentialHash: "",
      coldCredentialType: "",
      declarationAgreement: {
        accuracyPublicVisibilityConsent: false,
        termsAndConditionsAgreement: false,
        memberIdentityVouching: false,
      },
      individual: {
        fullNameOrAlias: "",
        contactEmail: "",
        geographicRegion: "",
        poolId: "",
        drepId: "",
        xUsername: "",
        linkedinUsername: "",
        website: "",
        otherLinks: [],
        professionalBackground: "",
        governanceExperience: "",
        briefBiography: "",
        conflictOfInterestStatement: "",
        contributionsToCardano: "",
        motivation: "",
        decentralisedGovernanceImportance: "",
        constitutionalInterpretation: "",
        perspectiveYouWouldBring: "",
        transparencyApproach: "",
      },
      organisation: {
        organisationName: "",
        organisationDescription: "",
        geographicRegion: "",
        contactPerson: "",
        contactEmail: "",
        poolId: "",
        drepId: "",
        xUsername: "",
        linkedinUsername: "",
        website: "",
        otherLinks: [],
        organisationalAreasOfExpertise: "",
        governanceExperience: "",
        conflictOfInterestStatement: "",
        contributionsToCardano: "",
        motivation: "",
        decentralisedGovernanceImportance: "",
        constitutionalInterpretation: "",
        perspectiveYouWouldBring: "",
        transparencyApproach: "",
      },
      consortium: {
        consortiumName: "",
        contactPerson: "",
        contactEmail: "",
        xUsername: "",
        linkedinUsername: "",
        website: "",
        otherLinks: [],
        conflictOfInterestStatement: "",
        contributionsToCardano: "",
        motivation: "",
        decentralisedGovernanceImportance: "",
        constitutionalInterpretation: "",
        perspectiveYouWouldBring: "",
        transparencyApproach: "",
        internalDecisionMakingProcess: "",
        members: [getDefaultConsortiumMember()],
      },
    };
  }

  let formData = $state({
    status: "draft",
    title: "",
    summary: "",
    metaData: createDefaultMetaData(),
  });

  let formControlsRef = $state(null);

  /** Proposal `title` is always the display name for the selected track (public listing). */
  function syncProposalTitleFromTrackName() {
    const track = formData.metaData?.track;
    if (track === "individual") {
      formData.title = String(formData.metaData.individual?.fullNameOrAlias ?? "").trim();
    } else if (track === "organisation") {
      formData.title = String(formData.metaData.organisation?.organisationName ?? "").trim();
    } else if (track === "consortium") {
      formData.title = String(formData.metaData.consortium?.consortiumName ?? "").trim();
    }
  }

  $effect(() => {
    syncProposalTitleFromTrackName();
  });

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
      consortium: (() => {
        const def = createDefaultMetaData().consortium;
        const c = md.consortium && typeof md.consortium === "object" ? md.consortium : {};
        const rawMembers = Array.isArray(c.members) ? c.members : [];
        return {
          ...def,
          ...c,
          members:
            rawMembers.length > 0
              ? rawMembers.map((m) => normalizeConsortiumMember(m))
              : [getDefaultConsortiumMember()],
        };
      })(),
    };
    const daIn = md.declarationAgreement;
    const daDefault = createDefaultMetaData().declarationAgreement;
    formData.metaData.declarationAgreement = {
      ...daDefault,
      ...(daIn && typeof daIn === "object" ? daIn : {}),
    };
    formData.metaData.declarationAgreement.accuracyPublicVisibilityConsent =
      daIn?.accuracyPublicVisibilityConsent === true;
    formData.metaData.declarationAgreement.termsAndConditionsAgreement = daIn?.termsAndConditionsAgreement === true;
    formData.metaData.declarationAgreement.memberIdentityVouching = daIn?.memberIdentityVouching === true;
    syncProposalTitleFromTrackName();
    queueMicrotask(() => formControlsRef?.resetDirtyBaseline?.());
  });

  /** Live proposals cannot change track; drafts may still switch (with reset warning). */
  const trackLocked = $derived(proposal?.status === "live");

  /** True if some user-entered value would be lost when switching tracks (defaults do not count). */
  function hasMeaningfulData() {
    if (formData.title?.trim()) return true;
    if (formData.summary?.trim()) return true;
    const md = formData.metaData ?? {};
    if (typeof md.coldCredentialHash === "string" && md.coldCredentialHash.trim()) return true;
    if (typeof md.coldCredentialType === "string" && md.coldCredentialType.trim()) return true;
    const da = md.declarationAgreement;
    if (da && typeof da === "object" && Object.values(da).some((v) => v === true)) return true;
    for (const key of ["individual", "organisation", "consortium"]) {
      if (metaSubtreeHasMeaningfulValues(md[key])) return true;
    }
    return false;
  }

  /** @param {unknown} v */
  function metaSubtreeHasMeaningfulValues(v) {
    if (v === null || v === undefined) return false;
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0 && !Number.isNaN(v);
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.some((item) => metaSubtreeHasMeaningfulValues(item));
    if (typeof v === "object") {
      return Object.values(/** @type {Record<string, unknown>} */ (v)).some((x) => metaSubtreeHasMeaningfulValues(x));
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
    <div class="max-w-4xl mx-auto w-full space-y-10 pb-8">
      <div class="px-4">
        <CcVoteTrackSelector
          bind:track={formData.metaData.track}
          {trackLocked}
          hasFormData={hasMeaningfulData}
          onResetForNewTrack={resetFormForNewTrack}
        />
      </div>

      {#if formData.metaData.track === "individual"}
        <FormTrackIndividual bind:formData {validationErrors} />
      {:else if formData.metaData.track === "organisation"}
        <FormTrackOrganisation bind:formData {validationErrors} />
      {:else if formData.metaData.track === "consortium"}
        <FormTrackConsortium bind:formData {validationErrors} />
      {/if}
    </div>

    {#if formData.metaData.track}
      <FormControls bind:this={formControlsRef} {formData} {getPayload} {onSave} {proposal} {vote} />
    {/if}
  </form>
{/if}
