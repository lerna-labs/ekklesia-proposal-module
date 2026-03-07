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
  import FormBudgetAdmin from "./FormBudgetAdmin.svelte";
  import FormAdditionalInfo from "./FormAdditionalInfo.svelte";
  import FormControls from "$lib/components/form/FormControls.svelte";
  import FormLegalDeclarations from "./FormLegalDeclarations.svelte";
  import { normalizeWorkPackage } from "./workPackageUtils.js";
  import { onMount, tick } from "svelte";

  const BUDGET2026_AUTOSAVE_KEY = "ekklesia.budget2026.autoSaveEnabled";

  let {
    vote,
    pillars,
    proposal,
    onSave,
    validationErrors,
    openLegalDialog = $bindable(false),
    showLegalErrors = false,
    formRef,
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

  /** Section value → list of error path segments (relative to validationErrors.properties). Order matches accordion: 1=Project Definition … 8=Treasury Donation. */
  const SECTION_ERROR_PATHS = {
    "section-1": [
      ["title"],
      ["summary"],
      ["metaData", "trackRecord"],
      ["metaData", "estimatedDuration"],
    ],
    "section-2": [["metaData", "strategyFramework"]],
    "section-3": [
      ["metaData", "proposalDetails", "conversionRate"],
      ["metaData", "proposalDetails", "workPackages"],
    ],
    "section-4": [
      ["metaData", "treasuryRepayment"],
      ["metaData", "treasuryRepaymentCircumstances"],
      ["metaData", "priorFunding"],
    ],
    "section-5": [
      ["metaData", "proposerDetails", "name"],
      ["metaData", "proposerDetails", "email"],
      ["metaData", "proposerDetails", "links"],
    ],
    "section-6": [
      ["metaData", "administrator"],
      ["metaData", "intersectAdministratorFeeConsent"],
      ["metaData", "otherAdministrator"],
      ["metaData", "contractingParty"],
      ["metaData", "primaryContact"],
      ["metaData", "signatoryContact"],
      ["metaData", "kycInfo"],
      ["metaData", "independentAudits"],
    ],
    "section-7": [["metaData", "supportingInfoLinks"]],
    "section-8": [
      ["metaData", "treasuryDonationTxHash"],
      ["metaData", "treasuryDonationConfirmed"],
    ],
  };

  /** Section-6 paths depend on administrator: only count errors for fields that apply to the chosen type. */
  const sectionErrorCounts = $derived.by(() => {
    const root = validationErrors;
    const admin = formData.metaData?.administrator ?? "";
    const section6Paths =
      admin === "Intersect"
        ? [
            ["metaData", "administrator"],
            ["metaData", "intersectAdministratorFeeConsent"],
            ["metaData", "contractingParty"],
            ["metaData", "primaryContact"],
            ["metaData", "signatoryContact"],
            ["metaData", "kycInfo"],
            ["metaData", "independentAudits"],
          ]
        : admin === "Other"
          ? [
              ["metaData", "administrator"],
              ["metaData", "otherAdministrator"],
              ["metaData", "contractingParty"],
              ["metaData", "independentAudits"],
            ]
          : SECTION_ERROR_PATHS["section-6"];
    const pathsBySection = { ...SECTION_ERROR_PATHS, "section-6": section6Paths };
    const counts = {};
    for (const [section, paths] of Object.entries(pathsBySection)) {
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

  /** First accordion section (Project Definition) open by default. */
  let accordionValue = $state(["section-1"]);

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
      supportingInfoLinks: [],
      treasuryRepayment: "",
      treasuryRepaymentCircumstances: "",
      priorFunding: "",
      administrator: "",
      intersectAdministratorFeeConsent: false,
      otherAdministrator: "",
      contractingParty: {
        legalEntityType: "",
        legalEntityName: "",
        legalEntityRegistrationNumber: "",
        legalEntityCountry: "",
        legalEntityAddressLine1: "",
        legalEntityAddressLine2: "",
        legalEntityAddressLine3: "",
        govtIssuedIdNumber: "",
        countryOfResidence: "",
        residentialAddressLine1: "",
        residentialAddressLine2: "",
        residentialAddressLine3: "",
      },
      primaryContact: { name: "", email: "" },
      signatoryContact: {
        title: "",
        name: "",
        email: "",
        authorization: false,
      },
      kycInfo: { submitted: "", email: "", totalProposalsSubmitted: "" },
      independentAudits: "",
      proposalDetails: { conversionRate: "", workPackages: [] },
      proposerDetails: {
        name: "",
        email: "",
        links: [],
      },
      /** Legal declarations: never prefilled; must be re-submitted on every submit/re-submit. */
      legalDeclarations: {
        dataProcessingConsent: false,
        publicVisibilityConsent: false,
        submitterName: "",
        submitterEmail: "",
        submitterRole: "",
        authorizationEntity: false,
        authorizationAttestation: false,
      },
    },
  });

  let autoSaveEnabled = $state(true);
  let formControlsRef = $state(null);

  const previewHref = $derived(
    proposal?._id && vote?.slug ? `/votes/${vote.slug}/${proposal._id}` : null,
  );
  const isNewUnsaved = $derived(!proposal?._id);

  /** Expose clearDirty so parent can reset dirty state before navigating after save (avoids "unsaved changes" dialog). */
  $effect(() => {
    if (formRef && formControlsRef) {
      formRef.clearDirty = () => formControlsRef?.resetDirtyBaseline?.();
    }
  });

  onMount(() => {
    const stored = localStorage.getItem(BUDGET2026_AUTOSAVE_KEY);
    if (stored === "true") autoSaveEnabled = true;
    else if (stored === "false") autoSaveEnabled = false;
  });

  $effect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(BUDGET2026_AUTOSAVE_KEY, String(autoSaveEnabled));
  });

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
      if (
        p.metaData.proposalDetails?.conversionRate != null &&
        p.metaData.proposalDetails?.conversionRate !== undefined
      )
        formData.metaData.proposalDetails.conversionRate =
          p.metaData.proposalDetails.conversionRate;
      if (
        p.metaData.conversionRate != null &&
        p.metaData.conversionRate !== undefined
      )
        formData.metaData.proposalDetails.conversionRate =
          p.metaData.conversionRate;
      if (p.metaData.treasuryRepayment != null)
        formData.metaData.treasuryRepayment =
          p.metaData.treasuryRepayment ?? "";
      if (p.metaData.treasuryRepaymentCircumstances != null)
        formData.metaData.treasuryRepaymentCircumstances =
          p.metaData.treasuryRepaymentCircumstances ?? "";
      if (p.metaData.priorFunding != null)
        formData.metaData.priorFunding = p.metaData.priorFunding ?? "";
      // Admin section: normalize contractingParty, primaryContact, signatoryContact, kycInfo, administrator
      const initialContractingParty = {
        legalEntityType: "",
        legalEntityName: "",
        legalEntityRegistrationNumber: "",
        legalEntityCountry: "",
        legalEntityAddressLine1: "",
        legalEntityAddressLine2: "",
        legalEntityAddressLine3: "",
        govtIssuedIdNumber: "",
        countryOfResidence: "",
        residentialAddressLine1: "",
        residentialAddressLine2: "",
        residentialAddressLine3: "",
      };
      const cp = p.metaData.contractingParty;
      if (cp != null) {
        if (typeof cp === "string") {
          formData.metaData.contractingParty = {
            ...initialContractingParty,
            legalEntityType: cp,
          };
        } else if (typeof cp === "object") {
          formData.metaData.contractingParty = {
            ...initialContractingParty,
            ...cp,
            legalEntityType: cp.legalEntityType ?? "",
            legalEntityName: cp.legalEntityName ?? "",
            legalEntityRegistrationNumber:
              cp.legalEntityRegistrationNumber ?? "",
            legalEntityCountry: cp.legalEntityCountry ?? "",
            legalEntityAddressLine1: cp.legalEntityAddressLine1 ?? "",
            legalEntityAddressLine2: cp.legalEntityAddressLine2 ?? "",
            legalEntityAddressLine3: cp.legalEntityAddressLine3 ?? "",
            govtIssuedIdNumber: cp.govtIssuedIdNumber ?? "",
            countryOfResidence: cp.countryOfResidence ?? "",
            residentialAddressLine1: cp.residentialAddressLine1 ?? "",
            residentialAddressLine2: cp.residentialAddressLine2 ?? "",
            residentialAddressLine3: cp.residentialAddressLine3 ?? "",
          };
        }
      }
      const pc = p.metaData.primaryContact;
      if (pc && typeof pc === "object") {
        formData.metaData.primaryContact = {
          name: pc.name ?? "",
          email: pc.email ?? "",
        };
      }
      const sc = p.metaData.signatoryContact;
      if (sc && typeof sc === "object") {
        formData.metaData.signatoryContact = {
          title: sc.title ?? "",
          name: sc.name ?? "",
          email: sc.email ?? "",
          authorization: sc.authorization === true,
        };
      }
      const kyc = p.metaData.kycInfo;
      if (kyc && typeof kyc === "object") {
        formData.metaData.kycInfo = {
          submitted: kyc.submitted ?? "",
          email: kyc.email ?? "",
          totalProposalsSubmitted: kyc.totalProposalsSubmitted ?? "",
        };
      }
      const adm = p.metaData.administrator;
      if (adm !== undefined && adm !== null) {
        const v = String(adm).trim();
        if (v === "Yes" || v === "Intersect")
          formData.metaData.administrator = "Intersect";
        else if (v === "No" || v === "Other")
          formData.metaData.administrator = "Other";
        else formData.metaData.administrator = v || "";
      }
      if (p.metaData.independentAudits != null) {
        formData.metaData.independentAudits =
          p.metaData.independentAudits ?? "";
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
      if (
        p.metaData.proposalDetails &&
        Array.isArray(p.metaData.proposalDetails.workPackages)
      ) {
        formData.metaData.proposalDetails = {
          ...formData.metaData.proposalDetails,
          workPackages: p.metaData.proposalDetails.workPackages.map((wp) =>
            normalizeWorkPackage(wp),
          ),
        };
      }
      if (
        !p.metaData.proposalDetails &&
        p.metaData.executionRoadmap &&
        Array.isArray(p.metaData.executionRoadmap.workPackages)
      ) {
        formData.metaData.proposalDetails = {
          ...formData.metaData.proposalDetails,
          workPackages: p.metaData.executionRoadmap.workPackages.map((wp) =>
            normalizeWorkPackage(wp),
          ),
        };
      }
      // Never prefill legalDeclarations: they must be re-submitted on every submit/re-submit.
      // Reset to full shape so no property is undefined (avoids bind:value={undefined} in dialog).
      formData.metaData.legalDeclarations = {
        dataProcessingConsent: false,
        publicVisibilityConsent: false,
        submitterName: "",
        submitterEmail: "",
        submitterRole: "",
        authorizationEntity: false,
        authorizationAttestation: false,
      };
    }
    // Reset FormControls dirty baseline after prefill so opening a proposal and leaving does not show "unsaved changes".
    tick().then(() => formControlsRef?.resetDirtyBaseline?.());
  });

  const legalDeclarationsErrors = $derived(
    validationErrors?.properties?.metaData?.properties?.legalDeclarations,
  );

  let legalDialogSubmitting = $state(false);
  async function confirmLegalAndSubmit() {
    if (!onSave || legalDialogSubmitting) return;
    legalDialogSubmitting = true;
    try {
      await Promise.resolve(
        onSave(getPayload("live"), { fromLegalModal: true }),
      );
      openLegalDialog = false;
    } catch (_) {
      // Errors shown via validationErrors
    } finally {
      legalDialogSubmitting = false;
    }
  }

  function getPayload(status) {
    const workPackages = formData.metaData?.proposalDetails?.workPackages ?? [];
    let grandTotalAda = 0;
    for (const wp of workPackages) {
      const rows = Array.isArray(wp?.budgetBreakdown) ? wp.budgetBreakdown : [];
      for (const row of rows) {
        const t = row?.total ?? Number(row?.quantity) * Number(row?.unitPrice);
        if (Number.isFinite(t)) grandTotalAda += t;
      }
    }
    const payload = { ...formData, status };
    payload.metaData = { ...payload.metaData, totalBudget: grandTotalAda };
    return payload;
  }

  function handleSubmit(e) {
    e.preventDefault();
    formControlsRef?.submit?.();
  }
</script>

<form onsubmit={handleSubmit} class="flex flex-col">
  <Accordion.Root
    type="multiple"
    class="max-w-4xl mx-auto px-4 w-full"
    bind:value={accordionValue}
  >
    <Accordion.Item value="section-1" id="project-definition">
      <Accordion.Trigger class="section-title">
        <span class="flex items-center gap-2">
          Project Definition
          {#if sectionErrorCounts["section-1"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-1"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content>
        <FormProjectDefinition
          bind:formData
          {vote}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-2" id="strategy-framework">
      <Accordion.Trigger class="section-title">
        <span class="flex items-center gap-2">
          Alignment to Strategy framework
          {#if sectionErrorCounts["section-2"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-2"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content>
        <FormStrategyFramework
          bind:formData
          {vote}
          {pillars}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-3" id="proposal-details">
      <Accordion.Trigger class="section-title">
        <span class="flex items-center gap-2">
          Proposal Details
          {#if sectionErrorCounts["section-3"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-3"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content>
        <FormProposalDetails
          bind:formData
          {vote}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-4" id="budget-summary">
      <Accordion.Trigger class="section-title">
        <span class="flex items-center gap-2">
          Budget Summary
          {#if sectionErrorCounts["section-4"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-4"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content>
        <FormBudgetSummary
          bind:formData
          {vote}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-5" id="proposer-details">
      <Accordion.Trigger class="section-title">
        <span class="flex items-center gap-2">
          Proposer Details
          {#if sectionErrorCounts["section-5"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-5"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content>
        <FormProposerDetails
          bind:formData
          {vote}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-6" id="budget-administration">
      <Accordion.Trigger class="section-title">
        <span class="flex items-center gap-2">
          Budget Administration
          {#if sectionErrorCounts["section-6"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-6"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content>
        <FormBudgetAdmin
          bind:formData
          {vote}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-7" id="other-info">
      <Accordion.Trigger class="section-title">
        <span class="flex items-center gap-2">
          Other Supporting Info
          {#if sectionErrorCounts["section-7"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-7"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content>
        <FormAdditionalInfo
          bind:formData
          {vote}
          {proposal}
          {validationErrors}
        />
      </Accordion.Content>
    </Accordion.Item>

    <Accordion.Item value="section-8" id="treasury-donation">
      <Accordion.Trigger class="section-title">
        <span class="flex items-center gap-2">
          Treasury Donation Verification
          {#if sectionErrorCounts["section-8"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-8"])}
            </Badge>
          {/if}
        </span>
      </Accordion.Trigger>
      <Accordion.Content>
        <FormTreasuryDonation
          bind:formData
          {vote}
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
    {previewHref}
    {isNewUnsaved}
  />
</form>

<FormLegalDeclarations
  bind:value={formData.metaData.legalDeclarations}
  validationErrors={showLegalErrors ? legalDeclarationsErrors : undefined}
  bind:open={openLegalDialog}
  onConfirm={confirmLegalAndSubmit}
  submitting={legalDialogSubmitting}
/>
