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
    formSchema,
    validationErrors,
    sectionSchemas = {},
    class: className,
  } = $props();

  /** Use raw section schemas (with .shape and .meta()) instead of optional().default() wrapped ones from formSchema. */
  const faSchema = $derived(sectionSchemas.financialAndAdministrative ?? formSchema?.shape?.financialAndAdministrative);
  const faErrors = $derived(validationErrors?.properties?.financialAndAdministrative);
  const cpSchema = $derived(sectionSchemas.contractingParty ?? formSchema?.shape?.contractingParty);
  const cpErrors = $derived(validationErrors?.properties?.contractingParty);
  const pcSchema = $derived(sectionSchemas.primaryContact ?? formSchema?.shape?.primaryContact);
  const pcErrors = $derived(validationErrors?.properties?.primaryContact);
  const scSchema = $derived(sectionSchemas.signatoryContact ?? formSchema?.shape?.signatoryContact);
  const scErrors = $derived(validationErrors?.properties?.signatoryContact);
  const kycSchema = $derived(sectionSchemas.kycInfo ?? formSchema?.shape?.kycInfo);
  const kycErrors = $derived(validationErrors?.properties?.kycInfo);

  function opts(schema, id) {
    return schema?.shape?.[id]?.meta()?.options ?? [];
  }
  function isNotPublic(schema, id) {
    return schema?.shape?.[id]?.meta()?.notPublic === true;
  }
</script>

<Field.Set class={className}>
  <!-- 1. Intersect Administrator? -->
  <Switch
    id="intersectAdministrator"
    bind:value={value.financialAndAdministrative.intersectAdministrator}
    notPublic={isNotPublic(faSchema, "intersectAdministrator")}
    formSchema={faSchema}
    validationErrors={faErrors}
  />

  {#if value.financialAndAdministrative.intersectAdministrator != null}
    {#if value.financialAndAdministrative.intersectAdministrator === false}
      <Textarea
        id="otherAdministrators"
        bind:value={value.financialAndAdministrative.otherAdministrators}
        notPublic={isNotPublic(faSchema, "otherAdministrators")}
        formSchema={faSchema}
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
          options={opts(cpSchema, "legalEntityType")}
          notPublic={isNotPublic(cpSchema, "legalEntityType")}
          formSchema={cpSchema}
          validationErrors={cpErrors}
        />

        {#if value.contractingParty.legalEntityType === "company"}
          <Input
            id="legalEntityName"
            bind:value={value.contractingParty.legalEntityName}
            notPublic={isNotPublic(cpSchema, "legalEntityName")}
            formSchema={cpSchema}
            validationErrors={cpErrors}
          />
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              id="legalEntityAddress"
              bind:value={value.contractingParty.legalEntityAddress}
              notPublic={isNotPublic(cpSchema, "legalEntityAddress")}
              formSchema={cpSchema}
              validationErrors={cpErrors}
            />
            <FormCountrySelect
              id="legalEntityCountry"
              bind:value={value.contractingParty.legalEntityCountry}
              notPublic={isNotPublic(cpSchema, "legalEntityCountry")}
              formSchema={cpSchema}
              validationErrors={cpErrors}
            />
          </div>
          <div class="w-full md:w-1/2">
            <Input
              id="legalEntityRegistrationNumber"
              bind:value={value.contractingParty.legalEntityRegistrationNumber}
              notPublic={isNotPublic(cpSchema, "legalEntityRegistrationNumber")}
              formSchema={cpSchema}
              validationErrors={cpErrors}
            />
          </div>
        {/if}

        {#if value.contractingParty.legalEntityType === "individual"}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              id="fullResidentialAddress"
              bind:value={value.contractingParty.fullResidentialAddress}
              notPublic={isNotPublic(cpSchema, "fullResidentialAddress")}
              formSchema={cpSchema}
              validationErrors={cpErrors}
            />
            <FormCountrySelect
              id="countryOfResidence"
              bind:value={value.contractingParty.countryOfResidence}
              notPublic={isNotPublic(cpSchema, "countryOfResidence")}
              formSchema={cpSchema}
              validationErrors={cpErrors}
            />
          </div>
          <div class="w-full md:w-1/2">
            <Input
              id="govtIssuedIdNumber"
              bind:value={value.contractingParty.govtIssuedIdNumber}
              notPublic={isNotPublic(cpSchema, "govtIssuedIdNumber")}
              formSchema={cpSchema}
              validationErrors={cpErrors}
            />
          </div>
        {/if}

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            id="name"
            bind:value={value.primaryContact.name}
            notPublic={isNotPublic(pcSchema, "name")}
            formSchema={pcSchema}
            validationErrors={pcErrors}
          />
          <Input
            id="email"
            bind:value={value.primaryContact.email}
            notPublic={isNotPublic(pcSchema, "email")}
            formSchema={pcSchema}
            validationErrors={pcErrors}
          />
        </div>
        <div class="w-full md:w-1/2">
          <Input
            id="socialMedia"
            bind:value={value.primaryContact.socialMedia}
            notPublic={isNotPublic(pcSchema, "socialMedia")}
            formSchema={pcSchema}
            validationErrors={pcErrors}
          />
        </div>

        <Card.Root class="mt-4">
          <Card.Header>
            <Card.Title>Signatory</Card.Title>
          </Card.Header>
          <Card.Content class="flex flex-col gap-3">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                id="title"
                bind:value={value.signatoryContact.title}
                notPublic={isNotPublic(scSchema, "title")}
                formSchema={scSchema}
                validationErrors={scErrors}
              />
              <Input
                id="name"
                bind:value={value.signatoryContact.name}
                notPublic={isNotPublic(scSchema, "name")}
                formSchema={scSchema}
                validationErrors={scErrors}
              />
            </div>
            <div class="w-full md:w-1/2">
              <Input
                id="email"
                bind:value={value.signatoryContact.email}
                notPublic={isNotPublic(scSchema, "email")}
                formSchema={scSchema}
                validationErrors={scErrors}
              />
            </div>
            <div class="w-full md:w-1/2 mt-2">
              <p class="text-sm text-muted-foreground mb-2 italic">
                The above individual is authorized to execute a binding
                agreement on behalf of the vendor entity, subject to selection
                and contract execution.
              </p>
              <Checkbox
                id="authorization"
                bind:value={value.signatoryContact.authorization}
                notPublic={isNotPublic(scSchema, "authorization")}
                formSchema={scSchema}
                validationErrors={scErrors}
              />
            </div>
          </Card.Content>
        </Card.Root>
      </Card.Content>
    </Card.Root>

    <Switch
      id="submitted"
      bind:value={value.kycInfo.submitted}
      notPublic={isNotPublic(kycSchema, "submitted")}
      formSchema={kycSchema}
      validationErrors={kycErrors}
    />
    {#if value.kycInfo.submitted === false || value.kycInfo.submitted == null}
      <Input
        id="email"
        bind:value={value.kycInfo.email}
        notPublic={isNotPublic(kycSchema, "email")}
        formSchema={kycSchema}
        validationErrors={kycErrors}
      />
    {/if}

    <Switch
      id="treasuryRepayment"
      bind:value={value.financialAndAdministrative.treasuryRepayment}
      notPublic={isNotPublic(faSchema, "treasuryRepayment")}
      formSchema={faSchema}
      validationErrors={faErrors}
    />
    {#if value.financialAndAdministrative.treasuryRepayment === true}
      <Textarea
        id="treasuryRepaymentCondition"
        bind:value={value.financialAndAdministrative.treasuryRepaymentCondition}
        notPublic={isNotPublic(faSchema, "treasuryRepaymentCondition")}
        formSchema={faSchema}
        validationErrors={faErrors}
      />
    {/if}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <RadioGroup
        id="initiativeType"
        bind:value={value.financialAndAdministrative.initiativeType}
        options={opts(faSchema, "initiativeType")}
        notPublic={isNotPublic(faSchema, "initiativeType")}
        formSchema={faSchema}
        validationErrors={faErrors}
      />
      <RadioGroup
        id="proposalType"
        bind:value={value.proposalType}
        options={opts(formSchema, "proposalType")}
        notPublic={isNotPublic(formSchema, "proposalType")}
        {formSchema}
        {validationErrors}
      />
    </div>
    <Textarea
      id="priorFunding"
      bind:value={value.financialAndAdministrative.priorFunding}
      notPublic={isNotPublic(faSchema, "priorFunding")}
      formSchema={faSchema}
      validationErrors={faErrors}
    />
    <Input
      id="treasuryDonationHash"
      bind:value={value.financialAndAdministrative.treasuryDonationHash}
      notPublic={isNotPublic(faSchema, "treasuryDonationHash")}
      formSchema={faSchema}
      validationErrors={faErrors}
    />
    <Textarea
      id="thirdPartyAssurers"
      bind:value={value.financialAndAdministrative.thirdPartyAssurers}
      notPublic={isNotPublic(faSchema, "thirdPartyAssurers")}
      formSchema={faSchema}
      validationErrors={faErrors}
    />
    <FormLinks
      bind:value={value.financialAndAdministrative.supportingDocuments}
      notPublic={isNotPublic(faSchema, "supportingDocuments")}
      formSchema={faSchema?.shape?.supportingDocuments != null ? { shape: { supportingInfoLinks: faSchema.shape.supportingDocuments } } : undefined}
      validationErrors={faErrors?.properties?.supportingDocuments != null ? { properties: { supportingInfoLinks: faErrors.properties.supportingDocuments } } : undefined}
    />
  {/if}
</Field.Set>
