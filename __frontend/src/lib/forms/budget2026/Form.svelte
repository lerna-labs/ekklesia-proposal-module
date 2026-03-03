<script>
  import "./form.css";
  import * as Accordion from "$lib/components/ui/accordion/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import FormTreasuryDonation from "./FormTreasuryDonation.svelte";
  import FormProjectDefinition from "./FormProjectDefinition.svelte";
  import FormStrategyFramework from "./FormStrategyFramework.svelte";
  import FormProposalDetails from "./FormProposalDetails.svelte";
  import FormBudgetSummary from "./FormBudgetSummary.svelte";
  import FormProposerDetails from "./FormProposerDetails.svelte";
  import FormBudgetAdministration from "./FormBudgetAdministration.svelte";
  import FormOtherInfo from "./FormOtherInfo.svelte";
  import FormControls from "$lib/components/form/FormControls.svelte";
  import FormLegalDeclarations from "./FormLegalDeclarations.svelte";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import XIcon from "@lucide/svelte/icons/x";
  let {
    vote,
    categories,
    proposal,
    onSave,
    validationErrors,
    openLegalDialog = $bindable(false),
  } = $props();

  /** Count all errors in a tree node (errors array + recursive properties + items). */
  function countErrorsInTree(node) {
    if (node == null) return 0;
    let n = node.errors?.length ?? 0;
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

  /** Get node at path; path segments are keys under .properties at each level. */
  function getNodeAtPath(tree, pathSegments) {
    if (tree == null || !pathSegments?.length) return tree;
    const next = tree.properties?.[pathSegments[0]];
    return getNodeAtPath(next, pathSegments.slice(1));
  }

  /** Section value → list of error path segments (relative to validationErrors.properties). */
  const SECTION_ERROR_PATHS = {
    "section-1": [
      ["metaData", "treasuryDonationTxHash"],
      ["metaData", "treasuryDonationConfirmed"],
    ],
    "section-2": [
      ["title"],
      ["summary"],
      ["metaData", "trackRecord"],
      ["metaData", "estimatedDuration"],
    ],
    "section-3": [["metaData", "strategyFramework"]],
    "section-4": [],
    "section-5": [],
    "section-6": [
      ["metaData", "proposerDetails", "name"],
      ["metaData", "proposerDetails", "email"],
      ["metaData", "proposerDetails", "links"],
    ],
    "section-7": [],
    "section-8": [
      ["metaData", "initiativeType"],
      ["metaData", "proposalType"],
      ["metaData", "supportingInfoLinks"],
    ],
  };

  let sectionErrorCounts = $derived.by(() => {
    const root = validationErrors;
    const counts = {};
    for (const [section, paths] of Object.entries(SECTION_ERROR_PATHS)) {
      counts[section] = paths.reduce(
        (sum, path) => sum + countErrorsInTree(getNodeAtPath(root, path)),
        0,
      );
    }
    return counts;
  });

  function errorCountLabel(n) {
    return n === 1 ? "1 Error" : `${n} Errors`;
  }

  let formData = $state({
    status: "draft",
    title: "",
    summary: "",
    metaData: {
      trackRecord: "",
      estimatedDuration: "",
      treasuryDonationTxHash: "",
      treasuryDonationConfirmed: false,
      strategyFramework: {
        pillars: [],
        pillarRationale: "",
        kpiAlignment: "",
      },
      initiativeType: "",
      proposalType: "",
      supportingInfoLinks: [],
      proposerDetails: {
        name: "",
        email: "",
        links: [],
      },
      /** Legal declarations: never prefilled; must be re-submitted on every submit/re-submit. */
      legalDeclarations: {
        dataProtection: false,
        publicVisibilityConsent: false,
        submitterName: "",
        submitterEmail: "",
        submitterRole: "",
        authorizationEntity: false,
        authorizationAttestation: false,
      },
    },
  });

  let autoSaveEnabled = $state(false);
  let formControlsRef = $state(null);

  /** Prefill formData from proposal once when editing */
  let prefilled = $state(false);
  $effect(() => {
    const p = proposal;
    if (!p || prefilled) return;
    prefilled = true;
    formData.title = p.title ?? "";
    formData.summary = p.summary ?? "";
    formData.status = p.status ?? "draft";
    if (p.metaData) {
      Object.assign(formData.metaData, p.metaData);
      const sf = p.metaData.strategyFramework;
      if (sf && typeof sf === "object") {
        formData.metaData.strategyFramework = {
          pillars: Array.isArray(sf.pillars) ? [...sf.pillars] : [],
          pillarRationale: sf.pillarRationale ?? "",
          kpiAlignment: sf.kpiAlignment ?? "",
        };
      }
      if (Array.isArray(p.metaData.supportingInfoLinks)) {
        formData.metaData.supportingInfoLinks =
          p.metaData.supportingInfoLinks.map((link) => ({
            title: link?.title ?? "",
            url: link?.url ?? "",
          }));
      }
      const pd = p.metaData.proposerDetails;
      if (pd && typeof pd === "object") {
        formData.metaData.proposerDetails = {
          name: pd.name ?? "",
          email: pd.email ?? "",
          links: Array.isArray(pd.links)
            ? pd.links.map((link) => ({
                title: link?.title ?? "",
                url: link?.url ?? "",
              }))
            : [],
        };
      }
      // Never prefill legalDeclarations: they must be re-submitted on every submit/re-submit.
      // Reset to full shape so no property is undefined (avoids bind:value={undefined} in dialog).
      formData.metaData.legalDeclarations = {
        dataProtection: false,
        publicVisibilityConsent: false,
        submitterName: "",
        submitterEmail: "",
        submitterRole: "",
        authorizationEntity: false,
        authorizationAttestation: false,
      };
    }
  });

  const legalDeclarationsErrors = $derived(
    validationErrors?.properties?.metaData?.properties?.legalDeclarations,
  );

  let legalDialogSubmitting = $state(false);
  async function confirmLegalAndSubmit() {
    if (!onSave || legalDialogSubmitting) return;
    legalDialogSubmitting = true;
    try {
      await Promise.resolve(onSave(getPayload("live")));
      openLegalDialog = false;
    } catch (_) {
      // Errors shown via validationErrors
    } finally {
      legalDialogSubmitting = false;
    }
  }

  function getPayload(status) {
    return { ...formData, status };
  }

  function handleSubmit(e) {
    e.preventDefault();
    formControlsRef?.submit?.();
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col form">
  <div class="mb-2">
    <Button
      type="button"
      variant="outline"
      size="sm"
      class="text-muted-foreground"
      onclick={() => (openLegalDialog = true)}
    >
      Show legal declarations (test)
    </Button>
  </div>
  <Accordion.Root type="multiple" class="w-full">
    <Accordion.Item
      value="section-1"
      id="treasury-donation"
      class="bg-slate-500/5 border-0 shadow-none"
    >
      <Accordion.Trigger class="section-title">
        <span class="flex items-center gap-2">
          Treasury Donation
          {#if sectionErrorCounts["section-1"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-1"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="max-w-4xl mx-auto px-4">
        <FormTreasuryDonation
          bind:formData
          {vote}
          {categories}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item
      value="section-2"
      id="project-definition"
      class="bg-slate-500/10 border-0 shadow-none"
    >
      <Accordion.Trigger class="section-title">
        <span class="flex items-center gap-2">
          Project Definition
          {#if sectionErrorCounts["section-2"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-2"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="max-w-4xl mx-auto px-4">
        <FormProjectDefinition
          bind:formData
          {vote}
          {categories}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item
      value="section-3"
      id="strategy-framework"
      class="bg-slate-500/15 border-0 shadow-none"
    >
      <Accordion.Trigger class="section-title">
        <span class="flex items-center gap-2">
          Strategy framework
          {#if sectionErrorCounts["section-3"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-3"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="max-w-4xl mx-auto px-4">
        <FormStrategyFramework
          bind:formData
          {vote}
          {categories}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item
      value="section-4"
      id="proposal-details"
      class="bg-slate-500/20 border-0 shadow-none"
    >
      <Accordion.Trigger class="section-title">
        <span class="flex items-center gap-2">
          Proposal details
          {#if sectionErrorCounts["section-4"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-4"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="max-w-4xl mx-auto px-4">
        <FormProposalDetails
          bind:formData
          {vote}
          {categories}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item
      value="section-5"
      id="budget-summary"
      class="bg-slate-500/25 border-0 shadow-none"
    >
      <Accordion.Trigger class="section-title">
        <span class="flex items-center gap-2">
          Budget summary
          {#if sectionErrorCounts["section-5"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-5"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="max-w-4xl mx-auto px-4">
        <FormBudgetSummary
          bind:formData
          {vote}
          {categories}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item
      value="section-6"
      id="proposer-details"
      class="bg-slate-500/30 border-0 shadow-none"
    >
      <Accordion.Trigger class="section-title">
        <span class="flex items-center gap-2">
          Proposer details
          {#if sectionErrorCounts["section-6"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-6"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="max-w-4xl mx-auto px-4">
        <FormProposerDetails
          bind:formData
          {vote}
          {categories}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item
      value="section-7"
      id="budget-administration"
      class="bg-slate-500/35 border-0 shadow-none"
    >
      <Accordion.Trigger class="section-title">
        <span class="flex items-center gap-2">
          Budget administration
          {#if sectionErrorCounts["section-7"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-7"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="max-w-4xl mx-auto px-4">
        <FormBudgetAdministration
          bind:formData
          {vote}
          {categories}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item
      value="section-8"
      id="other-info"
      class="bg-slate-500/40 border-0 shadow-none"
    >
      <Accordion.Trigger class="section-title">
        <span class="flex items-center gap-2">
          Other info
          {#if sectionErrorCounts["section-8"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-8"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content class="max-w-4xl mx-auto px-4">
        <FormOtherInfo
          bind:formData
          {vote}
          {categories}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>
  </Accordion.Root>

  <FormControls
    bind:this={formControlsRef}
    {formData}
    {getPayload}
    {onSave}
    bind:autoSaveEnabled
  />
</form>

<Dialog.Root bind:open={openLegalDialog}>
  <Dialog.Content
    showCloseButton={false}
    class="!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !max-w-none w-full overflow-y-auto flex flex-col items-center p-4 py-8 !bg-transparent !rounded-none !border-0 shadow-none pointer-events-none"
  >
    <div
      class="relative w-full max-w-2xl flex flex-col gap-4 rounded-lg border bg-background shadow-lg p-6 my-auto pointer-events-auto"
    >
      <Dialog.Close
        class="absolute end-4 top-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
        aria-label="Close"
      >
        <XIcon class="size-4" />
      </Dialog.Close>
      <Dialog.Header>
        <Dialog.Title>Proposal submission legal declarations</Dialog.Title>
        <Dialog.Description>
          Confirm the legal declarations below before submitting your proposal.
          These must be confirmed on every submit or re-submit.
        </Dialog.Description>
      </Dialog.Header>
      <FormLegalDeclarations
        bind:value={formData.metaData.legalDeclarations}
        validationErrors={legalDeclarationsErrors}
      />
      <Dialog.Footer class="flex gap-2 shrink-0 mt-4">
        <Button
          type="button"
          variant="outline"
          disabled={legalDialogSubmitting}
          onclick={() => (openLegalDialog = false)}
        >
          Cancel
        </Button>
        <Button
          type="button"
          disabled={legalDialogSubmitting}
          onclick={confirmLegalAndSubmit}
        >
          {legalDialogSubmitting ? "Submitting…" : "Confirm and submit"}
        </Button>
      </Dialog.Footer>
    </div>
  </Dialog.Content>
</Dialog.Root>
