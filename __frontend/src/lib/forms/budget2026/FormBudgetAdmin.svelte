<script>
  /** @see __frontend/docs/budget2026/form-budget-admin.md Version: 1.0.0 */
  import RadioGroup from "$lib/components/form/RadioGroup.svelte";
  import Textarea from "$lib/components/form/Textarea.svelte";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import FormBudgetAdministrationIntersect from "./FormBudgetAdminIntersect.svelte";
  import FormBudgetAdminOther from "./FormBudgetAdminOther.svelte";
  let { formData = $bindable(), vote, proposal, validationErrors } = $props();

  const INITIAL_CONTRACTING_PARTY = {
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

  function getInitialAdminSection() {
    return {
      intersectAdministratorFeeConsent: false,
      otherAdministrator: "",
      contractingParty: { ...INITIAL_CONTRACTING_PARTY },
      primaryContact: { name: "", email: "" },
      signatoryContact: {
        title: "",
        name: "",
        email: "",
        authorization: false,
      },
      kycInfo: { submitted: "", email: "" },
    };
  }

  function hasAdminSectionData(data) {
    const m = data?.metaData;
    if (!m) return false;
    if (m.intersectAdministratorFeeConsent === true) return true;
    if (
      typeof m.otherAdministrator === "string" &&
      m.otherAdministrator.trim() !== ""
    )
      return true;
    const cp = m.contractingParty;
    if (cp && typeof cp === "object") {
      if ((cp.legalEntityType ?? "").toString().trim() !== "") return true;
      const companyFields = [
        cp.legalEntityName,
        cp.legalEntityRegistrationNumber,
        cp.legalEntityCountry,
        cp.legalEntityAddressLine1,
        cp.legalEntityAddressLine2,
        cp.legalEntityAddressLine3,
      ];
      if (companyFields.some((f) => (f ?? "").toString().trim() !== ""))
        return true;
      const individualFields = [
        cp.govtIssuedIdNumber,
        cp.countryOfResidence,
        cp.residentialAddressLine1,
        cp.residentialAddressLine2,
        cp.residentialAddressLine3,
      ];
      if (individualFields.some((f) => (f ?? "").toString().trim() !== ""))
        return true;
    }
    const pc = m.primaryContact;
    if (pc && typeof pc === "object") {
      if (
        (pc.name ?? "").toString().trim() !== "" ||
        (pc.email ?? "").toString().trim() !== ""
      )
        return true;
    }
    const sc = m.signatoryContact;
    if (sc && typeof sc === "object") {
      if (
        (sc.title ?? "").toString().trim() !== "" ||
        (sc.name ?? "").toString().trim() !== "" ||
        (sc.email ?? "").toString().trim() !== "" ||
        sc.authorization === true
      )
        return true;
    }
    const kyc = m.kycInfo;
    if (kyc && typeof kyc === "object") {
      if (
        (kyc.submitted ?? "").toString().trim() !== "" ||
        (kyc.email ?? "").toString().trim() !== ""
      )
        return true;
    }
    return false;
  }

  /** Validation slice so RadioGroup can show metaData.administrator errors */
  const administratorErrors = $derived({
    properties: validationErrors?.properties?.metaData?.properties ?? {},
  });

  /** Display value for the radio; kept in sync with formData when not in "pending change" state. */
  let localAdministrator = $state(formData.metaData.administrator ?? "");
  let openResetDialog = $state(false);
  /** When set, user requested a change but we showed the dialog; formData is unchanged until Confirm. */
  let pendingAdministrator = $state("");

  /** Sync radio display from formData when dialog is closed and there is no pending change. */
  $effect(() => {
    const current = formData.metaData.administrator ?? "";
    if (!openResetDialog && pendingAdministrator === "") {
      localAdministrator = current;
    }
  });

  /**
   * Intercept radio change: never write to formData here when section has data.
   * Open dialog and store intent in pendingAdministrator; revert radio to current so formData is unchanged.
   * Only on Confirm do we update formData.
   */
  $effect(() => {
    const current = formData.metaData.administrator ?? "";
    if (openResetDialog || pendingAdministrator !== "") return;
    if (localAdministrator === current) return;
    if (hasAdminSectionData(formData)) {
      pendingAdministrator = localAdministrator;
      openResetDialog = true;
      localAdministrator = current; // revert radio so formData is not changed
    } else {
      formData.metaData.administrator = localAdministrator;
    }
  });

  /** On Cancel: do nothing to formData; only close dialog and clear pending intent. */
  function cancelReset() {
    pendingAdministrator = "";
    openResetDialog = false;
  }

  function confirmReset() {
    const initial = getInitialAdminSection();
    formData.metaData.intersectAdministratorFeeConsent =
      initial.intersectAdministratorFeeConsent;
    formData.metaData.otherAdministrator = initial.otherAdministrator;
    formData.metaData.contractingParty = { ...initial.contractingParty };
    formData.metaData.primaryContact = { ...initial.primaryContact };
    formData.metaData.signatoryContact = { ...initial.signatoryContact };
    formData.metaData.kycInfo = { ...initial.kycInfo };
    formData.metaData.administrator = pendingAdministrator;
    localAdministrator = pendingAdministrator;
    pendingAdministrator = "";
    openResetDialog = false;
  }
</script>

<h3>Who will be the Administrator for this budget proposal if approved?</h3>

<p>
  Cardano's Constitution requires each Treasury Withdrawal to specify an
  Administrator and a third-party auditor. Fields marked with the eye-off icon
  contain information that will not be publicly visible and will only be used
  for administration or contracting purposes if the proposal is approved.
</p>

<RadioGroup
  id="administrator"
  bind:value={localAdministrator}
  label="Who will be your administrator for this proposal?"
  description="Choose who will be your administrator for this proposal?"
  required
  validationErrors={administratorErrors}
  options={[
    { value: "Intersect", label: "Intersect" },
    { value: "Other", label: "Other" },
  ]}
/>

{#if formData.metaData.administrator === "Intersect"}
  <FormBudgetAdministrationIntersect
    bind:formData
    {vote}
    {proposal}
    {validationErrors}
  />
{/if}

{#if formData.metaData.administrator === "Other"}
  <FormBudgetAdminOther bind:formData {vote} {proposal} {validationErrors} />
{/if}

<h3 class="mt-8">
  How will independent audits or assurance be handled for this proposal?
</h3>

<p class="text-sm text-muted-foreground mb-4">
  Cardano's Constitution requires Treasury Withdrawal Actions to allocate funds
  for periodic independent audits and oversight metrics. Describe whether funds
  are being set aside for independent audits or third-party assurance, and how
  oversight of treasury funds will be ensured.
</p>

<Textarea
  id="independentAudits"
  bind:value={formData.metaData.independentAudits}
  label="Third Party Assurers"
  description="Who is your Third Party Assurer? This person can be a person or organization."
  placeholder="e.g. The amount (if any) allocated for audits or assurance, etc."
  required
  maxLength={1000}
  validationErrors={administratorErrors}
  class="mb-8"
/>

<AlertDialog.Root bind:open={openResetDialog}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Change administrator?</AlertDialog.Title>
      <AlertDialog.Description>
        Changing the administrator will reset all data in this section
        (contracting party, contact, signatory, and KYC). You will need to
        re-enter the information. Do you want to continue?
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer class="flex gap-2">
      <Button
        type="button"
        variant="outline"
        class="cursor-pointer"
        onclick={cancelReset}
      >
        Cancel
      </Button>
      <AlertDialog.Action class="cursor-pointer" onclick={confirmReset}>
        Continue
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
