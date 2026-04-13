<script>
  import Checkbox from "$lib/components/form/Checkbox.svelte";
  import RadioGroup from "$lib/components/form/RadioGroup.svelte";
  import Input from "$lib/components/form/Input.svelte";
  import SelectCountries from "$lib/components/form/SelectCountries.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  let { formData = $bindable(), vote, proposal, validationErrors } = $props();

  const COMPANY_FIELDS = [
    "legalEntityName",
    "legalEntityRegistrationNumber",
    "legalEntityCountry",
    "legalEntityAddressLine1",
    "legalEntityAddressLine2",
    "legalEntityAddressLine3",
  ];
  const INDIVIDUAL_FIELDS = [
    "govtIssuedIdNumber",
    "countryOfResidence",
    "residentialAddressLine1",
    "residentialAddressLine2",
    "residentialAddressLine3",
  ];

  /** True if the current branch (company or individual) has any filled field. */
  function hasContractingPartyBranchData(data, entityType) {
    const cp = data?.metaData?.contractingParty;
    if (!cp || typeof cp !== "object") return false;
    const fields =
      entityType === "company" ? COMPANY_FIELDS : INDIVIDUAL_FIELDS;
    return fields.some((f) => (cp[f] ?? "").toString().trim() !== "");
  }

  /** Display value for legal entity type radio; kept in sync with formData when no pending change. */
  let localLegalEntityType = $state(
    formData.metaData.contractingParty?.legalEntityType ?? "",
  );
  let openLegalEntityTypeDialog = $state(false);
  let pendingLegalEntityType = $state("");

  $effect(() => {
    const current = formData.metaData.contractingParty?.legalEntityType ?? "";
    if (!openLegalEntityTypeDialog && pendingLegalEntityType === "") {
      localLegalEntityType = current;
    }
  });

  /**
   * Intercept legal entity type change: if current branch has data, show dialog and revert; else update formData.
   */
  $effect(() => {
    const current = formData.metaData.contractingParty?.legalEntityType ?? "";
    if (openLegalEntityTypeDialog || pendingLegalEntityType !== "") return;
    if (localLegalEntityType === current) return;
    if (
      (current === "company" || current === "individual") &&
      hasContractingPartyBranchData(formData, current)
    ) {
      pendingLegalEntityType = localLegalEntityType;
      openLegalEntityTypeDialog = true;
      localLegalEntityType = current;
    } else {
      formData.metaData.contractingParty.legalEntityType = localLegalEntityType;
    }
  });

  function cancelLegalEntityTypeSwitch() {
    pendingLegalEntityType = "";
    openLegalEntityTypeDialog = false;
  }

  function confirmLegalEntityTypeSwitch() {
    const cp = formData.metaData.contractingParty;
    const fromCompany = cp.legalEntityType === "company";
    if (fromCompany) {
      for (const f of COMPANY_FIELDS) cp[f] = "";
    } else {
      for (const f of INDIVIDUAL_FIELDS) cp[f] = "";
    }
    cp.legalEntityType = pendingLegalEntityType;
    localLegalEntityType = pendingLegalEntityType;
    pendingLegalEntityType = "";
    openLegalEntityTypeDialog = false;
  }

  const metaErrors = $derived(
    validationErrors?.properties?.metaData?.properties ?? {},
  );
  const feeConsentErrors = $derived({ properties: metaErrors });
  const contractingPartyErrors = $derived({
    properties:
      validationErrors?.properties?.metaData?.properties?.contractingParty
        ?.properties ?? {},
  });
  const primaryContactErrors = $derived({
    properties:
      validationErrors?.properties?.metaData?.properties?.primaryContact
        ?.properties ?? {},
  });
  const signatoryContactErrors = $derived({
    properties:
      validationErrors?.properties?.metaData?.properties?.signatoryContact
        ?.properties ?? {},
  });
  const kycInfoErrors = $derived({
    properties:
      validationErrors?.properties?.metaData?.properties?.kycInfo?.properties ??
      {},
  });
</script>

<p class="text-sm text-muted-foreground mt-4">
  If Intersect is selected as the Administrator, a 3% administration fee will be
  applied to the total budget amount. This fee covers treasury administration,
  contracting, payment execution, and reporting. <a
    href="https://admin-services.docs.intersectmbo.org/overview/budget-proposal-administration-for-2026-cycle
"
    target="_blank"
    rel="noopener noreferrer"
    class="link"
  >
    Read more
  </a>
</p>

<Checkbox
  id="intersectAdministratorFeeConsent"
  bind:value={formData.metaData.intersectAdministratorFeeConsent}
  label="I understand and agree a 3% fee will be added to the proposal total budget."
  required
  validationErrors={feeConsentErrors}
/>

<h3 class="mt-8">
  Are you applying as a registered company or as an individual?
</h3>

<RadioGroup
  id="legalEntityType"
  bind:value={localLegalEntityType}
  label="Proposal's Party Details"
  description="Are you applying as a registered company or an individual?"
  required
  validationErrors={contractingPartyErrors}
  options={[
    { value: "company", label: "Company" },
    { value: "individual", label: "Individual" },
  ]}
  class="mb-6"
/>

{#if formData.metaData.contractingParty?.legalEntityType === "company"}
  <section class="mb-8">
    <h4>Entity Details</h4>
    <p class="text-sm text-muted-foreground mb-4">
      This section collects the legal and registration details of the entity
      that will receive funds if the proposal is approved. The information
      provided here must match official registration and KYC records and will be
      used for contracting and payment purposes.
    </p>
    <Input
      id="legalEntityName"
      label="Legal Entity Name"
      bind:value={formData.metaData.contractingParty.legalEntityName}
      placeholder="Registered Company Name"
      description="The official registered name of the organization receiving funds. Must match bank/KYC records."
      required
      maxLength={100}
      notPublic
      validationErrors={contractingPartyErrors}
      class="mb-4"
    />
    <Input
      id="legalEntityRegistrationNumber"
      label="Registration Number"
      bind:value={
        formData.metaData.contractingParty.legalEntityRegistrationNumber
      }
      placeholder="Tax ID / UEN"
      description="The official registration or tax identification number in your jurisdiction."
      required
      maxLength={100}
      notPublic
      validationErrors={contractingPartyErrors}
      class="mb-4"
    />
    <Input
      id="legalEntityCountry"
      label="Country of Incorporation"
      bind:value={formData.metaData.contractingParty.legalEntityCountry}
      placeholder="Jurisdiction"
      description="The country where the legal entity is formally registered."
      required
      maxLength={100}
      notPublic
      validationErrors={contractingPartyErrors}
      class="mb-4"
    />
    <Input
      id="legalEntityAddressLine1"
      label="Registered Address line 1"
      bind:value={formData.metaData.contractingParty.legalEntityAddressLine1}
      placeholder="Address line 1"
      description="Registered office address for legal correspondence."
      required
      maxLength={100}
      notPublic
      validationErrors={contractingPartyErrors}
      class="mb-4"
    />
    <Input
      id="legalEntityAddressLine2"
      label="Registered Address line 2"
      bind:value={formData.metaData.contractingParty.legalEntityAddressLine2}
      placeholder="Address line 2"
      maxLength={100}
      notPublic
      validationErrors={contractingPartyErrors}
      class="mb-4"
    />
    <Input
      id="legalEntityAddressLine3"
      label="Registered Address line 3"
      bind:value={formData.metaData.contractingParty.legalEntityAddressLine3}
      placeholder="Address line 3"
      maxLength={100}
      notPublic
      validationErrors={contractingPartyErrors}
    />
  </section>
{/if}

{#if formData.metaData.contractingParty?.legalEntityType === "individual"}
  <section class="mb-8">
    <h4>Identity & Legal Details</h4>
    <p class="text-sm text-muted-foreground mb-4">
      This information is used for verification, contracting, and compliance.
    </p>
    <Input
      id="govtIssuedIdNumber"
      label="Government-issued ID number"
      bind:value={formData.metaData.contractingParty.govtIssuedIdNumber}
      placeholder="ID / Passport #"
      description="Passport, national ID, or equivalent government-issued identification."
      required
      maxLength={100}
      notPublic
      validationErrors={contractingPartyErrors}
      class="mb-4"
    />
    <SelectCountries
      id="countryOfResidence"
      label="Country of Residence"
      bind:value={formData.metaData.contractingParty.countryOfResidence}
      placeholder="Country"
      description="Country of residence for the individual."
      required
      notPublic
      validationErrors={contractingPartyErrors}
      class="mb-4"
    />
    <Input
      id="residentialAddressLine1"
      label="Residential Address line 1"
      bind:value={formData.metaData.contractingParty.residentialAddressLine1}
      placeholder="Address line 1"
      description="Full residential address for legal correspondence."
      required
      maxLength={100}
      notPublic
      validationErrors={contractingPartyErrors}
      class="mb-4"
    />
    <Input
      id="residentialAddressLine2"
      label="Residential Address line 2"
      bind:value={formData.metaData.contractingParty.residentialAddressLine2}
      placeholder="Address line 2"
      maxLength={100}
      notPublic
      validationErrors={contractingPartyErrors}
      class="mb-4"
    />
    <Input
      id="residentialAddressLine3"
      label="Residential Address line 3"
      bind:value={formData.metaData.contractingParty.residentialAddressLine3}
      placeholder="Address line 3"
      maxLength={100}
      notPublic
      validationErrors={contractingPartyErrors}
    />
  </section>
{/if}

<h3 class="mt-8">Who's the primary contact for this proposal?</h3>
<p class="text-sm text-muted-foreground mb-4">
  The main person responsible for day-to-day communication.
</p>
<Input
  id="name"
  label="Primary Contact Full Name"
  bind:value={formData.metaData.primaryContact.name}
  placeholder="Enter Name"
  description="The main person responsible for day-to-day communication regarding this proposal."
  required
  maxLength={100}
  notPublic
  validationErrors={primaryContactErrors}
  class="mb-4"
/>
<Input
  id="email"
  label="Email"
  bind:value={formData.metaData.primaryContact.email}
  placeholder="Enter Email"
  description="Primary email for notifications and official correspondence."
  required
  maxLength={254}
  notPublic
  validationErrors={primaryContactErrors}
  class="mb-8"
/>

<h3>Authorized Signatory Details</h3>
<p class="text-sm text-muted-foreground mb-4">
  For contract execution if the proposal is approved.
</p>
<Input
  id="title"
  label="Signatory Title or Role"
  bind:value={formData.metaData.signatoryContact.title}
  placeholder="Enter Title"
  description="Job title or role of the signatory (e.g., CEO, Director)."
  required
  maxLength={100}
  notPublic
  validationErrors={signatoryContactErrors}
  class="mb-4"
/>
<Input
  id="name"
  label="Authorized signatory name"
  bind:value={formData.metaData.signatoryContact.name}
  placeholder="Enter Name"
  description="Full name of the person authorized to sign contracts on behalf of the entity/individual."
  required
  maxLength={100}
  notPublic
  validationErrors={signatoryContactErrors}
  class="mb-4"
/>
<Input
  id="email"
  label="Authorized signatory email"
  bind:value={formData.metaData.signatoryContact.email}
  placeholder="Enter Email"
  description="Direct email address for the authorized signatory."
  required
  maxLength={254}
  notPublic
  validationErrors={signatoryContactErrors}
  class="mb-4"
/>
<Checkbox
  id="authorization"
  bind:value={formData.metaData.signatoryContact.authorization}
  label="I confirm that the above individual is authorized to execute a binding agreement on behalf of the vendor entity, subject to selection and contract execution."
  description="The above individual is authorized to execute a binding agreement on behalf of the vendor entity, subject to selection and contract execution."
  required
  notPublic
  validationErrors={signatoryContactErrors}
  class="mb-8"
/>

<h3>KYC/KYB Submission Status</h3>
<p class="text-sm text-muted-foreground mb-4">
  Have you previously submitted valid KYB/KYC with Intersect?
</p>
<RadioGroup
  id="submitted"
  bind:value={formData.metaData.kycInfo.submitted}
  label="KYC/KYB Submitted?"
  description="Have you previously submitted valid KYB/KYC with Intersect?"
  required
  notPublic
  options={[
    { value: "Yes", label: "Yes" },
    { value: "No", label: "No" },
  ]}
  validationErrors={kycInfoErrors}
  class="mb-4"
/>
{#if formData.metaData.kycInfo.submitted === "No"}
  <Input
    id="email"
    label="KYC Contact Email (If No)"
    bind:value={formData.metaData.kycInfo.email}
    placeholder="Enter Email"
    description="Contact email for submitting KYC/KYB if not already done."
    required
    maxLength={254}
    notPublic
    validationErrors={kycInfoErrors}
    class="mb-4"
  />
{/if}

<AlertDialog.Root bind:open={openLegalEntityTypeDialog}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Change party type?</AlertDialog.Title>
      <AlertDialog.Description>
        Changing the party type will clear the
        {formData.metaData.contractingParty?.legalEntityType === "company"
          ? "company"
          : "individual"}
        details you entered. You will need to re-enter the information for the new
        type. Do you want to continue?
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer class="flex gap-2">
      <Button
        type="button"
        variant="outline"
        class="cursor-pointer"
        onclick={cancelLegalEntityTypeSwitch}
      >
        Cancel
      </Button>
      <AlertDialog.Action
        class="cursor-pointer"
        onclick={confirmLegalEntityTypeSwitch}
      >
        Continue
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
