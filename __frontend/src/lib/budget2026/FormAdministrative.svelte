<script>
  import * as Field from "$lib/components/ui/field/index.js";
  import Input from "$lib/form/Input.svelte";
  import Textarea from "$lib/form/Textarea.svelte";
  import Checkbox from "$lib/form/Checkbox.svelte";
  import RadioGroup from "$lib/form/RadioGroup.svelte";
  import Switch from "$lib/form/Switch.svelte";
  import FormCountrySelect from "$lib/form/FormCountrySelect.svelte";
  import FormLinks from "$lib/budget2026/FormLinks.svelte";
  import * as Card from "$lib/components/ui/card/index.js";
  let {
    value = $bindable(),
    validationErrors,
    class: className,
  } = $props();

  const faErrors = $derived(validationErrors?.properties?.financialAndAdministrative);
  const cpErrors = $derived(validationErrors?.properties?.contractingParty);
  const pcErrors = $derived(validationErrors?.properties?.primaryContact);
  const scErrors = $derived(validationErrors?.properties?.signatoryContact);
  const kycErrors = $derived(validationErrors?.properties?.kycInfo);
</script>

<Field.Set class={className}>
  <Switch
    id="intersectAdministrator"
    bind:value={value.financialAndAdministrative.intersectAdministrator}
    label="Intersect Administrator?"
    description="Whether Intersect is the administrator for this proposal. If No, specify other administrators below."
    required
    options={[
      { value: true, label: "Yes" },
      { value: false, label: "No" },
    ]}
    validationErrors={faErrors}
  />

  {#if value.financialAndAdministrative.intersectAdministrator != null}
    {#if value.financialAndAdministrative.intersectAdministrator === false}
      <Textarea
        id="otherAdministrators"
        bind:value={value.financialAndAdministrative.otherAdministrators}
        label="Other Administrators?"
        description="Name or details of other administrators when Intersect is not the administrator."
        notPublic
        maxLength={400}
        validationErrors={faErrors}
      />
    {/if}

    <Card.Root>
      <Card.Header>
        <Card.Title>Contracting Party</Card.Title>
      </Card.Header>
      <Card.Content class="flex flex-col gap-3">
        <RadioGroup
          id="legalEntityType"
          bind:value={value.contractingParty.legalEntityType}
          label="Contracting Party Details"
          description="Whether the proposal is submitted by a company or an individual. This determines which fields are shown."
          required
          options={[
            { value: "company", label: "A Company" },
            { value: "individual", label: "An Individual" },
          ]}
          validationErrors={cpErrors}
        />

        {#if value.contractingParty.legalEntityType === "company"}
          <Input id="legalEntityName" bind:value={value.contractingParty.legalEntityName} label="Legal Entity Name" description="Official registered name of the company or entity." required maxLength={100} validationErrors={cpErrors} />
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input id="legalEntityAddress" bind:value={value.contractingParty.legalEntityAddress} label="Registered Address" description="Official registered address of the entity. Not shown publicly." required notPublic maxLength={100} validationErrors={cpErrors} />
            <FormCountrySelect id="legalEntityCountry" bind:value={value.contractingParty.legalEntityCountry} label="Country of Incorporation" description="Two-letter country code where the entity is incorporated. Not shown publicly." required notPublic validationErrors={cpErrors} />
          </div>
          <div class="w-full md:w-1/2">
            <Input id="legalEntityRegistrationNumber" bind:value={value.contractingParty.legalEntityRegistrationNumber} label="Registration Number" description="Tax ID, UEN, or equivalent registration number. Not shown publicly." required notPublic maxLength={100} validationErrors={cpErrors} />
          </div>
        {/if}

        {#if value.contractingParty.legalEntityType === "individual"}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input id="fullResidentialAddress" bind:value={value.contractingParty.fullResidentialAddress} label="Full Residential Address" description="Full residential address (for individuals). Not shown publicly." required notPublic maxLength={100} validationErrors={cpErrors} />
            <FormCountrySelect id="countryOfResidence" bind:value={value.contractingParty.countryOfResidence} label="Country of Residence" description="Two-letter country code of residence (for individuals). Not shown publicly." required notPublic validationErrors={cpErrors} />
          </div>
          <div class="w-full md:w-1/2">
            <Input id="govtIssuedIdNumber" bind:value={value.contractingParty.govtIssuedIdNumber} label="Govt Issued ID Number" description="Government-issued ID number (for individuals). Not shown publicly." required notPublic maxLength={100} validationErrors={cpErrors} />
          </div>
        {/if}

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input id="name" bind:value={value.primaryContact.name} label="Primary Contact Full Name" description="Full name of the main contact for this proposal." required maxLength={100} validationErrors={pcErrors} />
          <Input id="email" bind:value={value.primaryContact.email} label="Primary Contact Email" description="Email for the primary contact. Not shown publicly." required notPublic maxLength={255} validationErrors={pcErrors} />
        </div>
        <div class="w-full md:w-1/2">
          <Input id="socialMedia" bind:value={value.primaryContact.socialMedia} label="X Handle" description="X (Twitter) handle; may be used in communications and will be publicly visible." maxLength={100} validationErrors={pcErrors} />
        </div>

        <Card.Root class="mt-4">
          <Card.Header>
            <Card.Title>Signatory</Card.Title>
          </Card.Header>
          <Card.Content class="flex flex-col gap-3">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input id="title" bind:value={value.signatoryContact.title} label="Signatory Title" description="Title of the signatory. Not shown publicly." required notPublic maxLength={100} validationErrors={scErrors} />
              <Input id="name" bind:value={value.signatoryContact.name} label="Signatory Name" description="Full name of the person authorized to sign. Not shown publicly." required notPublic maxLength={100} validationErrors={scErrors} />
            </div>
            <div class="w-full md:w-1/2">
              <Input id="email" bind:value={value.signatoryContact.email} label="Signatory Email" description="Email of the signatory. Not shown publicly." required notPublic maxLength={255} validationErrors={scErrors} />
            </div>
            <div class="w-full md:w-1/2 mt-2">
              <p class="text-sm text-muted-foreground mb-2 italic">
                The above individual is authorized to execute a binding
                agreement on behalf of the vendor entity, subject to selection
                and contract execution.
              </p>
              <Checkbox id="authorization" bind:value={value.signatoryContact.authorization} label="Signatory Authorization" description="Confirm that the signatory is authorized to submit and attest on behalf of the vendor." required notPublic validationErrors={scErrors} />
            </div>
          </Card.Content>
        </Card.Root>
      </Card.Content>
    </Card.Root>

    <Switch id="submitted" bind:value={value.kycInfo.submitted} label="KYC/KYB Submitted?" description="Whether KYC/KYB has been submitted for the proposing entity. Not shown publicly." required notPublic options={[{ value: true, label: "Yes" }, { value: false, label: "No" }]} validationErrors={kycErrors} />
    {#if value.kycInfo.submitted === false || value.kycInfo.submitted == null}
      <Input id="email" bind:value={value.kycInfo.email} label="KYC Contact Email (If No)" description="Contact email if KYC/KYB has not been submitted. Required when KYC/KYB = No. Not shown publicly." notPublic maxLength={100} validationErrors={kycErrors} />
    {/if}

    <Input id="totalProposalsSubmitted" type="number" bind:value={value.kycInfo.totalProposalsSubmitted} label="Total Proposals Submitted" description="Total number of proposals submitted this funding round. Not shown publicly." notPublic validationErrors={kycErrors} />

    <Switch id="treasuryRepayment" bind:value={value.financialAndAdministrative.treasuryRepayment} label="Treasury Repayment?" description="Whether you commit to repaying the treasury under certain circumstances." required options={[{ value: true, label: "Yes" }, { value: false, label: "No" }]} validationErrors={faErrors} />
    {#if value.financialAndAdministrative.treasuryRepayment === true}
      <Textarea id="treasuryRepaymentCondition" bind:value={value.financialAndAdministrative.treasuryRepaymentCondition} label="Repayment Circumstances" description="When repayment would apply (if Treasury Repayment is Yes)." maxLength={800} validationErrors={faErrors} />
    {/if}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <RadioGroup id="initiativeType" bind:value={value.financialAndAdministrative.initiativeType} label="Initiative Type" description="New Initiative for new work; Maintenance for ongoing or sustaining work." required options={[{ value: "New Initiative", label: "New Initiative" }, { value: "Maintenance", label: "Maintenance" }]} validationErrors={faErrors} />
      <RadioGroup id="proposalType" bind:value={value.proposalType} label="Type of Proposal" description="Technical (software/IT) or non-technical (e.g. community, governance, education)." required options={[{ value: "Technical (software/IT)", label: "Technical (software/IT)" }, { value: "Non-technical", label: "Non-technical" }]} validationErrors={validationErrors} />
    </div>
    <Textarea id="priorFunding" bind:value={value.financialAndAdministrative.priorFunding} label="Prior Funding" description="Catalyst, Treasury, or other prior grants received. Use N/A if none." required maxLength={800} validationErrors={faErrors} />
    <Input id="treasuryDonationHash" bind:value={value.financialAndAdministrative.treasuryDonationHash} label="Treasury Donation Verification Hash" description="Transaction hash for the 1000 ADA donation to the treasury (when required)." required maxLength={64} validationErrors={faErrors} />
    <Textarea id="thirdPartyAssurers" bind:value={value.financialAndAdministrative.thirdPartyAssurers} label="Third Party Assurers" description="Any third parties providing assurance or guarantees, if applicable." maxLength={600} validationErrors={faErrors} />
    <FormLinks
      bind:value={value.financialAndAdministrative.supportingDocuments}
      label="Other Supporting Info"
      description="Links to other supporting documents (title and URL). Title 1–255 chars, valid URL required."
      validationErrors={faErrors?.properties?.supportingDocuments != null ? { properties: { supportingInfoLinks: faErrors.properties.supportingDocuments } } : undefined}
    />
  {/if}
</Field.Set>
