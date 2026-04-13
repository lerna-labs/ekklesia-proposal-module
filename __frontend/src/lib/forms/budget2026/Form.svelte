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
  import TreasuryDonationAcknowledgmentModal from "./TreasuryDonationAcknowledgmentModal.svelte";
  import { normalizeWorkPackage } from "./workPackageUtils.js";
  let {
    vote,
    proposal,
    onSave,
    validationErrors,
    formRef = $bindable(),
    onCancel,
  } = $props();

  const pillars = $derived(vote?.metaData?.strategyFramework?.pillars ?? []);
  const formTitle = $derived(proposal?._id ? "Edit Proposal" : "New Proposal");
  const showTreasuryModal = $derived(
    vote?.form === "budget2026" && !proposal?._id,
  );
  let treasuryAcknowledged = $state(false);
  let openTreasuryModal = $state(false);

  $effect(() => {
    if (showTreasuryModal && !treasuryAcknowledged) {
      openTreasuryModal = true;
    }
  });

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
    "section-9": [["metaData", "legalDeclarations"]],
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
    const pathsBySection = {
      ...SECTION_ERROR_PATHS,
      "section-6": section6Paths,
    };
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
  let accordionValue = $state([
    "section-1",
    "section-2",
    "section-3",
    "section-4",
    "section-5",
    "section-6",
    "section-7",
    "section-8",
  ]);

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
      administrator: "Intersect",
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
      kycInfo: { submitted: "", email: "" },
      independentAudits: "",
      proposalDetails: { conversionRate: "", workPackages: [] },
      proposerDetails: {
        name: "",
        email: "",
        links: [],
      },
      /** Legal declarations: never prefilled; must be re-submitted on every submit/re-submit. */
      legalDeclarations: {
        submitterName: "",
        submitterEmail: "",
        submitterRole: "",
        authorizationEntity: false,
        authorizationAttestation: false,
      },
    },
  });

  let formControlsRef = $state(null);

  /** Expose clearDirty so parent can reset dirty state before navigating after save (avoids "unsaved changes" dialog). */
  $effect(() => {
    if (formRef && formControlsRef) {
      formRef.clearDirty = () => formControlsRef?.resetDirtyBaseline?.();
    }
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
      // Save form's nested object refs before Object.assign overwrites them (keeps bindings valid, avoids mutating proposal p)
      const formContractingParty = formData.metaData.contractingParty;
      const formPrimaryContact = formData.metaData.primaryContact;
      const formSignatoryContact = formData.metaData.signatoryContact;
      const formKycInfo = formData.metaData.kycInfo;

      Object.assign(formData.metaData, p.metaData);

      // Restore form's objects so bindings stay valid and we don't mutate proposal p
      formData.metaData.contractingParty = formContractingParty;
      formData.metaData.primaryContact = formPrimaryContact;
      formData.metaData.signatoryContact = formSignatoryContact;
      formData.metaData.kycInfo = formKycInfo;

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
      // Admin section: mutate restored objects with normalized values (keeps bindings valid)
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
          const raw = (cp ?? "").trim().toLowerCase();
          const legalEntityType =
            raw === "company" || raw === "individual" ? raw : "";
          Object.assign(formContractingParty, initialContractingParty);
          formContractingParty.legalEntityType = legalEntityType;
        } else if (typeof cp === "object") {
          const raw = (cp.legalEntityType ?? "")
            .toString()
            .trim()
            .toLowerCase();
          const legalEntityType =
            raw === "company" || raw === "individual" ? raw : "";
          formContractingParty.legalEntityType = legalEntityType;
          formContractingParty.legalEntityName = cp.legalEntityName ?? "";
          formContractingParty.legalEntityRegistrationNumber =
            cp.legalEntityRegistrationNumber ?? "";
          formContractingParty.legalEntityCountry = cp.legalEntityCountry ?? "";
          formContractingParty.legalEntityAddressLine1 =
            cp.legalEntityAddressLine1 ?? "";
          formContractingParty.legalEntityAddressLine2 =
            cp.legalEntityAddressLine2 ?? "";
          formContractingParty.legalEntityAddressLine3 =
            cp.legalEntityAddressLine3 ?? "";
          formContractingParty.govtIssuedIdNumber = cp.govtIssuedIdNumber ?? "";
          formContractingParty.countryOfResidence = cp.countryOfResidence ?? "";
          formContractingParty.residentialAddressLine1 =
            cp.residentialAddressLine1 ?? "";
          formContractingParty.residentialAddressLine2 =
            cp.residentialAddressLine2 ?? "";
          formContractingParty.residentialAddressLine3 =
            cp.residentialAddressLine3 ?? "";
        }
      }
      const pc = p.metaData.primaryContact;
      if (pc && typeof pc === "object") {
        formPrimaryContact.name = pc.name ?? "";
        formPrimaryContact.email = pc.email ?? "";
      }
      const sc = p.metaData.signatoryContact;
      if (sc && typeof sc === "object") {
        formSignatoryContact.title = sc.title ?? "";
        formSignatoryContact.name = sc.name ?? "";
        formSignatoryContact.email = sc.email ?? "";
        formSignatoryContact.authorization = sc.authorization === true;
      }
      const kyc = p.metaData.kycInfo;
      if (kyc && typeof kyc === "object") {
        const kycSubmittedRaw = (kyc.submitted ?? "").trim();
        formKycInfo.submitted =
          kycSubmittedRaw === "yes" || kycSubmittedRaw === "Yes"
            ? "Yes"
            : kycSubmittedRaw === "no" || kycSubmittedRaw === "No"
              ? "No"
              : "";
        formKycInfo.email = kyc.email ?? "";
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
      // Reset to full shape so no property is undefined (avoids bind:value={undefined}).
      formData.metaData.legalDeclarations = {
        submitterName: "",
        submitterEmail: "",
        submitterRole: "",
        authorizationEntity: false,
        authorizationAttestation: false,
      };
    }
    // Reset FormControls dirty baseline after prefill so opening a proposal and leaving does not show "unsaved changes".
    formControlsRef?.resetDirtyBaseline?.();
  });

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
    const isIntersect = formData.metaData?.administrator === "Intersect";
    const totalBudget = isIntersect
      ? Math.round(grandTotalAda * 1.03)
      : Math.round(grandTotalAda);
    const payload = { ...formData, status };
    payload.metaData = { ...payload.metaData, totalBudget };
    return payload;
  }

  function handleSubmit(e) {
    e.preventDefault();
    formControlsRef?.submit?.();
  }
</script>

{#if showTreasuryModal && !treasuryAcknowledged}
  <TreasuryDonationAcknowledgmentModal
    bind:open={openTreasuryModal}
    onContinue={() => {
      treasuryAcknowledged = true;
      openTreasuryModal = false;
    }}
    onCancel={() => onCancel?.()}
  />
{:else}
  <div class="container mx-auto max-w-4xl py-8 px-4 pb-0">
    <h1 class="mb-4">{formTitle}</h1>
  </div>
  <form onsubmit={handleSubmit} class="flex flex-col" autocomplete="off">
    <Accordion.Root
      type="multiple"
      class="max-w-4xl mx-auto px-4 w-full"
      bind:value={accordionValue}
    >
      <Accordion.Item value="section-1" id="project-definition">
        <Accordion.Trigger level={2} class="section-title">
          <span class="flex items-center gap-2 mb-0">
            1. Proposal Overview
            {#if sectionErrorCounts["section-1"] > 0}
              <Badge variant="destructive">
                {errorCountLabel(sectionErrorCounts["section-1"])}
              </Badge>
            {/if}
          </span>
        </Accordion.Trigger>
        <Accordion.Content class="pt-[3px] px-[3px]">
          <FormProjectDefinition
            bind:formData
            {vote}
            {proposal}
            {validationErrors}
          />
        </Accordion.Content>
      </Accordion.Item>

      <Accordion.Item value="section-2" id="strategy-framework">
        <Accordion.Trigger level={2} class="section-title">
          <span class="flex items-center gap-2 mb-0">
            2. Alignment to Strategy framework
            {#if sectionErrorCounts["section-2"] > 0}
              <Badge variant="destructive">
                {errorCountLabel(sectionErrorCounts["section-2"])}
              </Badge>
            {/if}
          </span>
        </Accordion.Trigger>
        <Accordion.Content class="pt-[3px] px-[3px]">
          <FormStrategyFramework
            bind:formData
            {vote}
            {pillars}
            {proposal}
            {validationErrors}
          />
        </Accordion.Content>
      </Accordion.Item>

      <Accordion.Item value="section-5" id="proposer-details">
        <Accordion.Trigger level={2} class="section-title">
          <span class="flex items-center gap-2 mb-0">
            3. Proposer
            {#if sectionErrorCounts["section-5"] > 0}
              <Badge variant="destructive">
                {errorCountLabel(sectionErrorCounts["section-5"])}
              </Badge>
            {/if}
          </span>
        </Accordion.Trigger>
        <Accordion.Content class="pt-[3px] px-[3px]">
          <FormProposerDetails
            bind:formData
            {vote}
            {proposal}
            {validationErrors}
          />
        </Accordion.Content>
      </Accordion.Item>

      <Accordion.Item value="section-3" id="proposal-details">
        <Accordion.Trigger level={2} class="section-title">
          <span class="flex items-center gap-2 mb-0">
            4. Proposal Details
            {#if sectionErrorCounts["section-3"] > 0}
              <Badge variant="destructive">
                {errorCountLabel(sectionErrorCounts["section-3"])}
              </Badge>
            {/if}
          </span>
        </Accordion.Trigger>
        <Accordion.Content class="pt-[3px] px-[3px]">
          <FormProposalDetails
            bind:formData
            {vote}
            {proposal}
            {validationErrors}
          />
        </Accordion.Content>
      </Accordion.Item>

      <Accordion.Item value="section-6" id="budget-administration">
        <Accordion.Trigger level={2} class="section-title">
          <span class="flex items-center gap-2 mb-0">
            5. Budget Administration
            {#if sectionErrorCounts["section-6"] > 0}
              <Badge variant="destructive">
                {errorCountLabel(sectionErrorCounts["section-6"])}
              </Badge>
            {/if}
          </span>
        </Accordion.Trigger>
        <Accordion.Content class="pt-[3px] px-[3px]">
          <FormBudgetAdmin bind:formData {vote} {proposal} {validationErrors} />
        </Accordion.Content>
      </Accordion.Item>

      <Accordion.Item value="section-4" id="budget-summary">
        <Accordion.Trigger level={2} class="section-title">
          <span class="flex items-center gap-2 mb-0">
            6. Budget Summary
            {#if sectionErrorCounts["section-4"] > 0}
              <Badge variant="destructive">
                {errorCountLabel(sectionErrorCounts["section-4"])}
              </Badge>
            {/if}
          </span>
        </Accordion.Trigger>
        <Accordion.Content class="pt-[3px] px-[3px]">
          <FormBudgetSummary
            bind:formData
            {vote}
            {proposal}
            {validationErrors}
          />
        </Accordion.Content>
      </Accordion.Item>

      <Accordion.Item value="section-7" id="other-info">
        <Accordion.Trigger level={2} class="section-title">
          <span class="flex items-center gap-2 mb-0">
            7. Other Supporting Info
            {#if sectionErrorCounts["section-7"] > 0}
              <Badge variant="destructive">
                {errorCountLabel(sectionErrorCounts["section-7"])}
              </Badge>
            {/if}
          </span>
        </Accordion.Trigger>
        <Accordion.Content class="pt-[3px] px-[3px]">
          <FormAdditionalInfo
            bind:formData
            {vote}
            {proposal}
            {validationErrors}
          />
        </Accordion.Content>
      </Accordion.Item>

      <Accordion.Item
        value="section-8"
        id="treasury-donation"
        class="last:border-b"
      >
        <Accordion.Trigger level={2} class="section-title">
          <span class="flex items-center gap-2 mb-0">
            8. Treasury Donation Verification
            {#if sectionErrorCounts["section-8"] > 0}
              <Badge variant="destructive">
                {errorCountLabel(sectionErrorCounts["section-8"])}
              </Badge>
            {/if}
          </span>
        </Accordion.Trigger>
        <Accordion.Content class="pt-[3px] px-[3px]">
          <FormTreasuryDonation
            bind:formData
            {vote}
            {proposal}
            {validationErrors}
          />
        </Accordion.Content>
      </Accordion.Item>
    </Accordion.Root>

    <div
      id="legal-declarations"
      class="max-w-4xl mx-auto px-4 w-full pt-4"
    >
      <div class="section-title pb-4">
        <h2 class="flex items-center gap-2 mb-0">
          9. Legal declarations
          {#if sectionErrorCounts["section-9"] > 0}
            <Badge variant="destructive">
              {errorCountLabel(sectionErrorCounts["section-9"])}
            </Badge>
          {/if}
        </h2>
      </div>
      <div class="pt-[3px] px-[3px] pb-12">
        <FormLegalDeclarations
          bind:value={formData.metaData.legalDeclarations}
          validationErrors={validationErrors?.properties?.metaData?.properties
            ?.legalDeclarations}
        />
      </div>
    </div>

    <FormControls
      bind:this={formControlsRef}
      {formData}
      {getPayload}
      {onSave}
      {proposal}
      {vote}
    />
  </form>
{/if}
